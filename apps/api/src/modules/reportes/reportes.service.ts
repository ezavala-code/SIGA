import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service.js';
import type { AuthActor } from '../auth/auth.types.js';

const idSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const listSchema = z.object({
  q: z.string().trim().max(120).optional(),
  periodoId: idSchema.optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
const auditSchema = z.object({
  q: z.string().trim().max(120).optional(),
  accion: z.string().trim().min(1).max(80).optional(),
  recurso: z.string().trim().min(1).max(80).optional(),
  desde: z.string().datetime({ offset: true }).optional(),
  hasta: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      message: 'Los filtros del reporte no son válidos.',
      errores: result.error.flatten().fieldErrors,
    });
  }
  return result.data;
}

function formulaSafe(value: string) {
  return /^(?:[\t\r]| *[\t\r=+\-@])/.test(value) ? `'${value}` : value;
}

function csv(value: string | null | undefined) {
  const safe = formulaSafe(value ?? '');
  return `"${safe.replaceAll('"', '""')}"`;
}

function dateTime(value: Date | null | undefined) {
  return value?.toISOString() ?? '';
}

@Injectable()
export class ReportesService {
  constructor(private readonly database: DatabaseService) {}

  async grupos(queryInput: unknown) {
    const { q, periodoId, page, pageSize } = parse(listSchema, queryInput);
    const where = {
      ...(periodoId ? { periodoId } : {}),
      ...(q
        ? {
            OR: [
              { clave: { contains: q, mode: 'insensitive' as const } },
              {
                planAsignatura: {
                  asignatura: { nombre: { contains: q, mode: 'insensitive' as const } },
                },
              },
              { docente: { nombre: { contains: q, mode: 'insensitive' as const } } },
              { periodo: { nombre: { contains: q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.database.client.grupo.findMany({
        where,
        orderBy: [{ periodo: { inicio: 'desc' } }, { clave: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          clave: true,
          activo: true,
          cupo: true,
          periodo: {
            select: { id: true, clave: true, nombre: true, inicio: true, fin: true, estado: true },
          },
          planAsignatura: {
            select: {
              plan: {
                select: {
                  nombre: true,
                  version: true,
                  programa: { select: { clave: true, nombre: true } },
                },
              },
              asignatura: { select: { clave: true, nombre: true } },
            },
          },
          docente: { select: { nombre: true, numeroEmpleado: true } },
          _count: { select: { inscripciones: true } },
        },
      }),
      this.database.client.grupo.count({ where }),
    ]);
    return {
      items: items.map(({ planAsignatura, docente, _count, ...group }) => ({
        ...group,
        programa: planAsignatura.plan.programa,
        plan: { nombre: planAsignatura.plan.nombre, version: planAsignatura.plan.version },
        asignatura: planAsignatura.asignatura,
        docente,
        inscripciones: _count.inscripciones,
      })),
      page,
      pageSize,
      total,
    };
  }

  async historialCsv(grupoInput: string, actor: AuthActor) {
    const grupoId = idSchema.safeParse(grupoInput);
    if (!grupoId.success) throw new BadRequestException('El grupo no es válido.');
    const where =
      actor.rol === 'DOCENTE'
        ? { id: grupoId.data, docente: { usuarioId: actor.userId, activo: true } }
        : { id: grupoId.data };
    if (actor.rol !== 'ADMINISTRADOR' && actor.rol !== 'DOCENTE') {
      throw new ForbiddenException('Acceso no permitido.');
    }
    const group = await this.database.client.grupo.findFirst({
      where,
      select: {
        id: true,
        clave: true,
        planAsignatura: { select: { asignatura: { select: { clave: true, nombre: true } } } },
        periodo: { select: { clave: true, nombre: true } },
        docente: { select: { nombre: true } },
        inscripciones: {
          orderBy: [{ estudiante: { matricula: 'asc' } }, { creadoEn: 'asc' }, { id: 'asc' }],
          select: {
            estado: true,
            notaFinal: true,
            creditosSnapshot: true,
            creadoEn: true,
            estudiante: { select: { nombre: true, matricula: true } },
          },
        },
      },
    });
    if (!group) throw new NotFoundException('No se encontró un grupo autorizado.');
    const rows = [
      [
        'Período clave',
        'Periodo',
        'Grupo',
        'Asignatura clave',
        'Asignatura',
        'Matrícula',
        'Estudiante',
        'Estado',
        'Nota final',
        'Créditos',
        'Inscrito en',
        'Docente',
      ],
      ...group.inscripciones.map((item) => [
        group.periodo.clave,
        group.periodo.nombre,
        group.clave,
        group.planAsignatura.asignatura.clave,
        group.planAsignatura.asignatura.nombre,
        item.estudiante.matricula,
        item.estudiante.nombre,
        item.estado,
        item.notaFinal?.toFixed(3) ?? '',
        item.creditosSnapshot.toFixed(2),
        dateTime(item.creadoEn),
        group.docente.nombre,
      ]),
    ];
    const content = `\uFEFF${rows.map((row) => row.map(csv).join(',')).join('\r\n')}\r\n`;
    return { content, nombreArchivo: `historial-${group.id}.csv`, grupo: group.clave };
  }

  async auditoria(queryInput: unknown) {
    const { q, accion, recurso, desde, hasta, page, pageSize } = parse(auditSchema, queryInput);
    if (desde && hasta && new Date(desde) > new Date(hasta)) {
      throw new BadRequestException('El intervalo de fechas del reporte no es válido.');
    }
    const where = {
      ...(accion ? { accion: { contains: accion, mode: 'insensitive' as const } } : {}),
      ...(recurso ? { recurso: { contains: recurso, mode: 'insensitive' as const } } : {}),
      ...(desde || hasta
        ? {
            creadoEn: {
              ...(desde ? { gte: new Date(desde) } : {}),
              ...(hasta ? { lte: new Date(hasta) } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { accion: { contains: q, mode: 'insensitive' as const } },
              { recurso: { contains: q, mode: 'insensitive' as const } },
              { recursoId: { contains: q, mode: 'insensitive' as const } },
              { motivo: { contains: q, mode: 'insensitive' as const } },
              { actor: { correo: { contains: q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.database.client.auditoria.findMany({
        where,
        orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          accion: true,
          recurso: true,
          recursoId: true,
          motivo: true,
          anterior: true,
          posterior: true,
          creadoEn: true,
          actor: { select: { correo: true, rol: true } },
        },
      }),
      this.database.client.auditoria.count({ where }),
    ]);
    return { items, page, pageSize, total };
  }
}
