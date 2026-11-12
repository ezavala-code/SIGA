import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Prisma } from '../../generated/prisma/client.js';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service.js';
import type { AuthActor } from '../auth/auth.types.js';
import { seTraslapan, sumarPonderaciones, validarPonderaciones } from './reglas.js';

const uuid = z.uuid();
const rango = z
  .object({
    diaSemana: z.number().int().min(1).max(7),
    inicioMinuto: z.number().int().min(0).max(1439),
    finMinuto: z.number().int().min(1).max(1440),
    aula: z.string().trim().min(1).max(80),
  })
  .strict()
  .refine((v) => v.finMinuto > v.inicioMinuto);
const horarioSchema = z.object({ horarios: z.array(rango).max(35) }).strict();
const evaluarSchema = z
  .object({
    nombre: z.string().trim().min(1).max(120),
    ponderacion: z.number().positive().max(100),
  })
  .strict();
const notaSchema = z
  .object({
    inscripcionId: uuid,
    nota: z.string().regex(/^\d{1,3}(?:\.\d{1,3})?$/),
    motivo: z.string().trim().min(5).max(500).optional(),
  })
  .strict();
const fechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
      new Date(`${value}T00:00:00Z`).toISOString().startsWith(value),
  );
const sesionSchema = z
  .object({ fecha: fechaSchema, tema: z.string().trim().min(1).max(160) })
  .strict();
const asistenciaSchema = z.object({ inscripcionId: uuid, presente: z.boolean() }).strict();
const perfilSchema = z
  .object({
    nombre: z.string().trim().min(3).max(160).optional(),
    passwordActual: z.string().min(1).max(128).optional(),
    passwordNueva: z.string().min(12).max(128).optional(),
  })
  .strict()
  .refine((v) => !!v.nombre || !!v.passwordNueva)
  .refine((v) => !v.passwordNueva || !!v.passwordActual);
const recuperacionSchema = z
  .object({ token: z.string().regex(/^[a-f0-9]{64}$/), passwordNueva: z.string().min(12).max(128) })
  .strict();

function parse<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new BadRequestException({
      message: 'Datos inválidos.',
      errores: result.error.flatten().fieldErrors,
    });
  return result.data;
}

function serializarHorario(value: {
  id: string;
  grupoId: string;
  diaSemana: number;
  inicioMinuto: number;
  finMinuto: number;
  aula: string;
}) {
  return value;
}

@Injectable()
export class AmpliacionService {
  constructor(private readonly database: DatabaseService) {}

  private async docenteDelGrupo(grupoId: string, actor: AuthActor) {
    const grupo = await this.database.client.grupo.findFirst({
      where: { id: parse(uuid, grupoId), docente: { usuarioId: actor.userId, activo: true } },
      include: { periodo: true },
    });
    if (!grupo) throw new NotFoundException('No se encontró un grupo asignado a este docente.');
    return grupo;
  }

  async horariosGrupo(grupoId: string, actor: AuthActor) {
    const id = parse(uuid, grupoId);
    const group = await this.database.client.grupo.findUnique({
      where: { id },
      select: {
        id: true,
        docente: { select: { usuarioId: true } },
        inscripciones: {
          where: { estado: { not: 'CANCELADA' } },
          select: { estudiante: { select: { usuarioId: true } } },
        },
      },
    });
    if (
      !group ||
      (actor.rol !== 'ADMINISTRADOR' &&
        group.docente.usuarioId !== actor.userId &&
        !group.inscripciones.some((v) => v.estudiante.usuarioId === actor.userId))
    )
      throw new NotFoundException('Grupo no disponible.');
    return this.database.client.horarioGrupo.findMany({
      where: { grupoId: id },
      orderBy: [{ diaSemana: 'asc' }, { inicioMinuto: 'asc' }],
    });
  }

