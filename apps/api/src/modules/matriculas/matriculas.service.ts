import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service.js';
import { ENVIRONMENT, type Environment } from '../../config/environment.js';
import type { AuthActor } from '../auth/auth.types.js';
import { ColaGrupos } from './cola-grupos.js';
import { seTraslapan } from '../ampliacion/reglas.js';

const idSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const enrollmentSchema = z.object({ grupoId: idSchema }).strict();
const pageSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

function parsePage(input: unknown) {
  const result = pageSchema.safeParse(input);
  if (!result.success) throw new BadRequestException('Paginación inválida.');
  return result.data;
}

function parseEnrollment(value: unknown) {
  const result = enrollmentSchema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      message: 'Indica un grupo válido para completar la matrícula.',
      errores: result.error.flatten().fieldErrors,
    });
  }
  return result.data;
}

const offerInclude = {
  horarios: true,
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
      politica: {
        select: {
          permiteReinscripcionAprobada: true,
          minimaAprobatoria: true,
        },
      },
    },
  },
  planAsignatura: {
    select: {
      creditos: true,
      plan: {
        select: {
          id: true,
          nombre: true,
          version: true,
          activo: true,
          programa: { select: { clave: true, nombre: true, activo: true } },
        },
      },
      asignatura: { select: { id: true, clave: true, nombre: true, activo: true } },
    },
  },
  docente: { select: { id: true, nombre: true, activo: true } },
  _count: { select: { inscripciones: { where: { estado: { not: 'CANCELADA' } } } } },
} as const;

type OfferRecord = Prisma.GrupoGetPayload<{ include: typeof offerInclude }>;

const enrollmentInclude = {
  grupo: {
    select: {
      id: true,
      clave: true,
      planId: true,
      asignaturaId: true,
      periodoId: true,
      planAsignatura: {
        select: {
          asignatura: { select: { id: true, clave: true, nombre: true } },
        },
      },
      periodo: {
        select: {
          id: true,
          clave: true,
          nombre: true,
          inicio: true,
          inscripcionInicio: true,
          inscripcionFin: true,
          estado: true,
          permiteCancelacionEstudiante: true,
          politica: { select: { permiteCancelacionEstudiante: true } },
        },
      },
      docente: { select: { id: true, nombre: true } },
    },
  },
} as const;

type EnrollmentRecord = Prisma.InscripcionGetPayload<{ include: typeof enrollmentInclude }>;

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

function isRetryable(error: unknown) {
  return ['P2034', '40001', '40P01'].includes(errorCode(error) ?? '');
}

@Injectable()
export class MatriculasService {
  private readonly colaGrupos = new ColaGrupos();

  constructor(
    private readonly database: DatabaseService,
    @Inject(ENVIRONMENT) private readonly environment: Environment,
  ) {}

  async propias(actor: AuthActor, input: unknown = {}) {
    const { page, pageSize } = parsePage(input);
    const paginated = Object.keys(input as object).length > 0;
    const student = await this.studentProfile(this.database.client, actor.userId);
    const items = await this.database.client.inscripcion.findMany({
      where: { estudianteId: student.id },
      include: enrollmentInclude,
      orderBy: [{ creadoEn: 'desc' }, { id: 'asc' }],
      take: paginated ? pageSize : 200,
      ...(paginated ? { skip: (page - 1) * pageSize } : {}),
    });
    const serialized = items.map((item) => this.serializeEnrollment(item));
    if (!paginated) return serialized;
    const total = await this.database.client.inscripcion.count({
      where: { estudianteId: student.id },
    });
    return { items: serialized, page, pageSize, total };
  }

  now() {
    return new Date(Date.now());
  }

