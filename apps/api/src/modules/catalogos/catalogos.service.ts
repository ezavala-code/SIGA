import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { z } from 'zod';
import { createDatabaseClient } from '../../database/client.js';
import { DatabaseService } from '../../database/database.service.js';
import type { AuthActor } from '../auth/auth.types.js';

// Las semillas E02 usan UUID deterministas de 128 bits sin forzar los bits de versión RFC.
const idSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const claveSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(1)
  .max(40)
  .regex(/^[A-Z0-9][A-Z0-9._-]*$/);
const nombreSchema = z.string().trim().min(1).max(160);
const querySchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  incluirInactivos: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});
const createProgramaSchema = z.object({ clave: claveSchema, nombre: nombreSchema }).strict();
const updateProgramaSchema = z
  .object({ nombre: nombreSchema.optional(), activo: z.boolean().optional() })
  .strict()
  .refine((value) => Object.keys(value).length > 0);
const createAsignaturaSchema = z.object({ clave: claveSchema, nombre: nombreSchema }).strict();
const updateAsignaturaSchema = z
  .object({ nombre: nombreSchema.optional(), activo: z.boolean().optional() })
  .strict()
  .refine((value) => Object.keys(value).length > 0);
const createPlanSchema = z
  .object({
    programaId: idSchema,
    version: z.number().int().min(1).max(9999),
    nombre: nombreSchema,
  })
  .strict();
const updatePlanSchema = z
  .object({ nombre: nombreSchema.optional(), activo: z.boolean().optional() })
  .strict()
  .refine((value) => Object.keys(value).length > 0);
const courseSchema = z
  .object({
    asignaturaId: idSchema,
    creditos: z.string().regex(/^\d{1,6}(?:\.\d{1,2})?$/),
    semestreSugerido: z.number().int().min(1).max(30),
    prerrequisitos: z.array(idSchema).max(100),
  })
  .strict();
const contentsSchema = z
  .object({ revision: z.number().int().min(1), asignaturas: z.array(courseSchema).max(200) })
  .strict();
type ContentInput = z.infer<typeof contentsSchema>;

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      message: 'Los datos del catálogo no son válidos.',
      errores: result.error.flatten().fieldErrors,
    });
  }
  return result.data;
}

function assertAcyclic(asignaturas: ContentInput['asignaturas']) {
  const byId = new Map(asignaturas.map((item) => [item.asignaturaId, item]));
  const visit = new Map<string, 'active' | 'done'>();
  for (const item of asignaturas) {
    if (new Set(item.prerrequisitos).size !== item.prerrequisitos.length) {
      throw new BadRequestException('Una asignatura tiene prerrequisitos repetidos.');
    }
    for (const requisito of item.prerrequisitos) {
      if (requisito === item.asignaturaId) {
        throw new BadRequestException('Una asignatura no puede ser prerrequisito de sí misma.');
      }
      if (!byId.has(requisito)) {
        throw new BadRequestException('Todos los prerrequisitos deben pertenecer al mismo plan.');
      }
    }
  }
  const walk = (id: string) => {
    if (visit.get(id) === 'active')
      throw new BadRequestException('Los prerrequisitos producen un ciclo.');
    if (visit.get(id) === 'done') return;
    visit.set(id, 'active');
    for (const prerequisite of byId.get(id)?.prerrequisitos ?? []) walk(prerequisite);
    visit.set(id, 'done');
  };
  for (const id of byId.keys()) walk(id);
}

function toConflict(error: unknown): never {
  if (error instanceof ConflictException) throw error;
  if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: unknown }).code
      : undefined;
  if (['P2002', 'P2003', 'P2004', 'P2010', 'P2034'].includes(String(code))) {
    throw new ConflictException(
      code === 'P2002'
        ? 'La clave o versión ya existe.'
        : 'El cambio entra en conflicto con el historial o con otro cambio reciente.',
    );
  }
  throw error;
}

const planInclude = {
  programa: { select: { id: true, clave: true, nombre: true, activo: true } },
  asignaturas: {
    orderBy: { semestreSugerido: 'asc' as const },
    include: {
      asignatura: { select: { id: true, clave: true, nombre: true, activo: true } },
      requisitos: { select: { requeridaId: true } },
    },
  },
};
type PlanRecord = Prisma.PlanEstudioGetPayload<{ include: typeof planInclude }>;
type CatalogClient = Prisma.TransactionClient | ReturnType<typeof createDatabaseClient>;

