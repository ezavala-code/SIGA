import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service.js';
import type { AuthActor } from '../auth/auth.types.js';
import {
  calcularAvance,
  promedioGeneral,
  promedioPorPeriodo,
  type IntentoAcademico,
} from './calificaciones.calculo.js';

const idSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const listSchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(100),
});
const updateSchema = z
  .object({
    notaFinal: z
      .string()
      .max(9)
      .regex(/^-?\d{1,4}(?:\.\d{1,3})?$/),
    version: z.number().int().min(1).max(2147483647),
    motivo: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      message: 'Los datos de la calificación no son válidos.',
      errores: result.error.flatten().fieldErrors,
    });
  }
  return result.data;
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const value = error as {
    code?: unknown;
    originalCode?: unknown;
    meta?: unknown;
    cause?: unknown;
  };
  const current = typeof value.code === 'string' ? value.code : undefined;
  const meta = typeof value.meta === 'object' && value.meta !== null ? value.meta : undefined;
  const nested =
    (meta ? errorCode(meta) : undefined) ??
    errorCode(value.cause) ??
    (typeof value.originalCode === 'string' ? value.originalCode : undefined);
  return nested ?? current;
}

function handleConflict(error: unknown): never {
  if (
    error instanceof BadRequestException ||
    error instanceof ConflictException ||
    error instanceof ForbiddenException ||
    error instanceof NotFoundException
  ) {
    throw error;
  }
  const code = errorCode(error);
  if (['P2034', 'P2004', 'P2010', '40001', '40P01'].includes(code ?? '')) {
    throw new ConflictException(
      'La calificación cambió en paralelo o incumple la política vigente.',
    );
  }
  throw error;
}

const policySelect = {
  version: true,
  escalaMinima: true,
  escalaMaxima: true,
  minimaAprobatoria: true,
  decimales: true,
  intentosPromedio: true,
  esPropuesta: true,
} as const;

const academicInclude = {
  grupo: {
    select: {
      id: true,
      clave: true,
      planId: true,
      asignaturaId: true,
      periodoId: true,
      docente: { select: { nombre: true } },
      planAsignatura: {
        select: { asignatura: { select: { id: true, clave: true, nombre: true } } },
      },
      periodo: {
        select: {
          id: true,
          clave: true,
          nombre: true,
          inicio: true,
          fin: true,
          politica: { select: policySelect },
        },
      },
    },
  },
} as const;

type AcademicRecord = Prisma.InscripcionGetPayload<{ include: typeof academicInclude }>;

@Injectable()
export class CalificacionesService {
  constructor(private readonly database: DatabaseService) {}

