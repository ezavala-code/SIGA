import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { Prisma } from '../../generated/prisma/client.js';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service.js';
import type { AuthActor } from '../auth/auth.types.js';

const idSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const correoSchema = z.string().trim().toLowerCase().email().max(254);
const nombreSchema = z.string().trim().min(1).max(160);
const claveSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(1)
  .max(40)
  .regex(/^[A-Z0-9][A-Z0-9._-]*$/);
const fechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  });
const querySchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  incluirInactivos: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});
const createEstudianteSchema = z
  .object({
    correo: correoSchema,
    matricula: claveSchema,
    nombre: nombreSchema,
    planId: idSchema,
    fechaIngreso: fechaSchema,
  })
  .strict();
const updateEstudianteSchema = z
  .object({
    correo: correoSchema.optional(),
    matricula: claveSchema.optional(),
    nombre: nombreSchema.optional(),
    planId: idSchema.optional(),
    fechaIngreso: fechaSchema.optional(),
    estado: z.enum(['ACTIVO', 'INACTIVO', 'EGRESADO']).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);
const createDocenteSchema = z
  .object({
    correo: correoSchema,
    numeroEmpleado: claveSchema,
    nombre: nombreSchema,
    departamento: nombreSchema,
  })
  .strict();
const updateDocenteSchema = z
  .object({
    correo: correoSchema.optional(),
    numeroEmpleado: claveSchema.optional(),
    nombre: nombreSchema.optional(),
    departamento: nombreSchema.optional(),
    activo: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      message: 'Los datos de la persona no son válidos.',
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
    throw new ConflictException('El correo, la matrícula o el número de empleado ya existe.');
  }
  if (['P2003', 'P2004', 'P2010', 'P2034'].includes(String(code))) {
    throw new ConflictException('El cambio entra en conflicto con el historial o con otro cambio.');
  }
  throw error;
}

const userSelect = { id: true, correo: true, activo: true } as const;
const studentInclude = {
  usuario: { select: userSelect },
  plan: {
    select: {
      id: true,
      nombre: true,
      version: true,
      programa: { select: { id: true, clave: true, nombre: true } },
    },
  },
  _count: { select: { inscripciones: true, certificados: true } },
} as const;
const teacherInclude = {
  usuario: { select: userSelect },
  _count: { select: { grupos: true } },
} as const;

type EstudianteRecord = Prisma.EstudianteGetPayload<{ include: typeof studentInclude }>;
type DocenteRecord = Prisma.DocenteGetPayload<{ include: typeof teacherInclude }>;

@Injectable()
export class PersonasService {
  constructor(private readonly database: DatabaseService) {}

  async estudiantes(input: unknown) {
    const { q, page, pageSize, incluirInactivos } = parse(querySchema, input);
    const where: Prisma.EstudianteWhereInput = {
      ...(incluirInactivos
        ? {}
        : { estado: { not: 'INACTIVO' }, usuario: { is: { activo: true } } }),
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: 'insensitive' } },
              { matricula: { contains: q, mode: 'insensitive' } },
              { usuario: { is: { correo: { contains: q, mode: 'insensitive' } } } },
              { plan: { is: { nombre: { contains: q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.database.client.estudiante.findMany({
        where,
        include: studentInclude,
        orderBy: [{ matricula: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.database.client.estudiante.count({ where }),
    ]);
    return { items: items.map((item) => this.serializeEstudiante(item)), page, pageSize, total };
  }

  async crearEstudiante(input: unknown, actor: AuthActor) {
    const data = parse(createEstudianteSchema, input);
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('base64url'), 12);
    try {
      return await this.database.transaction(
        async (tx) => {
          const plan = await tx.planEstudio.findUnique({
            where: { id: data.planId },
            select: { activo: true, programa: { select: { activo: true } } },
          });
          if (!plan?.activo || !plan.programa.activo)
            throw new BadRequestException('Selecciona un plan activo.');
          const user = await tx.usuario.create({
            data: { correo: data.correo, passwordHash, rol: 'ESTUDIANTE', activo: false },
            select: { id: true },
          });
          const student = await tx.estudiante.create({
            data: {
              usuarioId: user.id,
              matricula: data.matricula,
              nombre: data.nombre,
              planId: data.planId,
              fechaIngreso: new Date(`${data.fechaIngreso}T00:00:00.000Z`),
            },
            include: studentInclude,
          });
          const serialized = this.serializeEstudiante(student);
          await this.audit(tx, actor, 'CREAR', 'Estudiante', student.id, {
            posterior: this.auditEstudiantePayload(serialized),
          });
          return serialized;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      handleConflict(error);
    }
  }

  async actualizarEstudiante(idInput: string, input: unknown, actor: AuthActor) {
    const id = parse(idSchema, idInput);
    const data = parse(updateEstudianteSchema, input);
    try {
      return await this.database.transaction(
        async (tx) => {
          const current = await tx.estudiante.findUnique({
            where: { id },
            include: studentInclude,
          });
          if (!current) throw new NotFoundException('Estudiante no encontrado.');
          if (data.planId && data.planId !== current.planId) {
            if (current._count.inscripciones || current._count.certificados) {
              throw new ConflictException(
                'El estudiante tiene historial académico; no se puede cambiar su plan.',
              );
            }
            const plan = await tx.planEstudio.findUnique({
              where: { id: data.planId },
              select: { activo: true, programa: { select: { activo: true } } },
            });
            if (!plan?.activo || !plan.programa.activo)
              throw new BadRequestException('Selecciona un plan activo.');
          }
          await tx.estudiante.update({
            where: { id },
            data: {
              ...(data.matricula === undefined ? {} : { matricula: data.matricula }),
              ...(data.nombre === undefined ? {} : { nombre: data.nombre }),
              ...(data.planId === undefined ? {} : { planId: data.planId }),
              ...(data.fechaIngreso === undefined
                ? {}
                : { fechaIngreso: new Date(`${data.fechaIngreso}T00:00:00.000Z`) }),
              ...(data.estado === undefined ? {} : { estado: data.estado }),
            },
            include: studentInclude,
          });
          const deshabilitaAcceso = data.estado !== undefined && data.estado !== 'ACTIVO';
          const correoCambio = data.correo !== undefined && data.correo !== current.usuario.correo;
          if (data.correo !== undefined || (deshabilitaAcceso && current.usuario.activo)) {
            await tx.usuario.update({
              where: { id: current.usuario.id },
              data: {
                ...(data.correo === undefined ? {} : { correo: data.correo }),
                ...(deshabilitaAcceso ? { activo: false } : {}),
              },
            });
          }
          if ((correoCambio || deshabilitaAcceso) && current.usuario.activo) {
            await this.revocarSesiones(tx, current.usuario.id);
          }
          const result = await tx.estudiante.findUniqueOrThrow({
            where: { id },
            include: studentInclude,
          });
          const before = this.serializeEstudiante(current);
          const after = this.serializeEstudiante(result);
          await this.audit(tx, actor, 'ACTUALIZAR', 'Estudiante', id, {
            anterior: this.auditEstudiantePayload(before),
            posterior: this.auditEstudiantePayload(after),
          });
          return after;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      handleConflict(error);
    }
  }

  async docentes(input: unknown) {
    const { q, page, pageSize, incluirInactivos } = parse(querySchema, input);
    const where: Prisma.DocenteWhereInput = {
      ...(incluirInactivos ? {} : { activo: true, usuario: { is: { activo: true } } }),
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: 'insensitive' } },
              { numeroEmpleado: { contains: q, mode: 'insensitive' } },
              { departamento: { contains: q, mode: 'insensitive' } },
              { usuario: { is: { correo: { contains: q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.database.client.docente.findMany({
        where,
        include: teacherInclude,
        orderBy: [{ numeroEmpleado: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.database.client.docente.count({ where }),
    ]);
    return { items: items.map((item) => this.serializeDocente(item)), page, pageSize, total };
  }

  async crearDocente(input: unknown, actor: AuthActor) {
    const data = parse(createDocenteSchema, input);
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('base64url'), 12);
    try {
      return await this.database.transaction(async (tx) => {
        const user = await tx.usuario.create({
          data: { correo: data.correo, passwordHash, rol: 'DOCENTE', activo: false },
          select: { id: true },
        });
        const teacher = await tx.docente.create({
          data: {
            usuarioId: user.id,
            numeroEmpleado: data.numeroEmpleado,
            nombre: data.nombre,
            departamento: data.departamento,
          },
          include: teacherInclude,
        });
        const serialized = this.serializeDocente(teacher);
        await this.audit(tx, actor, 'CREAR', 'Docente', teacher.id, {
          posterior: this.auditDocentePayload(serialized),
        });
        return serialized;
      });
    } catch (error) {
      handleConflict(error);
    }
  }

  async actualizarDocente(idInput: string, input: unknown, actor: AuthActor) {
    const id = parse(idSchema, idInput);
    const data = parse(updateDocenteSchema, input);
    try {
      return await this.database.transaction(async (tx) => {
        const current = await tx.docente.findUnique({ where: { id }, include: teacherInclude });
        if (!current) throw new NotFoundException('Docente no encontrado.');
        await tx.docente.update({
          where: { id },
          data: {
            ...(data.numeroEmpleado === undefined ? {} : { numeroEmpleado: data.numeroEmpleado }),
            ...(data.nombre === undefined ? {} : { nombre: data.nombre }),
            ...(data.departamento === undefined ? {} : { departamento: data.departamento }),
            ...(data.activo === undefined ? {} : { activo: data.activo }),
          },
          include: teacherInclude,
        });
        const deshabilitaAcceso = data.activo === false;
        const correoCambio = data.correo !== undefined && data.correo !== current.usuario.correo;
        if (data.correo !== undefined || (deshabilitaAcceso && current.usuario.activo)) {
          await tx.usuario.update({
            where: { id: current.usuario.id },
            data: {
              ...(data.correo === undefined ? {} : { correo: data.correo }),
              ...(deshabilitaAcceso ? { activo: false } : {}),
            },
          });
        }
        if ((correoCambio || deshabilitaAcceso) && current.usuario.activo) {
          await this.revocarSesiones(tx, current.usuario.id);
        }
        const result = await tx.docente.findUniqueOrThrow({
          where: { id },
          include: teacherInclude,
        });
        const before = this.serializeDocente(current);
        const after = this.serializeDocente(result);
        await this.audit(tx, actor, 'ACTUALIZAR', 'Docente', id, {
          anterior: this.auditDocentePayload(before),
          posterior: this.auditDocentePayload(after),
        });
        return after;
      });
    } catch (error) {
      handleConflict(error);
    }
  }

  private auditEstudiantePayload(item: ReturnType<PersonasService['serializeEstudiante']>) {
    return {
      matricula: item.matricula,
      nombre: item.nombre,
      planId: item.planId,
      fechaIngreso: item.fechaIngreso,
      estado: item.estado,
      correo: item.correo,
      accesoActivo: item.accesoActivo,
    };
  }

  private auditDocentePayload(item: ReturnType<PersonasService['serializeDocente']>) {
    return {
      numeroEmpleado: item.numeroEmpleado,
      nombre: item.nombre,
      departamento: item.departamento,
      activo: item.activo,
      correo: item.correo,
      accesoActivo: item.accesoActivo,
    };
  }

  private serializeEstudiante(item: EstudianteRecord) {
    return {
      id: item.id,
      matricula: item.matricula,
      nombre: item.nombre,
      planId: item.planId,
      fechaIngreso: item.fechaIngreso.toISOString().slice(0, 10),
      estado: item.estado,
      correo: item.usuario.correo,
      accesoActivo: item.usuario.activo,
      plan: item.plan,
      historial: item._count,
    };
  }

  private serializeDocente(item: DocenteRecord) {
    return {
      id: item.id,
      numeroEmpleado: item.numeroEmpleado,
      nombre: item.nombre,
      departamento: item.departamento,
      activo: item.activo,
      correo: item.usuario.correo,
      accesoActivo: item.usuario.activo,
      gruposAsignados: item._count.grupos,
    };
  }

  private revocarSesiones(tx: Prisma.TransactionClient, usuarioId: string) {
    return tx.sesion.updateMany({
      where: { usuarioId, revocadaEn: null },
      data: { revocadaEn: new Date() },
    });
  }

  private audit(
    tx: Prisma.TransactionClient,
    actor: AuthActor,
    accion: string,
    recurso: string,
    id: string,
    valores?: { anterior?: Prisma.InputJsonValue; posterior?: Prisma.InputJsonValue },
  ) {
    return tx.auditoria.create({
      data: { actorId: actor.userId, accion, recurso, recursoId: id, ...valores },
    });
  }
}
