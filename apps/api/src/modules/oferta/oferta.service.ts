import {
  ConflictException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service.js';
import type { AuthActor } from '../auth/auth.types.js';

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
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  });
const instantSchema = z.iso.datetime({ offset: true });
const pageSchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
const createPeriodoSchema = z
  .object({
    clave: claveSchema,
    nombre: nombreSchema,
    inicio: dateSchema,
    fin: dateSchema,
    inscripcionInicio: instantSchema,
    inscripcionFin: instantSchema,
    estado: z.enum(['PLANIFICADO', 'ABIERTO', 'CERRADO']).default('PLANIFICADO'),
    politicaId: idSchema,
  })
  .strict();
const updatePeriodoSchema = z
  .object({
    clave: claveSchema.optional(),
    nombre: nombreSchema.optional(),
    inicio: dateSchema.optional(),
    fin: dateSchema.optional(),
    inscripcionInicio: instantSchema.optional(),
    inscripcionFin: instantSchema.optional(),
    estado: z.enum(['PLANIFICADO', 'ABIERTO', 'CERRADO']).optional(),
    politicaId: idSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);
const createGrupoSchema = z
  .object({
    clave: claveSchema,
    planId: idSchema,
    asignaturaId: idSchema,
    periodoId: idSchema,
    docenteId: idSchema,
    cupo: z.number().int().min(1).max(2147483647),
    activo: z.boolean().default(true),
  })
  .strict();
const updateGrupoSchema = z
  .object({
    clave: claveSchema.optional(),
    planId: idSchema.optional(),
    asignaturaId: idSchema.optional(),
    periodoId: idSchema.optional(),
    docenteId: idSchema.optional(),
    cupo: z.number().int().min(1).max(2147483647).optional(),
    activo: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      message: 'Los datos de la oferta académica no son válidos.',
      errores: result.error.flatten().fieldErrors,
    });
  }
  return result.data;
}

function handleConflict(error: unknown): never {
  if (
    error instanceof BadRequestException ||
    error instanceof ConflictException ||
    error instanceof NotFoundException
  ) {
    throw error;
  }
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: unknown }).code
      : undefined;
  if (code === 'P2002') {
    throw new ConflictException('La clave del periodo o grupo ya está registrada.');
  }
  if (['P2003', 'P2004', 'P2010', 'P2034'].includes(String(code))) {
    throw new ConflictException('El cambio entra en conflicto con la oferta o su historial.');
  }
  throw error;
}

const periodoInclude = {
  politica: { select: { id: true, version: true, descripcion: true, esPropuesta: true } },
  _count: { select: { grupos: true } },
} as const;
const groupInclude = {
  periodo: {
    select: {
      id: true,
      clave: true,
      nombre: true,
      inicio: true,
      fin: true,
      inscripcionInicio: true,
      inscripcionFin: true,
      estado: true,
    },
  },
  planAsignatura: {
    select: {
      plan: {
        select: {
          id: true,
          nombre: true,
          version: true,
          activo: true,
          programa: { select: { clave: true, nombre: true } },
        },
      },
      asignatura: { select: { id: true, clave: true, nombre: true, activo: true } },
    },
  },
  docente: {
    select: { id: true, numeroEmpleado: true, nombre: true, activo: true },
  },
  _count: {
    select: { inscripciones: { where: { estado: { not: 'CANCELADA' } } } },
  },
} as const;
type PeriodRecord = Prisma.PeriodoGetPayload<{ include: typeof periodoInclude }>;
type GroupRecord = Prisma.GrupoGetPayload<{ include: typeof groupInclude }>;

@Injectable()
export class OfertaService {
  constructor(private readonly database: DatabaseService) {}