  async oferta(actor: AuthActor, input: unknown = {}) {
    const { page, pageSize } = parsePage(input);
    const paginated = Object.keys(input as object).length > 0;
    const student = await this.studentProfile(this.database.client, actor.userId);
    const now = this.now();
    const where: Prisma.GrupoWhereInput = {
      planId: student.planId,
      activo: true,
      planAsignatura: {
        is: {
          plan: { is: { activo: true, programa: { is: { activo: true } } } },
          asignatura: { is: { activo: true } },
        },
      },
      docente: { is: { activo: true } },
      periodo: {
        is: {
          estado: 'ABIERTO',
          inscripcionInicio: { lte: now },
          inscripcionFin: { gt: now },
        },
      },
    };
    const groups = await this.database.client.grupo.findMany({
      where,
      include: offerInclude,
      orderBy: [
        { periodo: { inicio: 'desc' } },
        { planAsignatura: { asignatura: { nombre: 'asc' } } },
        { clave: 'asc' },
        { id: 'asc' },
      ],
      take: paginated ? pageSize : 100,
      ...(paginated ? { skip: (page - 1) * pageSize } : {}),
    });
    const [samePeriod, approved, prerequisites, offers] = await Promise.all([
      this.database.client.inscripcion.findMany({
        where: { estudianteId: student.id },
        select: {
          asignaturaId: true,
          periodoId: true,
          estado: true,
          grupo: { select: { horarios: true } },
        },
      }),
      this.approvedSubjects(this.database.client, student.id, student.planId),
      this.database.client.prerrequisito.findMany({
        where: { planId: student.planId },
        include: { requerida: { select: { asignatura: { select: { nombre: true } } } } },
      }),
      this.database.client.listaEspera.findMany({
        where: {
          grupoId: { in: groups.map((g) => g.id) },
          estado: { in: ['ESPERANDO', 'OFRECIDO'] },
        },
        select: { grupoId: true, estudianteId: true, estado: true },
      }),
    ]);
    const requirements = new Map<string, string[]>();
    for (const prerequisite of prerequisites) {
      const values = requirements.get(prerequisite.asignaturaId) ?? [];
      values.push(prerequisite.requeridaId);
      requirements.set(prerequisite.asignaturaId, values);
    }
    const requirementNames = new Map(
      prerequisites.map((item) => [item.requeridaId, item.requerida.asignatura.nombre]),
    );
    const items = groups.map((group) => {
      const duplicate = samePeriod.some(
        (item) => item.asignaturaId === group.asignaturaId && item.periodoId === group.periodoId,
      );
      const pendingRequirements = (requirements.get(group.asignaturaId) ?? []).filter(
        (requiredId) => !approved.has(requiredId),
      );
      const choqueHorario = samePeriod.some(
        (item) =>
          item.estado !== 'CANCELADA' &&
          item.periodoId === group.periodoId &&
          item.grupo.horarios.some((h) => group.horarios.some((nuevo) => seTraslapan(h, nuevo))),
      );
      const completedPreviously = approved.has(group.asignaturaId);
      const canRepeat = group.periodo.politica.permiteReinscripcionAprobada;
      const offered = offers.some(
        (i) => i.grupoId === group.id && i.estudianteId === student.id && i.estado === 'OFRECIDO',
      );
      const reservas = offers.filter(
        (i) => i.grupoId === group.id && i.estado === 'OFRECIDO' && i.estudianteId !== student.id,
      ).length;
      const full = group._count.inscripciones + reservas >= group.cupo && !offered;
      const reason = duplicate
        ? 'Ya tienes una inscripción a esta asignatura en el periodo.'
        : choqueHorario
          ? 'El horario choca con otra asignatura inscrita en el periodo.'
          : full
            ? 'El grupo ya no tiene lugares disponibles.'
            : completedPreviously && !canRepeat
              ? 'La política de este periodo no permite reinscribirse a una asignatura aprobada.'
              : this.environment.EXIGIR_PRERREQUISITOS && pendingRequirements.length > 0
                ? `Acredita primero: ${pendingRequirements.map((id) => requirementNames.get(id)).join(', ')}.`
                : null;
      return {
        grupoId: group.id,
        clave: group.clave,
        cupo: group.cupo,
        ocupacion: group._count.inscripciones,
        creditos: group.planAsignatura.creditos.toFixed(2),
        plan: group.planAsignatura.plan,
        asignatura: group.planAsignatura.asignatura,
        periodo: {
          ...group.periodo,
          inicio: group.periodo.inicio.toISOString().slice(0, 10),
          fin: group.periodo.fin.toISOString().slice(0, 10),
          inscripcionInicio: group.periodo.inscripcionInicio.toISOString(),
          inscripcionFin: group.periodo.inscripcionFin.toISOString(),
        },
        docente: group.docente,
        puedeInscribirse: reason === null,
        motivo: reason,
        enListaEspera: offers.some(
          (i) =>
            i.grupoId === group.id && i.estudianteId === student.id && i.estado === 'ESPERANDO',
        ),
        tieneCupoReservado: offered,
      };
    });
    if (!paginated) return items;
    const total = await this.database.client.grupo.count({ where });
    return { items, page, pageSize, total };
  }