  async miHorario(actor: AuthActor) {
    if (actor.rol === 'ADMINISTRADOR')
      throw new ForbiddenException('Selecciona un grupo de la oferta.');
    const groups = await this.database.client.grupo.findMany({
      where:
        actor.rol === 'DOCENTE'
          ? { docente: { usuarioId: actor.userId, activo: true } }
          : {
              inscripciones: {
                some: { estudiante: { usuarioId: actor.userId }, estado: { not: 'CANCELADA' } },
              },
            },
      select: {
        id: true,
        clave: true,
        periodo: { select: { clave: true, nombre: true } },
        planAsignatura: { select: { asignatura: { select: { nombre: true, clave: true } } } },
        horarios: { orderBy: [{ diaSemana: 'asc' }, { inicioMinuto: 'asc' }] },
      },
      orderBy: [{ periodo: { inicio: 'desc' } }, { clave: 'asc' }],
      take: 150,
    });
    return groups.map((g) => ({
      grupoId: g.id,
      grupo: g.clave,
      periodo: g.periodo.nombre,
      asignatura: g.planAsignatura.asignatura.nombre,
      horarios: g.horarios.map(serializarHorario),
    }));
  }

  async reemplazarHorarios(grupoId: string, input: unknown, actor: AuthActor) {
    const id = parse(uuid, grupoId);
    const { horarios } = parse(horarioSchema, input);
    for (let i = 0; i < horarios.length; i++)
      for (let j = i + 1; j < horarios.length; j++)
        if (seTraslapan(horarios[i]!, horarios[j]!))
          throw new ConflictException('Un grupo no puede tener clases simultáneas.');
    return this.database.transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Grupo" WHERE "id" = ${id}::uuid FOR UPDATE`;
        const group = await tx.grupo.findUnique({
          where: { id },
          select: { id: true, periodoId: true, docenteId: true, clave: true },
        });
        if (!group) throw new NotFoundException('Grupo no encontrado.');
        const others = await tx.grupo.findMany({
          where: { id: { not: id }, periodoId: group.periodoId, activo: true },
          include: { horarios: true },
        });
        for (const other of others)
          for (const nuevo of horarios)
            for (const previo of other.horarios) {
              if (!seTraslapan(nuevo, previo)) continue;
              if (other.docenteId === group.docenteId)
                throw new ConflictException(
                  `El docente ya tiene clase en el grupo ${other.clave}.`,
                );
              if (nuevo.aula.toLocaleLowerCase('es') === previo.aula.toLocaleLowerCase('es'))
                throw new ConflictException(
                  `El aula ${nuevo.aula} está ocupada por ${other.clave}.`,
                );
            }
        const students = await tx.inscripcion.findMany({
          where: { grupoId: id, estado: { not: 'CANCELADA' } },
          select: { estudianteId: true },
        });
        if (students.length) {
          const sameStudents = await tx.inscripcion.findMany({
            where: {
              estudianteId: { in: students.map((e) => e.estudianteId) },
              periodoId: group.periodoId,
              grupoId: { not: id },
              estado: { not: 'CANCELADA' },
            },
            select: { grupo: { select: { clave: true, horarios: true } } },
          });
          for (const item of sameStudents)
            if (
              horarios.some((h) => item.grupo.horarios.some((existing) => seTraslapan(h, existing)))
            )
              throw new ConflictException('El nuevo horario choca con materias ya inscritas.');
        }
        await tx.horarioGrupo.deleteMany({ where: { grupoId: id } });
        if (horarios.length)
          await tx.horarioGrupo.createMany({ data: horarios.map((h) => ({ ...h, grupoId: id })) });
        await tx.auditoria.create({
          data: {
            actorId: actor.userId,
            accion: 'ACTUALIZAR_HORARIOS',
            recurso: 'Grupo',
            recursoId: id,
            posterior: horarios,
          },
        });
        return tx.horarioGrupo.findMany({
          where: { grupoId: id },
          orderBy: [{ diaSemana: 'asc' }, { inicioMinuto: 'asc' }],
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async mapaCurricular(actor: AuthActor) {
    const student = await this.database.client.estudiante.findUnique({
      where: { usuarioId: actor.userId },
      include: {
        plan: {
          include: {
            programa: true,
            asignaturas: {
              include: { asignatura: true, requisitos: true },
              orderBy: [{ semestreSugerido: 'asc' }, { asignatura: { nombre: 'asc' } }],
            },
          },
        },
      },
    });
    if (!student) throw new NotFoundException('Estudiante no encontrado.');
    const inscriptions = await this.database.client.inscripcion.findMany({
      where: { estudianteId: student.id },
      select: {
        asignaturaId: true,
        estado: true,
        notaFinal: true,
        grupo: {
          select: { periodo: { select: { politica: { select: { minimaAprobatoria: true } } } } },
        },
      },
    });
    const approved = new Set(
      inscriptions
        .filter(
          (i) =>
            i.estado === 'CALIFICADA' &&
            i.notaFinal?.gte(i.grupo.periodo.politica.minimaAprobatoria),
        )
        .map((i) => i.asignaturaId),
    );
    const active = new Set(
      inscriptions.filter((i) => i.estado === 'PENDIENTE').map((i) => i.asignaturaId),
    );
    return {
      plan: {
        id: student.plan.id,
        nombre: student.plan.nombre,
        version: student.plan.version,
        programa: student.plan.programa.nombre,
      },
      asignaturas: student.plan.asignaturas.map((course) => {
        const missing = course.requisitos
          .filter((p) => !approved.has(p.requeridaId))
          .map((p) => p.requeridaId);
        return {
          id: course.asignaturaId,
          clave: course.asignatura.clave,
          nombre: course.asignatura.nombre,
          creditos: course.creditos.toFixed(2),
          semestre: course.semestreSugerido,
          prerequisitosPendientes: missing,
          estado: approved.has(course.asignaturaId)
            ? 'APROBADA'
            : active.has(course.asignaturaId)
              ? 'CURSANDO'
              : missing.length
                ? 'BLOQUEADA'
                : 'DISPONIBLE',
        };
      }),
    };
  }

  async evaluacionesGrupo(grupoId: string, actor: AuthActor) {
    if (actor.rol === 'DOCENTE') await this.docenteDelGrupo(grupoId, actor);
    else if (actor.rol !== 'ADMINISTRADOR')
      throw new ForbiddenException('Consulta las evaluaciones de tu inscripción.');
    return this.database.client.evaluacion.findMany({
      where: { grupoId: parse(uuid, grupoId) },
      include: { notas: { select: { inscripcionId: true, nota: true } } },
      orderBy: [{ creadoEn: 'asc' }, { nombre: 'asc' }],
    });
  }

  async crearEvaluacion(grupoId: string, input: unknown, actor: AuthActor) {
    const group = await this.docenteDelGrupo(grupoId, actor);
    const data = parse(evaluarSchema, input);
    return this.database.transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Grupo" WHERE "id" = ${group.id}::uuid FOR UPDATE`;
        const existing = await tx.evaluacion.findMany({
          where: { grupoId: group.id },
          select: { ponderacion: true },
        });
        if (
          !validarPonderaciones([
            ...existing.map((item) => item.ponderacion.toFixed(2)),
            data.ponderacion,
          ])
        )
          throw new ConflictException('Las ponderaciones del grupo no pueden superar el 100%.');
        // No combinar notas finales históricas con un nuevo esquema de cálculo.
        const previous = await tx.inscripcion.count({
          where: { grupoId: group.id, estado: 'CALIFICADA' },
        });
        if (previous)
          throw new ConflictException(
            'El grupo ya tiene calificaciones finales. Mantén el modo manual para este grupo.',
          );
        const created = await tx.evaluacion.create({
          data: {
            grupoId: group.id,
            nombre: data.nombre,
            ponderacion: new Prisma.Decimal(data.ponderacion),
          },
        });
        await tx.auditoria.create({
          data: {
            actorId: actor.userId,
            accion: 'CREAR_EVALUACION',
            recurso: 'Evaluacion',
            recursoId: created.id,
            posterior: { grupoId: group.id, nombre: data.nombre, ponderacion: data.ponderacion },
          },
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async capturarNotaEvaluacion(evaluacionId: string, input: unknown, actor: AuthActor) {
    const id = parse(uuid, evaluacionId);
    const body = parse(notaSchema, input);
    const evaluation = await this.database.client.evaluacion.findUnique({
      where: { id },
      include: {
        grupo: {
          select: {
            id: true,
            docente: { select: { usuarioId: true, activo: true } },
            periodo: { select: { politica: true } },
          },
        },
      },
    });
    if (
      !evaluation ||
      !evaluation.grupo.docente.activo ||
      evaluation.grupo.docente.usuarioId !== actor.userId
    )
      throw new NotFoundException('Evaluación no asignada.');
    return this.database.transaction(
      async (tx) => {
        // El registro de inscripción sincroniza actualizaciones de nota parcial y final.
        await tx.$queryRaw`SELECT "id" FROM "Inscripcion" WHERE "id" = ${body.inscripcionId}::uuid FOR UPDATE`;
        const inscription = await tx.inscripcion.findFirst({
          where: {
            id: body.inscripcionId,
            grupoId: evaluation.grupoId,
            estado: { not: 'CANCELADA' },
          },
        });
        if (!inscription) throw new NotFoundException('Inscripción no encontrada en el grupo.');
        const policy = evaluation.grupo.periodo.politica;
        const value = new Prisma.Decimal(body.nota);
        if (
          value.lt(policy.escalaMinima) ||
          value.gt(policy.escalaMaxima) ||
          (body.nota.split('.')[1]?.length ?? 0) > policy.decimales
        )
          throw new BadRequestException('Nota fuera de la escala académica.');
        const previous = await tx.notaEvaluacion.findUnique({
          where: {
            evaluacionId_inscripcionId: { evaluacionId: id, inscripcionId: inscription.id },
          },
        });
        if (previous?.nota.equals(value))
          return {
            inscripcionId: inscription.id,
            nota: previous.nota.toFixed(3),
            notaFinal: inscription.notaFinal?.toFixed(3) ?? null,
          };
        if (previous && !body.motivo)
          throw new BadRequestException('Indica un motivo para corregir la nota parcial.');
        await tx.notaEvaluacion.upsert({
          where: {
            evaluacionId_inscripcionId: { evaluacionId: id, inscripcionId: inscription.id },
          },
          create: { evaluacionId: id, inscripcionId: inscription.id, nota: value },
          update: { nota: value },
        });
        const all = await tx.evaluacion.findMany({
          where: { grupoId: evaluation.grupoId },
          include: { notas: { where: { inscripcionId: inscription.id } } },
        });
        const sum = sumarPonderaciones(all.map((e) => e.ponderacion.toFixed(2)));
        let final: string | null = null;
        if (sum === 100 && all.every((e) => e.notas.length === 1)) {
          const total = all.reduce(
            (amount, e) => amount.plus(e.notas[0]!.nota.mul(e.ponderacion).div(100)),
            new Prisma.Decimal(0),
          );
          const rounded = total.toDecimalPlaces(policy.decimales, Prisma.Decimal.ROUND_HALF_UP);
          await tx.inscripcion.update({
            where: { id: inscription.id },
            data: { notaFinal: rounded, estado: 'CALIFICADA' },
          });
          final = rounded.toFixed(3);
        } else if (inscription.estado === 'CALIFICADA') {
          // No ocultar una nota final previamente calculada cuando cambian los parciales.
          await tx.inscripcion.update({
            where: { id: inscription.id },
            data: { notaFinal: null, estado: 'PENDIENTE' },
          });
        }
        await tx.auditoria.create({
          data: {
            actorId: actor.userId,
            accion: previous ? 'CORREGIR_NOTA_PARCIAL' : 'CAPTURAR_NOTA_PARCIAL',
            recurso: 'NotaEvaluacion',
            recursoId: id,
            motivo: body.motivo,
            anterior: previous ? { nota: previous.nota.toFixed(3) } : Prisma.JsonNull,
            posterior: { inscripcionId: inscription.id, nota: body.nota, notaFinal: final },
          },
        });
        const user = await tx.estudiante.findUnique({
          where: { id: inscription.estudianteId },
          select: { usuarioId: true },
        });
        if (user)
          await tx.notificacion.create({
            data: {
              usuarioId: user.usuarioId,
              titulo: 'Nueva evaluación',
              mensaje: final
                ? `Tu calificación final fue calculada: ${final}.`
                : `Se registró una nota en ${evaluation.nombre}.`,
            },
          });
        return { inscripcionId: inscription.id, nota: value.toFixed(3), notaFinal: final };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async misEvaluaciones(actor: AuthActor) {
    const student = await this.database.client.estudiante.findUnique({
      where: { usuarioId: actor.userId },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Estudiante no encontrado.');
    const ins = await this.database.client.inscripcion.findMany({
      where: { estudianteId: student.id, estado: { not: 'CANCELADA' } },
      include: {
        grupo: {
          select: {
            clave: true,
            planAsignatura: { select: { asignatura: { select: { nombre: true } } } },
            evaluaciones: {
              include: { notas: { where: { inscripcion: { estudianteId: student.id } } } },
            },
          },
        },
      },
      orderBy: [{ creadoEn: 'desc' }],
      take: 100,
    });
    return ins.map((i) => ({
      inscripcionId: i.id,
      grupo: i.grupo.clave,
      asignatura: i.grupo.planAsignatura.asignatura.nombre,
      notaFinal: i.notaFinal?.toFixed(3) ?? null,
      evaluaciones: i.grupo.evaluaciones.map((e) => ({
        nombre: e.nombre,
        ponderacion: e.ponderacion.toFixed(2),
        nota: e.notas.find((n) => n.inscripcionId === i.id)?.nota.toFixed(3) ?? null,
      })),
    }));
  }

  async misNotificaciones(actor: AuthActor) {
    return this.database.client.notificacion.findMany({
      where: { usuarioId: actor.userId },
      orderBy: [{ creadoEn: 'desc' }],
      take: 60,
    });
  }
  async leerNotificacion(id: string, actor: AuthActor) {
    const result = await this.database.client.notificacion.updateMany({
      where: { id: parse(uuid, id), usuarioId: actor.userId, leidaEn: null },
      data: { leidaEn: new Date() },
    });
    if (!result.count) throw new NotFoundException('Notificación no encontrada o ya leída.');
    return { ok: true };
  }

  async crearSesion(grupoId: string, input: unknown, actor: AuthActor) {
    const group = await this.docenteDelGrupo(grupoId, actor);
    const { fecha, tema } = parse(sesionSchema, input);
    const d = new Date(`${fecha}T00:00:00.000Z`);
    if (d < group.periodo.inicio || d > group.periodo.fin)
      throw new BadRequestException('La sesión debe encontrarse dentro del periodo académico.');
    try {
      return await this.database.client.sesionClase.create({
        data: { grupoId: group.id, fecha: d, tema },
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
        throw new ConflictException('Ya existe una sesión para esa fecha.');
      throw error;
    }
  }
  async sesionesGrupo(grupoId: string, actor: AuthActor) {
    const group = await this.docenteDelGrupo(grupoId, actor);
    return this.database.client.sesionClase.findMany({
      where: { grupoId: group.id },
      include: { registros: { select: { inscripcionId: true, presente: true } } },
      orderBy: { fecha: 'desc' },
      take: 100,
    });
  }
  async registrarAsistencia(sesionId: string, input: unknown, actor: AuthActor) {
    const item = parse(asistenciaSchema, input);
    const sesion = await this.database.client.sesionClase.findUnique({
      where: { id: parse(uuid, sesionId) },
      select: { id: true, grupoId: true },
    });
    if (!sesion) throw new NotFoundException('Sesión inexistente.');
    await this.docenteDelGrupo(sesion.grupoId, actor);
    const inscription = await this.database.client.inscripcion.findFirst({
      where: { id: item.inscripcionId, grupoId: sesion.grupoId, estado: { not: 'CANCELADA' } },
    });
    if (!inscription) throw new NotFoundException('El estudiante no está inscrito en el grupo.');
    const saved = await this.database.client.registroAsistencia.upsert({
      where: { sesionId_inscripcionId: { sesionId: sesion.id, inscripcionId: inscription.id } },
      create: { sesionId: sesion.id, inscripcionId: inscription.id, presente: item.presente },
      update: { presente: item.presente },
    });
    return saved;
  }
  async miAsistencia(actor: AuthActor) {
    const student = await this.database.client.estudiante.findUnique({
      where: { usuarioId: actor.userId },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Estudiante no encontrado.');
    const inscriptions = await this.database.client.inscripcion.findMany({
      where: { estudianteId: student.id, estado: { not: 'CANCELADA' } },
      include: {
        grupo: {
          select: {
            clave: true,
            planAsignatura: { select: { asignatura: { select: { nombre: true } } } },
            sesionesClase: {
              select: {
                id: true,
                fecha: true,
                tema: true,
                registros: {
                  where: { inscripcion: { estudianteId: student.id } },
                  select: { presente: true },
                },
              },
            },
          },
        },
      },
      take: 100,
    });
    return inscriptions.map((i) => {
      const total = i.grupo.sesionesClase.length;
      const presentes = i.grupo.sesionesClase.filter((s) => s.registros[0]?.presente).length;
      return {
        grupo: i.grupo.clave,
        asignatura: i.grupo.planAsignatura.asignatura.nombre,
        total,
        presentes,
        porcentaje: total ? Number(((presentes / total) * 100).toFixed(1)) : null,
        sesiones: i.grupo.sesionesClase.map((s) => ({
          fecha: s.fecha.toISOString().slice(0, 10),
          tema: s.tema,
          presente: s.registros[0]?.presente ?? null,
        })),
      };
    });
  }

  async indicadores() {
    const db = this.database.client;
    const [estudiantes, docentes, programas, periodos, grupos, inscripciones, recientes] =
      await Promise.all([
        db.estudiante.count({ where: { estado: 'ACTIVO' } }),
        db.docente.count({ where: { activo: true } }),
        db.programa.count({ where: { activo: true } }),
        db.periodo.count({ where: { estado: 'ABIERTO' } }),
        db.grupo.count({ where: { activo: true } }),
        db.inscripcion.count({ where: { estado: { not: 'CANCELADA' } } }),
        db.grupo.findMany({
          where: { activo: true },
          select: {
            id: true,
            clave: true,
            cupo: true,
            planAsignatura: {
              select: {
                asignatura: { select: { nombre: true } },
                plan: { select: { programa: { select: { nombre: true } } } },
              },
            },
            _count: { select: { inscripciones: { where: { estado: { not: 'CANCELADA' } } } } },
          },
          orderBy: { periodo: { inicio: 'desc' } },
          take: 40,
        }),
      ]);
    const progs = await db.programa.findMany({
      select: {
        id: true,
        nombre: true,
        planes: { select: { _count: { select: { estudiantes: true } } } },
      },
    });
    const grades = await db.inscripcion.groupBy({
      by: ['asignaturaId'],
      where: { estado: 'CALIFICADA', notaFinal: { not: null } },
      _count: { _all: true },
      orderBy: { asignaturaId: 'asc' },
      take: 300,
    });
    return {
      resumen: {
        estudiantes,
        docentes,
        programas,
        periodosAbiertos: periodos,
        grupos,
        inscripciones,
      },
      porPrograma: progs.map((p) => ({
        nombre: p.nombre,
        estudiantes: p.planes.reduce((acc, plan) => acc + plan._count.estudiantes, 0),
      })),
      ocupacion: recientes.map((g) => ({
        id: g.id,
        grupo: g.clave,
        asignatura: g.planAsignatura.asignatura.nombre,
        programa: g.planAsignatura.plan.programa.nombre,
        cupo: g.cupo,
        inscritos: g._count.inscripciones,
      })),
      asignaturasConCalificaciones: grades.length,
    };
  }

  async alertas() {
    const students = await this.database.client.estudiante.findMany({
      where: { estado: 'ACTIVO' },
      select: {
        id: true,
        matricula: true,
        nombre: true,
        plan: { select: { programa: { select: { nombre: true } } } },
        inscripciones: {
          where: { estado: 'CALIFICADA', notaFinal: { not: null } },
          select: {
            notaFinal: true,
            grupo: {
              select: {
                periodo: { select: { politica: { select: { minimaAprobatoria: true } } } },
              },
            },
          },
        },
      },
      take: 2000,
      orderBy: { matricula: 'asc' },
    });
    return students.flatMap((s) => {
      const attempts = s.inscripciones.filter((i) => i.notaFinal !== null);
      const failed = attempts.filter((i) =>
        i.notaFinal!.lt(i.grupo.periodo.politica.minimaAprobatoria),
      ).length;
      const mean = attempts.length
        ? attempts.reduce((x, i) => x + Number(i.notaFinal), 0) / attempts.length
        : null;
      const reasons = [
        ...(failed >= 2 ? [`${failed} intentos reprobados`] : []),
        ...(mean !== null && attempts.length >= 3 && mean < 7
          ? [`Promedio bajo (${mean.toFixed(2)})`]
          : []),
      ];
      return reasons.length
        ? [
            {
              estudianteId: s.id,
              matricula: s.matricula,
              nombre: s.nombre,
              programa: s.plan.programa.nombre,
              motivos: reasons,
            },
          ]
        : [];
    });
  }

  async configurarCancelacionPeriodo(periodoId: string, input: unknown, actor: AuthActor) {
    const id = parse(uuid, periodoId);
    const { permiteCancelacionEstudiante } = parse(
      z.object({ permiteCancelacionEstudiante: z.boolean() }).strict(),
      input,
    );
    return this.database.transaction(async (tx) => {
      const previous = await tx.periodo.findUnique({ where: { id } });
      if (!previous) throw new NotFoundException('Periodo no encontrado.');
      const result = await tx.periodo.update({
        where: { id },
        data: { permiteCancelacionEstudiante },
      });
      await tx.auditoria.create({
        data: {
          actorId: actor.userId,
          accion: 'CONFIGURAR_CANCELACION',
          recurso: 'Periodo',
          recursoId: id,
          anterior: { permiteCancelacionEstudiante: previous.permiteCancelacionEstudiante },
          posterior: { permiteCancelacionEstudiante },
        },
      });
      return {
        id: result.id,
        clave: result.clave,
        permiteCancelacionEstudiante: result.permiteCancelacionEstudiante,
      };
    });
  }

  async actualizarPerfil(input: unknown, actor: AuthActor) {
    const data = parse(perfilSchema, input);
    const user = await this.database.client.usuario.findUniqueOrThrow({
      where: { id: actor.userId },
    });
    let hash: string | undefined;
    if (data.passwordNueva) {
      if (
        !user.passwordHash.startsWith('$2') ||
        !(await bcrypt.compare(data.passwordActual!, user.passwordHash))
      )
        throw new UnauthorizedException('La contraseña actual es incorrecta.');
      hash = await bcrypt.hash(data.passwordNueva, 12);
    }
    return this.database.transaction(async (tx) => {
      if (data.nombre && actor.rol === 'ADMINISTRADOR')
        throw new BadRequestException('El perfil administrativo no tiene nombre editable.');
      if (data.nombre && actor.rol === 'ESTUDIANTE')
        await tx.estudiante.update({
          where: { usuarioId: actor.userId },
          data: { nombre: data.nombre },
        });
      if (data.nombre && actor.rol === 'DOCENTE')
        await tx.docente.update({
          where: { usuarioId: actor.userId },
          data: { nombre: data.nombre },
        });
      if (hash) {
        await tx.usuario.update({ where: { id: actor.userId }, data: { passwordHash: hash } });
        // Mantener la sesión actual y invalidar todas las demás.
        await tx.sesion.updateMany({
          where: { usuarioId: actor.userId, id: { not: actor.sessionId }, revocadaEn: null },
          data: { revocadaEn: new Date() },
        });
      }
      await tx.auditoria.create({
        data: {
          actorId: actor.userId,
          accion: 'ACTUALIZAR_PERFIL',
          recurso: 'Usuario',
          recursoId: actor.userId,
          posterior: { nombreActualizado: !!data.nombre, claveActualizada: !!hash },
        },
      });
      return { ok: true };
    });
  }

  async generarRecuperacion(usuarioId: string, actor: AuthActor) {
    const id = parse(uuid, usuarioId);
    const user = await this.database.client.usuario.findUnique({
      where: { id },
      select: { id: true, activo: true },
    });
    if (!user?.activo) throw new NotFoundException('Cuenta no encontrada o inactiva.');
    const token = randomBytes(32).toString('hex');
    const expiraEn = new Date(Date.now() + 30 * 60000);
    await this.database.transaction(async (tx) => {
      await tx.recuperacionAcceso.updateMany({
        where: { usuarioId: id, usadoEn: null },
        data: { usadoEn: new Date() },
      });
      await tx.recuperacionAcceso.create({
        data: {
          usuarioId: id,
          tokenHash: createHash('sha256').update(token).digest('hex'),
          expiraEn,
        },
      });
      await tx.auditoria.create({
        data: {
          actorId: actor.userId,
          accion: 'GENERAR_RECUPERACION',
          recurso: 'Usuario',
          recursoId: id,
        },
      });
    });
    // Solo se revela al administrador en esta respuesta, nunca se guarda el token sin hash.
    return {
      token,
      expiraEn,
      aviso: 'Entregar de forma privada al titular; el código es de un solo uso.',
    };
  }

  async completarRecuperacion(input: unknown) {
    const data = parse(recuperacionSchema, input);
    const tokenHash = createHash('sha256').update(data.token).digest('hex');
    const hash = await bcrypt.hash(data.passwordNueva, 12);
    return this.database.transaction(
      async (tx) => {
        const token = await tx.recuperacionAcceso.findUnique({
          where: { tokenHash },
          include: { usuario: true },
        });
        if (!token || token.usadoEn || token.expiraEn <= new Date() || !token.usuario.activo)
          throw new BadRequestException('El código es inválido o caducó.');
        const consumed = await tx.recuperacionAcceso.updateMany({
          where: { id: token.id, usadoEn: null, expiraEn: { gt: new Date() } },
          data: { usadoEn: new Date() },
        });
        if (!consumed.count) throw new BadRequestException('El código ya fue utilizado.');
        await tx.usuario.update({ where: { id: token.usuarioId }, data: { passwordHash: hash } });
        await tx.sesion.updateMany({
          where: { usuarioId: token.usuarioId, revocadaEn: null },
          data: { revocadaEn: new Date() },
        });
        await tx.auditoria.create({
          data: { accion: 'RECUPERAR_ACCESO', recurso: 'Usuario', recursoId: token.usuarioId },
        });
        return { ok: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