  async periodos(input: unknown) {
    const { q, page, pageSize } = parse(pageSchema, input);
    const where: Prisma.PeriodoWhereInput = q
      ? {
          OR: [
            { clave: { contains: q, mode: 'insensitive' } },
            { nombre: { contains: q, mode: 'insensitive' } },
            { politica: { is: { version: { contains: q, mode: 'insensitive' } } } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.database.client.periodo.findMany({
        where,
        include: periodoInclude,
        orderBy: [{ inicio: 'desc' }, { clave: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.database.client.periodo.count({ where }),
    ]);
    return { items: items.map((item) => this.serializePeriodo(item)), page, pageSize, total };
  }

  politicas() {
    return this.database.client.politicaAcademica.findMany({
      select: { id: true, version: true, descripcion: true, esPropuesta: true },
      orderBy: [{ creadoEn: 'desc' }, { version: 'asc' }],
    });
  }

  async crearPeriodo(input: unknown, actor: AuthActor) {
    const data = parse(createPeriodoSchema, input);
    this.validatePeriodDates(data.inicio, data.fin, data.inscripcionInicio, data.inscripcionFin);
    try {
      return await this.database.transaction(
        async (tx) => {
          const policy = await tx.politicaAcademica.findUnique({ where: { id: data.politicaId } });
          if (!policy)
            throw new BadRequestException('Selecciona una política académica existente.');
          const created = await tx.periodo.create({
            data: {
              clave: data.clave,
              nombre: data.nombre,
              inicio: this.date(data.inicio),
              fin: this.date(data.fin),
              inscripcionInicio: new Date(data.inscripcionInicio),
              inscripcionFin: new Date(data.inscripcionFin),
              estado: data.estado,
              politicaId: data.politicaId,
            },
            include: periodoInclude,
          });
          await this.audit(tx, actor, 'CREAR', 'Periodo', created.id, undefined, undefined, {
            clave: created.clave,
            nombre: created.nombre,
            inicio: created.inicio.toISOString().slice(0, 10),
            fin: created.fin.toISOString().slice(0, 10),
            inscripcionInicio: created.inscripcionInicio.toISOString(),
            inscripcionFin: created.inscripcionFin.toISOString(),
            estado: created.estado,
            politicaId: created.politicaId,
          });
          return this.serializePeriodo(created);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      handleConflict(error);
    }
  }

  async actualizarPeriodo(idInput: string, input: unknown, actor: AuthActor) {
    const id = parse(idSchema, idInput);
    const data = parse(updatePeriodoSchema, input);
    try {
      return await this.database.transaction(
        async (tx) => {
          const current = await tx.periodo.findUnique({ where: { id }, include: periodoInclude });
          if (!current) throw new NotFoundException('Periodo no encontrado.');
          const inicio = data.inicio ?? current.inicio.toISOString().slice(0, 10);
          const fin = data.fin ?? current.fin.toISOString().slice(0, 10);
          const inscripcionInicio =
            data.inscripcionInicio ?? current.inscripcionInicio.toISOString();
          const inscripcionFin = data.inscripcionFin ?? current.inscripcionFin.toISOString();
          this.validatePeriodDates(inicio, fin, inscripcionInicio, inscripcionFin);
          if (data.politicaId && data.politicaId !== current.politicaId && current._count.grupos) {
            throw new ConflictException(
              'El periodo ya tiene grupos; conserva su política académica para proteger la oferta.',
            );
          }
          if (data.politicaId && data.politicaId !== current.politicaId) {
            const policy = await tx.politicaAcademica.findUnique({
              where: { id: data.politicaId },
            });
            if (!policy)
              throw new BadRequestException('Selecciona una política académica existente.');
          }
          const updated = await tx.periodo.update({
            where: { id },
            data: {
              ...(data.clave === undefined ? {} : { clave: data.clave }),
              ...(data.nombre === undefined ? {} : { nombre: data.nombre }),
              ...(data.inicio === undefined ? {} : { inicio: this.date(data.inicio) }),
              ...(data.fin === undefined ? {} : { fin: this.date(data.fin) }),
              ...(data.inscripcionInicio === undefined
                ? {}
                : { inscripcionInicio: new Date(data.inscripcionInicio) }),
              ...(data.inscripcionFin === undefined
                ? {}
                : { inscripcionFin: new Date(data.inscripcionFin) }),
              ...(data.estado === undefined ? {} : { estado: data.estado }),
              ...(data.politicaId === undefined ? {} : { politicaId: data.politicaId }),
            },
            include: periodoInclude,
          });
          await this.audit(
            tx,
            actor,
            'ACTUALIZAR',
            'Periodo',
            id,
            undefined,
            {
              clave: current.clave,
              nombre: current.nombre,
              politicaId: current.politicaId,
              estado: current.estado,
              inicio: current.inicio.toISOString().slice(0, 10),
              fin: current.fin.toISOString().slice(0, 10),
              inscripcionInicio: current.inscripcionInicio.toISOString(),
              inscripcionFin: current.inscripcionFin.toISOString(),
            },
            {
              clave: updated.clave,
              nombre: updated.nombre,
              politicaId: updated.politicaId,
              estado: updated.estado,
              inicio: updated.inicio.toISOString().slice(0, 10),
              fin: updated.fin.toISOString().slice(0, 10),
              inscripcionInicio: updated.inscripcionInicio.toISOString(),
              inscripcionFin: updated.inscripcionFin.toISOString(),
            },
          );
          return this.serializePeriodo(updated);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      handleConflict(error);
    }
  }

  async grupos(input: unknown) {
    const { q, page, pageSize } = parse(pageSchema, input);
    const where: Prisma.GrupoWhereInput = q
      ? {
          OR: [
            { clave: { contains: q, mode: 'insensitive' } },
            {
              planAsignatura: {
                is: { asignatura: { is: { nombre: { contains: q, mode: 'insensitive' } } } },
              },
            },
            { docente: { is: { nombre: { contains: q, mode: 'insensitive' } } } },
            { periodo: { is: { nombre: { contains: q, mode: 'insensitive' } } } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.database.client.grupo.findMany({
        where,
        include: groupInclude,
        orderBy: [{ periodo: { inicio: 'desc' } }, { clave: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.database.client.grupo.count({ where }),
    ]);
    return { items: items.map((item) => this.serializeGrupo(item)), page, pageSize, total };
  }

  async crearGrupo(input: unknown, actor: AuthActor) {
    const data = parse(createGrupoSchema, input);
    try {
      return await this.database.transaction(
        async (tx) => {
          await this.assertGroupReferences(
            tx,
            data.planId,
            data.asignaturaId,
            data.periodoId,
            data.docenteId,
          );
          const period = await tx.periodo.findUniqueOrThrow({ where: { id: data.periodoId } });
          if (period.estado === 'CERRADO') {
            throw new ConflictException('No se pueden crear grupos en un periodo cerrado.');
          }
          const created = await tx.grupo.create({
            data: {
              clave: data.clave,
              planId: data.planId,
              asignaturaId: data.asignaturaId,
              periodoId: period.id,
              politicaId: period.politicaId,
              docenteId: data.docenteId,
              cupo: data.cupo,
              activo: data.activo,
            },
            include: groupInclude,
          });
          await this.audit(tx, actor, 'CREAR', 'Grupo', created.id, undefined, undefined, {
            clave: created.clave,
            planId: created.planId,
            asignaturaId: created.asignaturaId,
            periodoId: created.periodoId,
            politicaId: created.politicaId,
            docenteId: created.docenteId,
            cupo: created.cupo,
            activo: created.activo,
          });
          return this.serializeGrupo(created);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      handleConflict(error);
    }
  }

  async actualizarGrupo(idInput: string, input: unknown, actor: AuthActor) {
    const id = parse(idSchema, idInput);
    const data = parse(updateGrupoSchema, input);
    try {
      return await this.database.transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "Grupo" WHERE "id" = ${id}::uuid FOR UPDATE`;
          const current = await tx.grupo.findUnique({ where: { id }, include: groupInclude });
          if (!current) throw new NotFoundException('Grupo no encontrado.');
          const historyCount = await tx.inscripcion.count({ where: { grupoId: id } });
          const structuralChange =
            (data.clave !== undefined && data.clave !== current.clave) ||
            (data.planId !== undefined && data.planId !== current.planId) ||
            (data.asignaturaId !== undefined && data.asignaturaId !== current.asignaturaId) ||
            (data.periodoId !== undefined && data.periodoId !== current.periodoId) ||
            (data.docenteId !== undefined && data.docenteId !== current.docenteId);
          if (historyCount && structuralChange) {
            throw new ConflictException(
              'El grupo tiene inscripciones; conserva su identidad, asignatura, periodo y docente.',
            );
          }
          const planId = data.planId ?? current.planId;
          const asignaturaId = data.asignaturaId ?? current.asignaturaId;
          const periodoId = data.periodoId ?? current.periodoId;
          const docenteId = data.docenteId ?? current.docenteId;
          if (structuralChange || (data.activo === true && !current.activo)) {
            await this.assertGroupReferences(tx, planId, asignaturaId, periodoId, docenteId);
          }
          const period = await tx.periodo.findUnique({ where: { id: periodoId } });
          if (!period) throw new BadRequestException('Selecciona un periodo existente.');
          const movingActiveGroupIntoClosedPeriod =
            data.periodoId !== undefined &&
            data.periodoId !== current.periodoId &&
            (data.activo ?? current.activo);
          if (
            period.estado === 'CERRADO' &&
            (data.activo === true || movingActiveGroupIntoClosedPeriod)
          ) {
            throw new ConflictException('No se puede activar un grupo de un periodo cerrado.');
          }
          const cupo = data.cupo ?? current.cupo;
          const ocupacion = await tx.inscripcion.count({
            where: { grupoId: id, estado: { not: 'CANCELADA' } },
          });
          if (cupo < ocupacion) {
            throw new ConflictException(
              `El cupo no puede ser menor que las ${ocupacion} inscripciones activas del grupo.`,
            );
          }
          const updated = await tx.grupo.update({
            where: { id },
            data: {
              ...(data.clave === undefined ? {} : { clave: data.clave }),
              ...(data.planId === undefined ? {} : { planId: data.planId }),
              ...(data.asignaturaId === undefined ? {} : { asignaturaId: data.asignaturaId }),
              ...(data.periodoId === undefined ? {} : { periodoId: data.periodoId }),
              ...(data.docenteId === undefined ? {} : { docenteId: data.docenteId }),
              ...(data.cupo === undefined ? {} : { cupo: data.cupo }),
              ...(data.activo === undefined ? {} : { activo: data.activo }),
              ...(data.periodoId === undefined ? {} : { politicaId: period.politicaId }),
            },
            include: groupInclude,
          });
          await this.audit(
            tx,
            actor,
            'ACTUALIZAR',
            'Grupo',
            id,
            undefined,
            {
              clave: current.clave,
              planId: current.planId,
              asignaturaId: current.asignaturaId,
              periodoId: current.periodoId,
              politicaId: current.politicaId,
              docenteId: current.docenteId,
              cupo: current.cupo,
              activo: current.activo,
            },
            {
              clave: updated.clave,
              planId: updated.planId,
              asignaturaId: updated.asignaturaId,
              periodoId: updated.periodoId,
              politicaId: updated.politicaId,
              docenteId: updated.docenteId,
              cupo: updated.cupo,
              activo: updated.activo,
            },
          );
          return this.serializeGrupo(updated);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      handleConflict(error);
    }
  }

  async gruposDocente(actor: AuthActor, input: unknown) {
    const teacher = await this.database.client.docente.findUnique({
      where: { usuarioId: actor.userId },
      select: { id: true, activo: true },
    });
    if (!teacher?.activo) throw new NotFoundException('No se encontró un perfil docente activo.');
    const { q, page, pageSize } = parse(pageSchema, input);
    const legacy = Object.keys(input as object).length === 0;
    const where: Prisma.GrupoWhereInput = {
      docenteId: teacher.id,
      ...(q
        ? {
            OR: [
              { clave: { contains: q, mode: 'insensitive' } },
              {
                planAsignatura: {
                  is: { asignatura: { is: { nombre: { contains: q, mode: 'insensitive' } } } },
                },
              },
              { periodo: { is: { nombre: { contains: q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
    const items = await this.database.client.grupo.findMany({
      where,
      include: groupInclude,
      orderBy: [{ periodo: { inicio: 'desc' } }, { clave: 'asc' }, { id: 'asc' }],
      skip: legacy ? undefined : (page - 1) * pageSize,
      take: legacy ? 100 : pageSize,
    });
    const serialized = items.map((item) => this.serializeGrupo(item));
    if (legacy) return serialized;
    const total = await this.database.client.grupo.count({ where });
    return { items: serialized, page, pageSize, total };
  }

  private async assertGroupReferences(
    tx: Prisma.TransactionClient,
    planId: string,
    asignaturaId: string,
    periodoId: string,
    docenteId: string,
  ) {
    const [plan, course, period, teacher] = await Promise.all([
      tx.planEstudio.findUnique({
        where: { id: planId },
        select: { id: true, activo: true, programa: { select: { activo: true } } },
      }),
      tx.planAsignatura.findUnique({
        where: { planId_asignaturaId: { planId, asignaturaId } },
        select: { planId: true, asignatura: { select: { activo: true } } },
      }),
      tx.periodo.findUnique({ where: { id: periodoId }, select: { id: true, estado: true } }),
      tx.docente.findUnique({ where: { id: docenteId }, select: { id: true, activo: true } }),
    ]);
    if (!plan?.activo || !plan.programa.activo)
      throw new BadRequestException('Selecciona un plan de estudio activo.');
    if (!course?.asignatura.activo) {
      throw new BadRequestException('La asignatura debe existir en el plan y estar activa.');
    }
    if (!period) throw new BadRequestException('Selecciona un periodo existente.');
    if (!teacher?.activo) throw new BadRequestException('Selecciona un docente activo.');
  }

  private validatePeriodDates(
    inicio: string,
    fin: string,
    inscripcionInicio: string,
    inscripcionFin: string,
  ) {
    if (inicio > fin)
      throw new BadRequestException('La fecha de inicio debe ser anterior al fin del periodo.');
    if (Date.parse(inscripcionInicio) >= Date.parse(inscripcionFin)) {
      throw new BadRequestException('La ventana de inscripción debe tener inicio anterior al fin.');
    }
    const fechaFinInscripcion = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(inscripcionFin));
    if (fechaFinInscripcion > fin) {
      throw new BadRequestException(
        'La inscripción debe terminar a más tardar el último día del periodo en Ciudad de México.',
      );
    }
  }

  private date(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private serializePeriodo(item: PeriodRecord) {
    return {
      id: item.id,
      clave: item.clave,
      nombre: item.nombre,
      inicio: item.inicio.toISOString().slice(0, 10),
      fin: item.fin.toISOString().slice(0, 10),
      inscripcionInicio: item.inscripcionInicio.toISOString(),
      inscripcionFin: item.inscripcionFin.toISOString(),
      estado: item.estado,
      permiteCancelacionEstudiante: item.permiteCancelacionEstudiante,
      politicaId: item.politicaId,
      politica: item.politica,
      grupos: item._count.grupos,
    };
  }

  private serializeGrupo(item: GroupRecord) {
    return {
      id: item.id,
      clave: item.clave,
      planId: item.planId,
      asignaturaId: item.asignaturaId,
      periodoId: item.periodoId,
      politicaId: item.politicaId,
      docenteId: item.docenteId,
      cupo: item.cupo,
      activo: item.activo,
      ocupacion: item._count.inscripciones,
      periodo: item.periodo,
      plan: item.planAsignatura.plan,
      asignatura: item.planAsignatura.asignatura,
      docente: item.docente,
    };
  }

  private audit(
    tx: Prisma.TransactionClient,
    actor: AuthActor,
    accion: string,
    recurso: string,
    id: string,
    motivo?: string,
    anterior?: Prisma.InputJsonValue,
    posterior?: Prisma.InputJsonValue,
  ) {
    return tx.auditoria.create({
      data: {
        actorId: actor.userId,
        accion,
        recurso,
        recursoId: id,
        ...(motivo === undefined ? {} : { motivo }),
        ...(anterior === undefined ? {} : { anterior }),
        ...(posterior === undefined ? {} : { posterior }),
      },
    });
  }
}