@Injectable()
export class CatalogosService {
  constructor(private readonly database: DatabaseService) {}

  async programas(input: unknown) {
    const { q, page, pageSize, incluirInactivos } = parse(querySchema, input);
    const where: Prisma.ProgramaWhereInput = {
      ...(incluirInactivos ? {} : { activo: true }),
      ...(q
        ? {
            OR: [
              { clave: { contains: q, mode: 'insensitive' } },
              { nombre: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.database.client.programa.findMany({
        where,
        orderBy: [{ clave: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.database.client.programa.count({ where }),
    ]);
    return { items, page, pageSize, total };
  }

  async crearPrograma(input: unknown, actor: AuthActor) {
    const data = parse(createProgramaSchema, input);
    try {
      return await this.database.transaction(async (tx) => {
        const created = await tx.programa.create({ data });
        await this.audit(tx, actor, 'CREAR', 'Programa', created.id, undefined, {
          posterior: created,
        });
        return created;
      });
    } catch (error) {
      toConflict(error);
    }
  }

  async actualizarPrograma(idInput: string, input: unknown, actor: AuthActor) {
    const id = parse(idSchema, idInput);
    const data = parse(updateProgramaSchema, input);
    try {
      return await this.database.transaction(
        async (tx) => {
          const current = await tx.programa.findUnique({ where: { id } });
          if (!current) throw new NotFoundException('Programa no encontrado.');
          const updated = await tx.programa.update({ where: { id }, data });
          await this.audit(tx, actor, 'ACTUALIZAR', 'Programa', id, undefined, {
            anterior: current,
            posterior: updated,
          });
          return updated;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      toConflict(error);
    }
  }

  async asignaturas(input: unknown) {
    const { q, page, pageSize, incluirInactivos } = parse(querySchema, input);
    const where: Prisma.AsignaturaWhereInput = {
      ...(incluirInactivos ? {} : { activo: true }),
      ...(q
        ? {
            OR: [
              { clave: { contains: q, mode: 'insensitive' } },
              { nombre: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.database.client.asignatura.findMany({
        where,
        orderBy: [{ clave: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.database.client.asignatura.count({ where }),
    ]);
    return { items, page, pageSize, total };
  }

  async crearAsignatura(input: unknown, actor: AuthActor) {
    const data = parse(createAsignaturaSchema, input);
    try {
      return await this.database.transaction(async (tx) => {
        const created = await tx.asignatura.create({ data });
        await this.audit(tx, actor, 'CREAR', 'Asignatura', created.id, undefined, {
          posterior: created,
        });
        return created;
      });
    } catch (error) {
      toConflict(error);
    }
  }

  async actualizarAsignatura(idInput: string, input: unknown, actor: AuthActor) {
    const id = parse(idSchema, idInput);
    const data = parse(updateAsignaturaSchema, input);
    try {
      return await this.database.transaction(
        async (tx) => {
          const current = await tx.asignatura.findUnique({ where: { id } });
          if (!current) throw new NotFoundException('Asignatura no encontrada.');
          const updated = await tx.asignatura.update({ where: { id }, data });
          await this.audit(tx, actor, 'ACTUALIZAR', 'Asignatura', id, undefined, {
            anterior: current,
            posterior: updated,
          });
          return updated;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      toConflict(error);
    }
  }

  async planes(input: unknown) {
    const { q, page, pageSize, incluirInactivos } = parse(querySchema, input);
    const where: Prisma.PlanEstudioWhereInput = {
      ...(incluirInactivos ? {} : { activo: true, programa: { is: { activo: true } } }),
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: 'insensitive' } },
              { programa: { clave: { contains: q, mode: 'insensitive' } } },
              { programa: { nombre: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.database.client.planEstudio.findMany({
        where,
        orderBy: [{ programa: { clave: 'asc' } }, { version: 'desc' }],
        include: {
          programa: { select: { id: true, clave: true, nombre: true, activo: true } },
          _count: { select: { asignaturas: true, estudiantes: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.database.client.planEstudio.count({ where }),
    ]);
    return { items, page, pageSize, total };
  }

  async plan(idInput: string) {
    const id = parse(idSchema, idInput);
    return this.planWithHistory(this.database.client, id);
  }

  async crearPlan(input: unknown, actor: AuthActor) {
    const data = parse(createPlanSchema, input);
    try {
      return await this.database.transaction(async (tx) => {
        const program = await tx.programa.findUnique({ where: { id: data.programaId } });
        if (!program || !program.activo)
          throw new BadRequestException('Selecciona un programa activo.');
        const created = await tx.planEstudio.create({ data });
        await this.audit(tx, actor, 'CREAR', 'PlanEstudio', created.id, undefined, {
          posterior: created,
        });
        return this.planWithHistory(tx, created.id);
      });
    } catch (error) {
      toConflict(error);
    }
  }

  async actualizarPlan(idInput: string, input: unknown, actor: AuthActor) {
    const id = parse(idSchema, idInput);
    const data = parse(updatePlanSchema, input);
    try {
      return await this.database.transaction(
        async (tx) => {
          const current = await tx.planEstudio.findUnique({ where: { id } });
          if (!current) throw new NotFoundException('Plan de estudio no encontrado.');
          if (data.activo === true) {
            const program = await tx.programa.findUnique({
              where: { id: current.programaId },
              select: { activo: true },
            });
            if (!program?.activo) {
              throw new ConflictException(
                'Activa el programa antes de activar el plan de estudio.',
              );
            }
          }
          const updated = await tx.planEstudio.update({ where: { id }, data });
          await this.audit(tx, actor, 'ACTUALIZAR', 'PlanEstudio', id, undefined, {
            anterior: current,
            posterior: updated,
          });
          return this.planWithHistory(tx, updated.id);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      toConflict(error);
    }
  }

  async nuevaVersion(idInput: string, actor: AuthActor) {
    const id = parse(idSchema, idInput);
    try {
      return await this.database.transaction(
        async (tx) => {
          const source = await tx.planEstudio.findUnique({ where: { id }, include: planInclude });
          if (!source) throw new NotFoundException('Plan de estudio no encontrado.');
          if (!source.programa.activo) {
            throw new ConflictException(
              'Activa el programa antes de crear una nueva versión del plan.',
            );
          }
          const latest = await tx.planEstudio.aggregate({
            where: { programaId: source.programaId },
            _max: { version: true },
          });
          const version = (latest._max.version ?? source.version) + 1;
          const clone = await tx.planEstudio.create({
            data: {
              programaId: source.programaId,
              version,
              nombre: source.nombre,
              asignaturas: {
                create: source.asignaturas.map((course) => ({
                  asignaturaId: course.asignaturaId,
                  creditos: course.creditos,
                  semestreSugerido: course.semestreSugerido,
                })),
              },
            },
          });
          for (const course of source.asignaturas) {
            if (!course.requisitos.length) continue;
            await tx.prerrequisito.createMany({
              data: course.requisitos.map((requirement) => ({
                planId: clone.id,
                asignaturaId: course.asignaturaId,
                requeridaId: requirement.requeridaId,
              })),
            });
          }
          await this.audit(
            tx,
            actor,
            'NUEVA_VERSION',
            'PlanEstudio',
            clone.id,
            `Deriva del plan ${source.id}.`,
            {
              anterior: { id: source.id, version: source.version },
              posterior: { id: clone.id, version: clone.version, programaId: clone.programaId },
            },
          );
          return this.planWithHistory(tx, clone.id);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      toConflict(error);
    }
  }

  async contenidoPlan(idInput: string, input: unknown, actor: AuthActor) {
    const id = parse(idSchema, idInput);
    const content = parse(contentsSchema, input);
    assertAcyclic(content.asignaturas);
    const subjectIds = content.asignaturas.map((item) => item.asignaturaId);
    if (new Set(subjectIds).size !== subjectIds.length) {
      throw new BadRequestException('Una asignatura solo puede aparecer una vez en el plan.');
    }
    if (content.asignaturas.some((item) => Number(item.creditos) <= 0)) {
      throw new BadRequestException('Los créditos deben ser mayores que cero.');
    }
    try {
      return await this.database.transaction(
        async (tx) => {
          const plan = await tx.planEstudio.findUnique({ where: { id }, include: planInclude });
          if (!plan) throw new NotFoundException('Plan de estudio no encontrado.');
          if (!plan.activo || !plan.programa.activo)
            throw new ConflictException('Activa el plan antes de modificar su contenido.');
          const [students, groups, enrollments] = await Promise.all([
            tx.estudiante.count({ where: { planId: id } }),
            tx.grupo.count({ where: { planId: id } }),
            tx.inscripcion.count({ where: { planId: id } }),
          ]);
          if (students || groups || enrollments) {
            throw new ConflictException(
              'El plan ya tiene participantes u oferta; crea una nueva versión para conservar el historial.',
            );
          }
          const subjects = await tx.asignatura.findMany({
            where: { id: { in: subjectIds }, activo: true },
            select: { id: true },
          });
          if (subjects.length !== subjectIds.length) {
            throw new BadRequestException('Cada asignatura debe existir y estar activa.');
          }
          const changed = await tx.planEstudio.updateMany({
            where: { id, revision: content.revision, activo: true },
            data: { revision: { increment: 1 } },
          });
          if (changed.count !== 1)
            throw new ConflictException('El plan cambió en otra sesión; vuelve a cargarlo.');
          await tx.prerrequisito.deleteMany({ where: { planId: id } });
          await tx.planAsignatura.deleteMany({ where: { planId: id } });
          if (content.asignaturas.length) {
            await tx.planAsignatura.createMany({
              data: content.asignaturas.map(({ asignaturaId, creditos, semestreSugerido }) => ({
                planId: id,
                asignaturaId,
                creditos: new Prisma.Decimal(creditos),
                semestreSugerido,
              })),
            });
            const requirements = content.asignaturas.flatMap((course) =>
              course.prerrequisitos.map((requeridaId) => ({
                planId: id,
                asignaturaId: course.asignaturaId,
                requeridaId,
              })),
            );
            if (requirements.length) await tx.prerrequisito.createMany({ data: requirements });
          }
          const savedPlan = await tx.planEstudio.findUniqueOrThrow({
            where: { id },
            select: { revision: true },
          });
          await this.audit(
            tx,
            actor,
            'ACTUALIZAR_CONTENIDO',
            'PlanEstudio',
            id,
            `Asignaturas: ${content.asignaturas.length}.`,
            {
              anterior: {
                revision: plan.revision,
                asignaturas: plan.asignaturas.map((course) => ({
                  asignaturaId: course.asignaturaId,
                  creditos: course.creditos.toFixed(2),
                  semestreSugerido: course.semestreSugerido,
                  prerrequisitos: course.requisitos.map((item) => item.requeridaId).sort(),
                })),
              },
              posterior: {
                revision: savedPlan.revision,
                asignaturas: content.asignaturas.map((course) => ({
                  ...course,
                  creditos: new Prisma.Decimal(course.creditos).toFixed(2),
                  prerrequisitos: [...course.prerrequisitos].sort(),
                })),
              },
            },
          );
          return this.planWithHistory(tx, id);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      toConflict(error);
    }
  }

  private async planWithHistory(client: CatalogClient, id: string) {
    const plan = await client.planEstudio.findUnique({ where: { id }, include: planInclude });
    if (!plan) throw new NotFoundException('Plan de estudio no encontrado.');
    const [estudiantes, grupos, inscripciones] = await Promise.all([
      client.estudiante.count({ where: { planId: id } }),
      client.grupo.count({ where: { planId: id } }),
      client.inscripcion.count({ where: { planId: id } }),
    ]);
    return this.serializePlan(plan, { estudiantes, grupos, inscripciones });
  }

  private serializePlan(
    plan: PlanRecord,
    historial: { estudiantes: number; grupos: number; inscripciones: number },
  ) {
    return {
      ...plan,
      historial,
      contenidoEditable: !historial.estudiantes && !historial.grupos && !historial.inscripciones,
      asignaturas: plan.asignaturas.map((item) => ({
        ...item,
        creditos: item.creditos.toFixed(2),
        prerrequisitos: item.requisitos.map(({ requeridaId }) => requeridaId),
        requisitos: undefined,
      })),
    };
  }

  private audit(
    tx: Prisma.TransactionClient,
    actor: AuthActor,
    accion: string,
    recurso: string,
    recursoId: string,
    motivo?: string,
    valores?: { anterior?: Prisma.InputJsonValue; posterior?: Prisma.InputJsonValue },
  ) {
    return tx.auditoria.create({
      data: { actorId: actor.userId, accion, recurso, recursoId, motivo, ...valores },
    });
  }
}
