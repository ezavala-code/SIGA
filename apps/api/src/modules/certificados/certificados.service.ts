import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service.js';
import { ENVIRONMENT, type Environment } from '../../config/environment.js';
import type { AuthActor } from '../auth/auth.types.js';
import {
  CaracterNoAdmitidoEnConstancia,
  generarPdfConstancia,
  precargarFuentesConstancia,
  validarCaracteresConstancia,
  type CertificadoInstantanea,
} from './certificado.pdf.js';

const idSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const codeSchema = z.string().regex(/^[0-9a-f]{32}$/);
const revokeSchema = z.object({ motivo: z.string().trim().min(1).max(500) }).strict();
const listSchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      message: 'Los datos de la constancia no son válidos.',
      errores: result.error.flatten().fieldErrors,
    });
  }
  return result.data;
}

function isKnown(error: unknown): error is Error {
  return (
    error instanceof BadRequestException ||
    error instanceof ConflictException ||
    error instanceof ForbiddenException ||
    error instanceof NotFoundException
  );
}

function getCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: unknown }).code
    : undefined;
}

function nombreAbreviado(value: string) {
  const [first = '', ...rest] = value.trim().split(/\s+/);
  return rest.length
    ? `${first} ${rest.map((part) => `${part.slice(0, 1).toUpperCase()}.`).join(' ')}`
    : first;
}

function checksum(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
}

function compareChecksum(actual: string, expected: string) {
  const left = Buffer.from(actual, 'hex');
  const right = Buffer.from(expected, 'hex');
  return left.length === 32 && right.length === 32 && timingSafeEqual(left, right);
}

@Injectable()
export class CertificadosService {
  private readonly storageDirectory: string;

  constructor(
    private readonly database: DatabaseService,
    @Inject(ENVIRONMENT) private readonly environment: Environment,
  ) {
    this.storageDirectory = resolve(environment.CERTIFICATES_DIR);
  }

  async emitirPropio(actor: AuthActor, tipo: 'ESTUDIOS' | 'CONCLUSION' = 'ESTUDIOS') {
    const student = await this.database.client.estudiante.findUnique({
      where: { usuarioId: actor.userId },
      select: { id: true },
    });
    if (!student) {
      throw new ForbiddenException('Se requiere un perfil de estudiante.');
    }
    return this.emitir(student.id, actor, undefined, tipo);
  }