  async crear(input: unknown, actor: AuthActor) {
    const { grupoId } = parseEnrollment(input);
    return this.colaGrupos.ejecutar(grupoId, () => this.crearConReintentos(grupoId, actor));
  }

  private async crearConReintentos(grupoId: string, actor: AuthActor) {
    const maxAttempts = 20;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.database.transaction(
          async (tx) => {
            // Orden fijo: primero persona/usuario, después grupo; así las rutas de matrícula
            // no compiten con el cambio de cupo de E05 en distinto orden.
            await tx.$queryRaw`
              SELECT e."id"
              FROM "Estudiante" e
              JOIN "Usuario" u ON u."id" = e."usuarioId"
              WHERE e."usuarioId" = ${actor.userId}::uuid AND u."activo" = true
              FOR UPDATE OF e, u
            `;
            const student = await this.studentProfile(tx, actor.userId);
            await tx.$queryRaw`SELECT "id" FROM "Grupo" WHERE "id" = ${grupoId}::uuid FOR UPDATE`;
            const group = await tx.grupo.findUnique({
              where: { id: grupoId },
              include: offerInclude,
            });
            if (!group) throw new NotFoundException('El grupo seleccionado no existe.');
            this.assertGroupEligibility(group, student.planId, this.now());

            const duplicate = await tx.inscripcion.findUnique({
              where: {
                estudianteId_asignaturaId_periodoId: {
                  estudianteId: student.id,
                  asignaturaId: group.asignaturaId,
                  periodoId: group.periodoId,
                },
              },
              select: { id: true, estado: true },
            });
            if (duplicate) {
              throw new ConflictException(
                'Ya tienes una inscripción registrada a esta asignatura en el periodo.',
              );
            }

            const reservas = await tx.listaEspera.findMany({
              where: { grupoId, estado: 'OFRECIDO' },
              select: { estudianteId: true },
            });
            const occupancy = await tx.inscripcion.count({
              where: { grupoId: group.id, estado: { not: 'CANCELADA' } },
            });
            const approved = await this.approvedSubjects(tx, student.id, student.planId);
            if (
              occupancy + reservas.filter((r) => r.estudianteId !== student.id).length >=
              group.cupo
            ) {
              throw new ConflictException('El grupo ya no tiene lugares disponibles.');
            }
            if (
              approved.has(group.asignaturaId) &&
              !group.periodo.politica.permiteReinscripcionAprobada
            ) {
              throw new ConflictException(
                'La política de este periodo no permite reinscribirse a una asignatura aprobada.',
              );
            }
            await this.assertPrerequisites(tx, group.planId, group.asignaturaId, approved);
            await this.assertHorariosDisponibles(tx, student.id, group.periodoId, group.horarios);

            const created = await tx.inscripcion.create({
              data: {
                estudianteId: student.id,
                planId: group.planId,
                grupoId: group.id,
                asignaturaId: group.asignaturaId,
                periodoId: group.periodoId,
                politicaId: group.politicaId,
                creditosSnapshot: group.planAsignatura.creditos,
              },
              include: enrollmentInclude,
            });
            await tx.listaEspera.updateMany({
              where: {
                grupoId,
                estudianteId: student.id,
                estado: { in: ['ESPERANDO', 'OFRECIDO'] },
              },
              data: { estado: 'ATENDIDO' },
            });
            await tx.notificacion.create({
              data: {
                usuarioId: actor.userId,
                titulo: 'Matrícula confirmada',
                mensaje: `Inscripción completada en el grupo ${group.clave}.`,
              },
            });
            await tx.auditoria.create({
              data: {
                actorId: actor.userId,
                accion: 'CREAR',
                recurso: 'Inscripcion',
                recursoId: created.id,
                posterior: {
                  estudianteId: student.id,
                  grupoId: group.id,
                  asignaturaId: group.asignaturaId,
                  periodoId: group.periodoId,
                  estado: 'PENDIENTE',
                  creditosSnapshot: group.planAsignatura.creditos.toFixed(2),
                },
              },
            });
            return this.serializeEnrollment(created);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 },
        );
      } catch (error) {
        if (isRetryable(error) && attempt < maxAttempts) {
          const maxDelay = Math.min(200, attempt * 20);
          await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * maxDelay));
          continue;
        }
        if (isRetryable(error)) {
          throw new ConflictException(
            'La matrícula coincidió con otro cambio. Vuelve a intentarlo en unos segundos.',
          );
        }
        if (
          error instanceof BadRequestException ||
          error instanceof ForbiddenException ||
          error instanceof ConflictException ||
          error instanceof NotFoundException
        ) {
          throw error;
        }
        if (errorCode(error) === 'P2002') {
          throw new ConflictException(
            'Ya tienes una inscripción registrada a esta asignatura en el periodo.',
          );
        }
        if (['P2003', 'P2004', 'P2010'].includes(errorCode(error) ?? '')) {
          throw new ConflictException('La oferta cambió mientras se procesaba la matrícula.');
        }
        throw error;
      }
    }
    throw new ConflictException('No se pudo completar la matrícula. Intenta nuevamente.');
  }

  async misListasEspera(actor: AuthActor) {
    const student = await this.studentProfile(this.database.client, actor.userId);
    return this.database.client.listaEspera.findMany({
      where: { estudianteId: student.id },
      include: {
        grupo: {
          select: {
            clave: true,
            periodo: { select: { nombre: true } },
            planAsignatura: { select: { asignatura: { select: { nombre: true } } } },
          },
        },
      },
      orderBy: { creadoEn: 'desc' },
      take: 100,
    });
  }

  async unirseListaEspera(input: unknown, actor: AuthActor) {
    const { grupoId } = parseEnrollment(input);
    return this.colaGrupos.ejecutar(grupoId, () =>
      this.database.transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "Grupo" WHERE "id" = ${grupoId}::uuid FOR UPDATE`;
          const student = await this.studentProfile(tx, actor.userId);
          const group = await tx.grupo.findUnique({
            where: { id: grupoId },
            include: offerInclude,
          });
          if (!group) throw new NotFoundException('Grupo inexistente.');
          this.assertGroupEligibility(group, student.planId, this.now());
          const duplicate = await tx.inscripcion.findUnique({
            where: {
              estudianteId_asignaturaId_periodoId: {
                estudianteId: student.id,
                asignaturaId: group.asignaturaId,
                periodoId: group.periodoId,
              },
            },
          });
          if (duplicate)
            throw new ConflictException('Ya tienes una matrícula para esta asignatura y periodo.');
          const approved = await this.approvedSubjects(tx, student.id, student.planId);
          if (
            approved.has(group.asignaturaId) &&
            !group.periodo.politica.permiteReinscripcionAprobada
          )
            throw new ConflictException('La asignatura ya fue aprobada.');
          await this.assertPrerequisites(tx, group.planId, group.asignaturaId, approved);
          await this.assertHorariosDisponibles(tx, student.id, group.periodoId, group.horarios);
          const enrolled = await tx.inscripcion.count({
            where: { grupoId, estado: { not: 'CANCELADA' } },
          });
          const offered = await tx.listaEspera.count({ where: { grupoId, estado: 'OFRECIDO' } });
          if (enrolled + offered < group.cupo)
            throw new ConflictException('Hay cupo disponible: utiliza la matrícula regular.');
          const previous = await tx.listaEspera.findUnique({
            where: { grupoId_estudianteId: { grupoId, estudianteId: student.id } },
          });
          if (previous && previous.estado !== 'CANCELADO')
            throw new ConflictException('Ya estás en la lista de espera del grupo.');
          const item = previous
            ? await tx.listaEspera.update({
                where: { id: previous.id },
                data: { estado: 'ESPERANDO', creadoEn: new Date() },
              })
            : await tx.listaEspera.create({ data: { grupoId, estudianteId: student.id } });
          await tx.auditoria.create({
            data: {
              actorId: actor.userId,
              accion: 'UNIRSE_ESPERA',
              recurso: 'ListaEspera',
              recursoId: item.id,
            },
          });
          return item;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  async salirListaEspera(idInput: string, actor: AuthActor) {
    const id = idSchema.parse(idInput);
    const student = await this.studentProfile(this.database.client, actor.userId);
    const item = await this.database.client.listaEspera.findFirst({
      where: { id, estudianteId: student.id, estado: { in: ['ESPERANDO', 'OFRECIDO'] } },
    });
    if (!item) throw new NotFoundException('No tienes esa reserva activa.');
    return this.colaGrupos.ejecutar(item.grupoId, () =>
      this.database.transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "Grupo" WHERE "id" = ${item.grupoId}::uuid FOR UPDATE`;
          const saved = await tx.listaEspera.updateMany({
            where: { id, estudianteId: student.id, estado: { in: ['ESPERANDO', 'OFRECIDO'] } },
            data: { estado: 'CANCELADO' },
          });
          if (!saved.count) throw new ConflictException('La lista ya cambió.');
          if (item.estado === 'OFRECIDO') await this.ofrecerSiguiente(tx, item.grupoId);
          return { ok: true };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  private async ofrecerSiguiente(tx: Prisma.TransactionClient, grupoId: string) {
    const group = await tx.grupo.findUniqueOrThrow({
      where: { id: grupoId },
      include: { periodo: true },
    });
    if (
      group.periodo.estado !== 'ABIERTO' ||
      this.now() < group.periodo.inscripcionInicio ||
      this.now() >= group.periodo.inscripcionFin
    )
      return;
    const [occupancy, offers] = await Promise.all([
      tx.inscripcion.count({ where: { grupoId, estado: { not: 'CANCELADA' } } }),
      tx.listaEspera.count({ where: { grupoId, estado: 'OFRECIDO' } }),
    ]);
    if (occupancy + offers >= group.cupo) return;
    const next = await tx.listaEspera.findFirst({
      where: { grupoId, estado: 'ESPERANDO' },
      include: { estudiante: true },
      orderBy: [{ creadoEn: 'asc' }, { id: 'asc' }],
    });
    if (!next) return;
    await tx.listaEspera.update({ where: { id: next.id }, data: { estado: 'OFRECIDO' } });
    await tx.notificacion.create({
      data: {
        usuarioId: next.estudiante.usuarioId,
        titulo: 'Se liberó un cupo',
        mensaje: `Tienes un cupo reservado en el grupo ${group.clave}; confirma tu matrícula mientras esté abierto el periodo.`,
      },
    });
  }

  async cancelarInscripcion(idInput: string, actor: AuthActor) {
    const id = idSchema.parse(idInput);
    const student = await this.studentProfile(this.database.client, actor.userId);
    const original = await this.database.client.inscripcion.findFirst({
      where: { id, estudianteId: student.id },
      select: { grupoId: true },
    });
    if (!original) throw new NotFoundException('Inscripción no encontrada.');
    return this.colaGrupos.ejecutar(original.grupoId, () =>
      this.database.transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "Grupo" WHERE "id" = ${original.grupoId}::uuid FOR UPDATE`;
          const inscription = await tx.inscripcion.findFirst({
            where: { id, estudianteId: student.id },
            include: { grupo: { include: { periodo: { include: { politica: true } } } } },
          });
          if (!inscription || inscription.estado !== 'PENDIENTE')
            throw new ConflictException(
              'Solo pueden cancelarse matrículas pendientes de calificación.',
            );
          const { periodo } = inscription.grupo;
          if (
            !(
              periodo.permiteCancelacionEstudiante ?? periodo.politica.permiteCancelacionEstudiante
            ) ||
            periodo.estado !== 'ABIERTO' ||
            this.now() < periodo.inscripcionInicio ||
            this.now() >= periodo.inscripcionFin
          )
            throw new ForbiddenException(
              'La política o el periodo no permiten cancelar esta matrícula.',
            );
          await tx.inscripcion.update({ where: { id }, data: { estado: 'CANCELADA' } });
          await this.ofrecerSiguiente(tx, original.grupoId);
          await tx.notificacion.create({
            data: {
              usuarioId: actor.userId,
              titulo: 'Matrícula cancelada',
              mensaje: `Se canceló tu inscripción al grupo ${inscription.grupo.clave}.`,
            },
          });
          await tx.auditoria.create({
            data: {
              actorId: actor.userId,
              accion: 'CANCELAR_MATRICULA',
              recurso: 'Inscripcion',
              recursoId: id,
            },
          });
          return { ok: true };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  private async studentProfile(
    client: Prisma.TransactionClient | DatabaseService['client'],
    userId: string,
  ) {
    const student = await client.estudiante.findUnique({
      where: { usuarioId: userId },
      select: { id: true, planId: true, estado: true, usuario: { select: { activo: true } } },
    });
    if (!student) throw new NotFoundException('No se encontró un perfil de estudiante.');
    if (!student.usuario.activo || student.estado !== 'ACTIVO') {
      throw new ForbiddenException('El perfil de estudiante no está activo.');
    }
    return student;
  }

  private assertGroupEligibility(group: OfferRecord, studentPlanId: string, now: Date) {
    if (group.planId !== studentPlanId) {
      throw new ForbiddenException('El grupo no corresponde a tu plan de estudio.');
    }
    if (
      !group.activo ||
      !group.planAsignatura.plan.activo ||
      !group.planAsignatura.plan.programa.activo ||
      !group.planAsignatura.asignatura.activo
    ) {
      throw new ConflictException('El grupo, plan o asignatura ya no está disponible.');
    }
    if (!group.docente.activo) throw new ConflictException('El docente del grupo no está activo.');
    if (group.periodo.estado !== 'ABIERTO') {
      throw new ConflictException('El periodo de inscripción no está abierto.');
    }
    if (now < group.periodo.inscripcionInicio || now >= group.periodo.inscripcionFin) {
      throw new ConflictException('La ventana de inscripción está cerrada.');
    }
  }

  private async assertHorariosDisponibles(
    tx: Prisma.TransactionClient,
    estudianteId: string,
    periodoId: string,
    horarios: Array<{ diaSemana: number; inicioMinuto: number; finMinuto: number }>,
  ) {
    if (!horarios.length) return;
    const actuales = await tx.inscripcion.findMany({
      where: { estudianteId, periodoId, estado: { not: 'CANCELADA' } },
      select: { grupo: { select: { clave: true, horarios: true } } },
    });
    const choque = actuales.find((inscripcion) =>
      inscripcion.grupo.horarios.some((h) => horarios.some((n) => seTraslapan(n, h))),
    );
    if (choque)
      throw new ConflictException(`El horario se traslapa con el grupo ${choque.grupo.clave}.`);
  }

  private async approvedSubjects(
    client: Prisma.TransactionClient | DatabaseService['client'],
    studentId: string,
    planId: string,
  ) {
    const attempts = await client.inscripcion.findMany({
      where: {
        estudianteId: studentId,
        planId,
        estado: 'CALIFICADA',
        notaFinal: { not: null },
      },
      select: {
        asignaturaId: true,
        notaFinal: true,
        grupo: {
          select: {
            periodo: { select: { politica: { select: { minimaAprobatoria: true } } } },
          },
        },
      },
    });
    return new Set(
      attempts
        .filter(
          (attempt) =>
            attempt.notaFinal !== null &&
            attempt.notaFinal.greaterThanOrEqualTo(
              attempt.grupo.periodo.politica.minimaAprobatoria,
            ),
        )
        .map((attempt) => attempt.asignaturaId),
    );
  }

  private async assertPrerequisites(
    tx: Prisma.TransactionClient,
    planId: string,
    asignaturaId: string,
    approved: Set<string>,
  ) {
    if (!this.environment.EXIGIR_PRERREQUISITOS) return;
    const prerequisites = await tx.prerrequisito.findMany({
      where: { planId, asignaturaId },
      include: { requerida: { select: { asignatura: { select: { nombre: true } } } } },
    });
    const missing = prerequisites.filter((item) => !approved.has(item.requeridaId));
    if (missing.length) {
      throw new ConflictException(
        `No puedes inscribirte todavía. Acredita primero: ${missing.map((item) => item.requerida.asignatura.nombre).join(', ')}.`,
      );
    }
  }

  private serializeEnrollment(item: EnrollmentRecord) {
    return {
      id: item.id,
      estado: item.estado,
      notaFinal: item.notaFinal?.toFixed(3) ?? null,
      creditosSnapshot: item.creditosSnapshot.toFixed(2),
      creadoEn: item.creadoEn.toISOString(),
      puedeCancelarse:
        item.estado === 'PENDIENTE' &&
        item.grupo.periodo.estado === 'ABIERTO' &&
        (item.grupo.periodo.permiteCancelacionEstudiante ??
          item.grupo.periodo.politica.permiteCancelacionEstudiante) &&
        this.now() >= item.grupo.periodo.inscripcionInicio &&
        this.now() < item.grupo.periodo.inscripcionFin,
      grupo: {
        id: item.grupo.id,
        clave: item.grupo.clave,
        asignatura: item.grupo.planAsignatura.asignatura,
        periodo: {
          id: item.grupo.periodo.id,
          clave: item.grupo.periodo.clave,
          nombre: item.grupo.periodo.nombre,
          inicio: item.grupo.periodo.inicio.toISOString().slice(0, 10),
        },
        docente: item.grupo.docente,
      },
    };
  }
}