  async grupoDocente(grupoInput: string, query: unknown, actor: AuthActor) {
    const grupoId = parse(idSchema, grupoInput);
    const { q, page, pageSize } = parse(listSchema, query);
    const docente = await this.database.client.docente.findUnique({
      where: { usuarioId: actor.userId },
      select: { id: true, activo: true },
    });
    if (!docente?.activo) {
      throw new ForbiddenException('Se requiere un perfil docente activo.');
    }
    const group = await this.database.client.grupo.findFirst({
      where: { id: grupoId, docenteId: docente.id },
      select: {
        id: true,
        clave: true,
        planAsignatura: {
          select: { asignatura: { select: { id: true, clave: true, nombre: true } } },
        },
        periodo: {
          select: {
            id: true,
            clave: true,
            nombre: true,
            politica: { select: policySelect },
          },
        },
      },
    });
    if (!group) throw new NotFoundException('No se encontró el grupo asignado a tu perfil.');

    const where: Prisma.InscripcionWhereInput = {
      grupoId,
      estado: { not: 'CANCELADA' },
      ...(q
        ? {
            estudiante: {
              is: {
                OR: [
                  { nombre: { contains: q, mode: 'insensitive' } },
                  { matricula: { contains: q, mode: 'insensitive' } },
                ],
              },
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.database.client.inscripcion.findMany({
        where,
        select: {
          id: true,
          version: true,
          estado: true,
          notaFinal: true,
          creditosSnapshot: true,
          estudiante: { select: { id: true, matricula: true, nombre: true } },
        },
        orderBy: [{ estudiante: { matricula: 'asc' } }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.database.client.inscripcion.count({ where }),
    ]);
    return {
      grupo: {
        id: group.id,
        clave: group.clave,
        asignatura: group.planAsignatura.asignatura,
        periodo: group.periodo,
        politica: {
          version: group.periodo.politica.version,
          escalaMinima: group.periodo.politica.escalaMinima.toFixed(3),
          escalaMaxima: group.periodo.politica.escalaMaxima.toFixed(3),
          minimaAprobatoria: group.periodo.politica.minimaAprobatoria.toFixed(3),
          decimales: group.periodo.politica.decimales,
          intentosPromedio: group.periodo.politica.intentosPromedio,
          esPropuesta: group.periodo.politica.esPropuesta,
        },
      },
      items: items.map((item) => ({
        inscripcionId: item.id,
        version: item.version,
        estado: item.estado,
        notaFinal: item.notaFinal?.toFixed(3) ?? null,
        creditos: item.creditosSnapshot.toFixed(2),
        estudiante: item.estudiante,
      })),
      page,
      pageSize,
      total,
    };
  }

  async actualizar(inscripcionInput: string, input: unknown, actor: AuthActor) {
    const inscripcionId = parse(idSchema, inscripcionInput);
    const data = parse(updateSchema, input);
    try {
      return await this.database.transaction(
        async (tx) => {
          const docente = await tx.docente.findUnique({
            where: { usuarioId: actor.userId },
            select: { id: true, activo: true },
          });
          if (!docente?.activo) {
            throw new ForbiddenException('Se requiere un perfil docente activo.');
          }
          const current = await tx.inscripcion.findFirst({
            where: { id: inscripcionId, grupo: { is: { docenteId: docente.id } } },
            include: {
              grupo: { select: { docenteId: true, periodo: { select: { politica: true } } } },
            },
          });
          if (!current) throw new NotFoundException('No se encontró la inscripción de tu grupo.');
          if (current.version !== data.version) {
            throw new ConflictException(
              'La inscripción cambió. Actualiza la lista antes de guardar.',
            );
          }
          if (current.estado === 'CANCELADA') {
            throw new ConflictException('No se puede calificar una inscripción cancelada.');
          }
          if ((await tx.evaluacion.count({ where: { grupoId: current.grupoId } })) > 0) {
            throw new ConflictException(
              'Este grupo utiliza evaluaciones ponderadas: captura las notas en Seguimiento del grupo.',
            );
          }

          const policy = current.grupo.periodo.politica;
          const grade = new Prisma.Decimal(data.notaFinal);
          const fractionalDigits = data.notaFinal.split('.')[1]?.length ?? 0;
          if (
            grade.lessThan(policy.escalaMinima) ||
            grade.greaterThan(policy.escalaMaxima) ||
            fractionalDigits > policy.decimales
          ) {
            throw new BadRequestException(
              `La nota debe estar entre ${policy.escalaMinima.toFixed(policy.decimales)} y ${policy.escalaMaxima.toFixed(policy.decimales)} con hasta ${policy.decimales} decimales.`,
            );
          }
          if (current.notaFinal?.equals(grade)) {
            return {
              inscripcionId: current.id,
              version: current.version,
              estado: current.estado,
              notaFinal: current.notaFinal.toFixed(3),
            };
          }
          const isCorrection = current.estado === 'CALIFICADA';
          if (isCorrection && !data.motivo) {
            throw new BadRequestException(
              'Indica el motivo para corregir una calificación ya capturada.',
            );
          }
          const updated = await tx.inscripcion.updateMany({
            where: { id: current.id, version: data.version, estado: { not: 'CANCELADA' } },
            data: { notaFinal: grade, estado: 'CALIFICADA' },
          });
          if (updated.count !== 1) {
            throw new ConflictException(
              'La inscripción cambió. Actualiza la lista antes de guardar.',
            );
          }
          const saved = await tx.inscripcion.findUniqueOrThrow({ where: { id: current.id } });
          const student = await tx.estudiante.findUnique({
            where: { id: current.estudianteId },
            select: { usuarioId: true },
          });
          if (student)
            await tx.notificacion.create({
              data: {
                usuarioId: student.usuarioId,
                titulo: 'Calificación publicada',
                mensaje: `Se registró una calificación final: ${saved.notaFinal?.toFixed(3)}.`,
              },
            });
          await tx.auditoria.create({
            data: {
              actorId: actor.userId,
              accion: isCorrection ? 'CORREGIR_CALIFICACION' : 'CAPTURAR_CALIFICACION',
              recurso: 'Inscripcion',
              recursoId: current.id,
              ...(isCorrection ? { motivo: data.motivo } : {}),
              anterior: {
                estado: current.estado,
                notaFinal: current.notaFinal?.toFixed(3) ?? null,
                version: current.version,
              },
              posterior: {
                estado: saved.estado,
                notaFinal: saved.notaFinal?.toFixed(3) ?? null,
                version: saved.version,
              },
            },
          });
          return {
            inscripcionId: saved.id,
            version: saved.version,
            estado: saved.estado,
            notaFinal: saved.notaFinal?.toFixed(3) ?? null,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      handleConflict(error);
    }
  }

  async calificacionesEstudiante(actor: AuthActor) {
    const student = await this.estudiante(actor.userId);
    const records = await this.registrosEstudiante(student.id);
    const attempts = records.map((record) => this.comoIntento(record));
    const byPeriod = promedioPorPeriodo(attempts);
    const periodRecords = new Map<string, AcademicRecord>();
    for (const record of records) periodRecords.set(record.grupo.periodo.id, record);
    return {
      items: records.map((record) => this.serializarHistorial(record)),
      promedioGeneral: promedioGeneral(attempts),
      periodos: [...periodRecords.values()]
        .map((record) => ({
          id: record.grupo.periodo.id,
          clave: record.grupo.periodo.clave,
          nombre: record.grupo.periodo.nombre,
          promedio: byPeriod.get(record.grupo.periodo.id) ?? null,
          intentosCalificados: records.filter(
            (item) =>
              item.grupo.periodo.id === record.grupo.periodo.id &&
              item.estado === 'CALIFICADA' &&
              item.notaFinal !== null,
          ).length,
        }))
        .sort((a, b) => a.clave.localeCompare(b.clave)),
      politicaPropuesta: records.some((record) => record.grupo.periodo.politica.esPropuesta),
    };
  }

  async progresoEstudiante(actor: AuthActor) {
    const student = await this.estudiante(actor.userId);
    const [records, plan] = await Promise.all([
      this.registrosEstudiante(student.id),
      this.database.client.planEstudio.findUniqueOrThrow({
        where: { id: student.planId },
        select: {
          id: true,
          nombre: true,
          version: true,
          programa: { select: { clave: true, nombre: true } },
          asignaturas: { select: { asignaturaId: true, creditos: true } },
        },
      }),
    ]);
    return {
      plan: {
        id: plan.id,
        nombre: plan.nombre,
        version: plan.version,
        programa: plan.programa,
      },
      ...calcularAvance(
        plan.asignaturas.map((course) => ({ id: course.asignaturaId, creditos: course.creditos })),
        records.map((record) => this.comoIntento(record)),
      ),
      politicaPropuesta: records.some((record) => record.grupo.periodo.politica.esPropuesta),
    };
  }

  private async estudiante(userId: string) {
    const student = await this.database.client.estudiante.findUnique({
      where: { usuarioId: userId },
      select: { id: true, planId: true },
    });
    if (!student) throw new NotFoundException('No se encontró un perfil de estudiante.');
    return student;
  }

  private registrosEstudiante(estudianteId: string) {
    return this.database.client.inscripcion.findMany({
      where: { estudianteId },
      include: academicInclude,
      orderBy: [
        { grupo: { periodo: { inicio: 'asc' } } },
        { grupo: { periodo: { fin: 'asc' } } },
        { creadoEn: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  private comoIntento(record: AcademicRecord): IntentoAcademico {
    return {
      inscripcionId: record.id,
      asignaturaId: record.asignaturaId,
      estado: record.estado,
      notaFinal: record.notaFinal,
      creditosSnapshot: record.creditosSnapshot,
      creadoEn: record.creadoEn,
      periodo: {
        id: record.grupo.periodo.id,
        inicio: record.grupo.periodo.inicio,
        fin: record.grupo.periodo.fin,
        politica: {
          minimaAprobatoria: record.grupo.periodo.politica.minimaAprobatoria,
          intentosPromedio: record.grupo.periodo.politica.intentosPromedio,
        },
      },
    };
  }

  private serializarHistorial(record: AcademicRecord) {
    const approved =
      record.estado === 'CALIFICADA' &&
      record.notaFinal !== null &&
      record.notaFinal.greaterThanOrEqualTo(record.grupo.periodo.politica.minimaAprobatoria);
    const resultado =
      record.estado === 'CANCELADA'
        ? 'CANCELADA'
        : record.estado === 'PENDIENTE'
          ? 'PENDIENTE'
          : approved
            ? 'APROBADA'
            : 'REPROBADA';
    return {
      inscripcionId: record.id,
      estado: record.estado,
      resultado,
      notaFinal: record.notaFinal?.toFixed(3) ?? null,
      creditosSnapshot: record.creditosSnapshot.toFixed(2),
      creadoEn: record.creadoEn.toISOString(),
      version: record.version,
      grupo: { clave: record.grupo.clave, docente: record.grupo.docente.nombre },
      asignatura: record.grupo.planAsignatura.asignatura,
      periodo: {
        id: record.grupo.periodo.id,
        clave: record.grupo.periodo.clave,
        nombre: record.grupo.periodo.nombre,
        inicio: record.grupo.periodo.inicio.toISOString().slice(0, 10),
        fin: record.grupo.periodo.fin.toISOString().slice(0, 10),
        politica: {
          version: record.grupo.periodo.politica.version,
          minimaAprobatoria: record.grupo.periodo.politica.minimaAprobatoria.toFixed(3),
          intentosPromedio: record.grupo.periodo.politica.intentosPromedio,
          esPropuesta: record.grupo.periodo.politica.esPropuesta,
        },
      },
    };
  }
}