  async emitirParaEstudiante(
    estudianteInput: string,
    actor: AuthActor,
    tipo: 'ESTUDIOS' | 'CONCLUSION' = 'ESTUDIOS',
  ) {
    const estudianteId = parse(idSchema, estudianteInput);
    const student = await this.database.client.estudiante.findUnique({
      where: { id: estudianteId },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('No se encontró el perfil del estudiante.');
    }
    return this.emitir(student.id, actor, undefined, tipo);
  }

  async recuperar(certificadoInput: string, actor: AuthActor) {
    const id = parse(idSchema, certificadoInput);
    const certificate = await this.database.client.certificado.findUnique({
      where: { id },
      select: { estudianteId: true },
    });
    if (!certificate) throw new NotFoundException('No se encontró la constancia.');
    await this.assertOwnerOrAdmin(certificate.estudianteId, actor);
    return this.finalizarEmision(id, actor);
  }

  async reemitir(certificadoInput: string, actor: AuthActor) {
    const id = parse(idSchema, certificadoInput);
    const previous = await this.database.client.certificado.findUnique({
      where: { id },
      select: {
        id: true,
        estudianteId: true,
        estado: true,
        tipo: true,
        reemplazo: { select: { id: true, estado: true } },
      },
    });
    if (!previous) throw new NotFoundException('No se encontró la constancia.');
    await this.assertOwnerOrAdmin(previous.estudianteId, actor);
    if (previous.estado !== 'REVOCADO') {
      throw new ConflictException('Solo se puede reemitir una constancia revocada.');
    }
    if (previous.reemplazo) {
      if (['PENDIENTE', 'FALLIDO'].includes(previous.reemplazo.estado)) {
        return this.finalizarEmision(previous.reemplazo.id, actor);
      }
      throw new ConflictException('Esta constancia ya tiene una reemisión vinculada.');
    }
    return this.emitir(previous.estudianteId, actor, previous.id, previous.tipo);
  }

  async listarPropios(actor: AuthActor) {
    const student = await this.database.client.estudiante.findUnique({
      where: { usuarioId: actor.userId },
      select: { id: true },
    });
    if (!student) throw new ForbiddenException('Se requiere un perfil de estudiante.');
    const certificates = await this.database.client.certificado.findMany({
      where: { estudianteId: student.id },
      orderBy: [{ solicitadoEn: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        tipo: true,
        codigo: true,
        estado: true,
        solicitadoEn: true,
        emitidoEn: true,
        revocadoEn: true,
        motivoRevocacion: true,
        reemplazaId: true,
        reemplazo: { select: { id: true, codigo: true } },
      },
    });
    return { items: certificates };
  }

  async listarAdministracion(queryInput: unknown) {
    const { q, page, pageSize } = parse(listSchema, queryInput);
    const where = q
      ? {
          OR: [
            { codigo: { contains: q.toLowerCase() } },
            { estudiante: { nombre: { contains: q, mode: 'insensitive' as const } } },
            { estudiante: { matricula: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.database.client.certificado.findMany({
        where,
        orderBy: [{ solicitadoEn: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          tipo: true,
          codigo: true,
          estado: true,
          solicitadoEn: true,
          emitidoEn: true,
          revocadoEn: true,
          motivoRevocacion: true,
          reemplazaId: true,
          reemplazo: { select: { id: true, codigo: true } },
          estudiante: { select: { id: true, nombre: true, matricula: true } },
          instantanea: true,
        },
      }),
      this.database.client.certificado.count({ where }),
    ]);
    return {
      items: items.map(({ instantanea, estudiante, ...item }) => {
        const snapshot = instantanea as unknown as CertificadoInstantanea;
        return {
          ...item,
          estudiante,
          programa: snapshot.programa,
        };
      }),
      page,
      pageSize,
      total,
    };
  }

  async verificar(codigoInput: string) {
    const result = codeSchema.safeParse(codigoInput);
    if (!result.success) return { estado: 'INEXISTENTE' as const };
    const certificate = await this.database.client.certificado.findUnique({
      where: { codigo: result.data },
      select: {
        codigo: true,
        tipo: true,
        estado: true,
        emitidoEn: true,
        instantanea: true,
      },
    });
    if (!certificate || !['EMITIDO', 'REVOCADO'].includes(certificate.estado)) {
      return { estado: 'INEXISTENTE' as const };
    }
    const snapshot = certificate.instantanea as unknown as CertificadoInstantanea;
    return {
      codigo: certificate.codigo,
      tipo: certificate.tipo,
      fechaEmision: certificate.emitidoEn?.toISOString() ?? snapshot.emitidoEn,
      programa: snapshot.programa.nombre,
      nombre: nombreAbreviado(snapshot.estudiante.nombre),
      estado: certificate.estado === 'REVOCADO' ? ('REVOCADO' as const) : ('VIGENTE' as const),
    };
  }

  async descargarPdf(certificadoInput: string, actor: AuthActor) {
    const id = parse(idSchema, certificadoInput);
    const certificate = await this.database.client.certificado.findUnique({
      where: { id },
      select: {
        id: true,
        estudianteId: true,
        codigo: true,
        estado: true,
        archivoSha256: true,
        archivoRuta: true,
        emitidoEn: true,
      },
    });
    if (!certificate || !['EMITIDO', 'REVOCADO'].includes(certificate.estado)) {
      throw new NotFoundException('No se encontró una constancia emitida.');
    }
    await this.assertOwnerOrAdmin(certificate.estudianteId, actor);
    if (!certificate.archivoSha256)
      throw new ConflictException('La constancia no tiene un archivo verificable.');
    const filename = certificate.archivoRuta ? basename(certificate.archivoRuta) : '';
    const uniquePath = new RegExp(`^${certificate.id}\\.[0-9a-f-]{36}\\.pdf$`, 'i');
    if (filename !== `${certificate.id}.pdf` && !uniquePath.test(filename)) {
      throw new ConflictException('La ruta de la constancia no es válida.');
    }
    const file = resolve(this.storageDirectory, filename);
    let bytes: Buffer;
    try {
      bytes = await readFile(file);
    } catch {
      await this.auditIntegrityFailure(certificate.id, actor, 'ARCHIVO_AUSENTE');
      throw new ServiceUnavailableException('El archivo de la constancia no está disponible.');
    }
    if (!compareChecksum(checksum(bytes), certificate.archivoSha256)) {
      await this.auditIntegrityFailure(certificate.id, actor, 'HASH_DIFERENTE');
      throw new ConflictException('No se pudo verificar la integridad del archivo.');
    }
    return { bytes, codigo: certificate.codigo, estado: certificate.estado };
  }

  async revocar(certificadoInput: string, bodyInput: unknown, actor: AuthActor) {
    const id = parse(idSchema, certificadoInput);
    const { motivo } = parse(revokeSchema, bodyInput);
    try {
      return await this.database.transaction(
        async (tx) => {
          const current = await tx.certificado.findUnique({
            where: { id },
            select: { id: true, estudianteId: true, codigo: true, estado: true, emitidoEn: true },
          });
          if (!current || current.estado !== 'EMITIDO') {
            throw new NotFoundException('No se encontró una constancia vigente.');
          }
          const at = new Date();
          const updated = await tx.certificado.update({
            where: { id },
            data: { estado: 'REVOCADO', revocadoEn: at, motivoRevocacion: motivo },
            select: {
              id: true,
              codigo: true,
              estado: true,
              revocadoEn: true,
              motivoRevocacion: true,
            },
          });
          await tx.auditoria.create({
            data: {
              actorId: actor.userId,
              accion: 'REVOCAR_CERTIFICADO',
              recurso: 'Certificado',
              recursoId: id,
              motivo,
              anterior: {
                codigo: current.codigo,
                estado: current.estado,
                emitidoEn: current.emitidoEn?.toISOString(),
              },
              posterior: { estado: updated.estado, revocadoEn: at.toISOString() },
            },
          });
          return updated;
        },
        { maxWait: 20000, timeout: 20000 },
      );
    } catch (error) {
      if (isKnown(error)) throw error;
      if (getCode(error) === 'P2025' || getCode(error) === 'P2004') {
        throw new ConflictException('La constancia cambió antes de completar la revocación.');
      }
      throw error;
    }
  }

  private async emitir(
    estudianteId: string,
    actor: AuthActor,
    reemplazaId?: string,
    tipo: 'ESTUDIOS' | 'CONCLUSION' = 'ESTUDIOS',
  ) {
    const id = randomUUID();
    const codigo = randomBytes(16).toString('hex');
    const emitidoEn = new Date();
    try {
      await precargarFuentesConstancia();
      await this.database.transaction(
        async (tx) => {
          const student = await tx.estudiante.findUnique({
            where: { id: estudianteId },
            include: {
              plan: {
                include: { programa: true, asignaturas: { select: { asignaturaId: true } } },
              },
              inscripciones: {
                where: { estado: 'CALIFICADA' },
                orderBy: [{ creadoEn: 'asc' }, { id: 'asc' }],
                include: {
                  grupo: {
                    include: {
                      planAsignatura: { include: { asignatura: true } },
                      periodo: { include: { politica: true } },
                    },
                  },
                },
              },
            },
          });
          if (!student) {
            throw new NotFoundException('No se encontró el perfil del estudiante.');
          }
          if (tipo === 'CONCLUSION') {
            const materias = new Set(student.plan.asignaturas.map((a) => a.asignaturaId));
            const aprobadas = new Set(
              student.inscripciones
                .filter((i) => i.notaFinal?.gte(i.grupo.periodo.politica.minimaAprobatoria))
                .map((i) => i.asignaturaId),
            );
            if (!materias.size || [...materias].some((id) => !aprobadas.has(id))) {
              throw new ConflictException(
                'El certificado de conclusión requiere todas las asignaturas del plan aprobadas.',
              );
            }
          }
          if (student.inscripciones.length === 0) {
            throw new BadRequestException('No se puede emitir una constancia sin notas finales.');
          }
          if (reemplazaId) {
            const previous = await tx.certificado.findUnique({
              where: { id: reemplazaId },
              select: {
                id: true,
                estudianteId: true,
                estado: true,
                reemplazo: { select: { id: true } },
              },
            });
            if (
              !previous ||
              previous.estudianteId !== estudianteId ||
              previous.estado !== 'REVOCADO' ||
              previous.reemplazo
            ) {
              throw new ConflictException('La constancia anterior no admite esta reemisión.');
            }
          }
          const result: CertificadoInstantanea = {
            version: 1,
            codigo,
            tipo,
            emitidoEn: emitidoEn.toISOString(),
            estudiante: { nombre: student.nombre, matricula: student.matricula },
            plan: { nombre: student.plan.nombre, version: student.plan.version },
            programa: { clave: student.plan.programa.clave, nombre: student.plan.programa.nombre },
            calificaciones: student.inscripciones.map((enrollment) => {
              const minimum = enrollment.grupo.periodo.politica.minimaAprobatoria;
              const nota = enrollment.notaFinal!;
              return {
                periodoClave: enrollment.grupo.periodo.clave,
                periodoNombre: enrollment.grupo.periodo.nombre,
                asignaturaClave: enrollment.grupo.planAsignatura.asignatura.clave,
                asignaturaNombre: enrollment.grupo.planAsignatura.asignatura.nombre,
                notaFinal: nota.toFixed(3),
                creditos: enrollment.creditosSnapshot.toFixed(2),
                minimaAprobatoria: minimum.toFixed(3),
                resultado: nota.greaterThanOrEqualTo(minimum) ? 'APROBADA' : 'REPROBADA',
                politicaPropuesta: enrollment.grupo.periodo.politica.esPropuesta,
              };
            }),
          };
          await validarCaracteresConstancia(result);
          await tx.certificado.create({
            data: {
              id,
              estudianteId,
              tipo,
              codigo,
              estado: 'PENDIENTE',
              solicitadoEn: emitidoEn,
              instantanea: result,
              ...(reemplazaId ? { reemplazaId } : {}),
            },
          });
          return result;
        },
        { isolationLevel: 'Serializable', maxWait: 20000, timeout: 20000 },
      );
    } catch (error) {
      if (error instanceof CaracterNoAdmitidoEnConstancia) {
        throw new BadRequestException(
          'La constancia contiene caracteres que no se pueden representar. Revisa los datos académicos.',
        );
      }
      if (isKnown(error)) throw error;
      if (getCode(error) === 'P2002' || getCode(error) === 'P2034' || getCode(error) === 'P2004') {
        throw new ConflictException(
          'La constancia cambió o fue solicitada en paralelo; inténtalo de nuevo.',
        );
      }
      throw error;
    }

    return this.finalizarEmision(id, actor);
  }

  private async finalizarEmision(id: string, actor: AuthActor) {
    try {
      const initial = await this.database.client.certificado.findUnique({
        where: { id },
        select: { codigo: true, estado: true, instantanea: true },
      });
      if (!initial || !['PENDIENTE', 'FALLIDO'].includes(initial.estado)) {
        throw new ConflictException('La constancia ya fue finalizada o no existe.');
      }
      const pdf = await generarPdfConstancia(
        initial.instantanea as unknown as CertificadoInstantanea,
        `${this.environment.WEB_ORIGIN}/verificar/${initial.codigo}`,
      );
      return await this.database.transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Certificado" WHERE id = ${id}::uuid FOR UPDATE`;
          const pending = await tx.certificado.findUnique({
            where: { id },
            select: { id: true, codigo: true, estado: true, instantanea: true, reemplazaId: true },
          });
          if (!pending || !['PENDIENTE', 'FALLIDO'].includes(pending.estado)) {
            throw new ConflictException('La constancia ya fue finalizada o no existe.');
          }
          if (!isDeepStrictEqual(pending.instantanea, initial.instantanea)) {
            throw new ConflictException('La constancia cambió; vuelve a intentarlo.');
          }
          const snapshot = pending.instantanea as unknown as CertificadoInstantanea;
          const filePath = resolve(this.storageDirectory, `${id}.${randomUUID()}.pdf`);
          await mkdir(this.storageDirectory, { recursive: true, mode: 0o700 });
          // Cada intento usa una ruta propia: un timeout no puede sobrescribir un PDF ya confirmado.
          await writeFile(filePath, pdf, { flag: 'wx', mode: 0o600 });
          const hash = checksum(pdf);
          const certificate = await tx.certificado.update({
            where: { id },
            data: {
              estado: 'EMITIDO',
              emitidoEn: new Date(snapshot.emitidoEn),
              archivoRuta: filePath,
              archivoSha256: hash,
            },
            select: {
              id: true,
              tipo: true,
              codigo: true,
              estado: true,
              emitidoEn: true,
              archivoSha256: true,
            },
          });
          await tx.auditoria.create({
            data: {
              actorId: actor.userId,
              accion: pending.reemplazaId ? 'REEMITIR_CERTIFICADO' : 'EMITIR_CERTIFICADO',
              recurso: 'Certificado',
              recursoId: id,
              motivo: pending.reemplazaId ? `Reemisión de ${pending.reemplazaId}` : null,
              anterior: { estado: pending.estado },
              posterior: {
                estado: certificate.estado,
                codigo: pending.codigo,
                sha256: hash,
                reemplazaId: pending.reemplazaId,
              },
            },
          });
          return certificate;
        },
        { maxWait: 20000, timeout: 20000 },
      );
    } catch (error) {
      // El commit puede haber sido confirmado aunque la conexión haya fallado; no borrar el archivo.
      if (error instanceof CaracterNoAdmitidoEnConstancia) {
        throw new BadRequestException(
          'La constancia contiene caracteres que no se pueden representar. Revisa los datos académicos.',
        );
      }
      if (isKnown(error)) throw error;
      throw new ServiceUnavailableException(
        'No se pudo confirmar la emisión. Consulta el estado antes de volver a intentarlo.',
      );
    }
  }

  private async assertOwnerOrAdmin(estudianteId: string, actor: AuthActor) {
    if (actor.rol === 'ADMINISTRADOR') return;
    if (actor.rol !== 'ESTUDIANTE') throw new ForbiddenException('Acceso no permitido.');
    const student = await this.database.client.estudiante.findFirst({
      where: { id: estudianteId, usuarioId: actor.userId },
      select: { id: true },
    });
    if (!student) throw new ForbiddenException('La constancia pertenece a otro estudiante.');
  }

  private async auditIntegrityFailure(id: string, actor: AuthActor, issue: string) {
    await this.database.client.auditoria.create({
      data: {
        actorId: actor.userId,
        accion: 'FALLA_INTEGRIDAD_CERTIFICADO',
        recurso: 'Certificado',
        recursoId: id,
        motivo: issue,
        posterior: { resultado: 'DESCARGA_BLOQUEADA' },
      },
    });
  }
}
