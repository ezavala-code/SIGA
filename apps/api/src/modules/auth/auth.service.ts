import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import { ENVIRONMENT, type Environment } from '../../config/environment.js';
import { DatabaseService } from '../../database/database.service.js';
import type { AuthActor } from './auth.types.js';

const credentials = z
  .object({
    correo: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1).max(128),
  })
  .strict();

@Injectable()
export class AuthService {
  private readonly key: Uint8Array;
  private readonly dummyHash: Promise<string>;

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ENVIRONMENT) private readonly environment: Environment,
  ) {
    this.key = Buffer.from(environment.JWT_SECRET, 'base64url');
    // Compara también cuando la cuenta no existe o aún tiene el hash inactivo de E02.
    this.dummyHash = bcrypt.hash('cuenta-inexistente', 12);
  }

  async login(input: unknown) {
    const parsed = credentials.safeParse(input);
    if (!parsed.success) throw new UnauthorizedException('Credenciales inválidas.');
    const { correo, password } = parsed.data;
    const user = await this.database.client.usuario.findUnique({ where: { correo } });
    const hash = user?.passwordHash.startsWith('$2') ? user.passwordHash : await this.dummyHash;
    const matches = await bcrypt.compare(password, hash);
    if (!matches || !user?.activo || !user.passwordHash.startsWith('$2')) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }
    const expiresAt = new Date(Date.now() + this.environment.JWT_TTL_SECONDS * 1000);
    const session = await this.database.transaction(async (tx) => {
      const current = await tx.usuario.findUnique({
        where: { id: user.id },
        select: { activo: true },
      });
      if (!current?.activo) throw new UnauthorizedException('Credenciales inválidas.');
      const created = await tx.sesion.create({ data: { usuarioId: user.id, expiraEn: expiresAt } });
      await tx.auditoria.create({
        data: {
          actorId: user.id,
          accion: 'INICIAR_SESION',
          recurso: 'Sesion',
          recursoId: created.id,
        },
      });
      return created;
    });
    const token = await new SignJWT({ sid: session.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('siga')
      .setAudience('siga-web')
      .setSubject(user.id)
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(this.key);
    const actor: AuthActor = {
      userId: user.id,
      sessionId: session.id,
      rol: user.rol,
      correo: user.correo,
    };
    return { token, actor, csrfToken: this.csrfToken(session.id) };
  }

  async authenticate(token: string): Promise<AuthActor | null> {
    let payload;
    try {
      ({ payload } = await jwtVerify(token, this.key, {
        issuer: 'siga',
        audience: 'siga-web',
        algorithms: ['HS256'],
      }));
    } catch {
      return null;
    }
    if (!payload.sub || typeof payload.sid !== 'string' || !/^[0-9a-f-]{36}$/.test(payload.sid))
      return null;
    const session = await this.database.client.sesion.findUnique({
      where: { id: payload.sid },
      include: { usuario: { select: { id: true, correo: true, rol: true, activo: true } } },
    });
    if (
      !session ||
      session.usuarioId !== payload.sub ||
      session.revocadaEn ||
      session.expiraEn.getTime() <= Date.now() ||
      !session.usuario.activo
    )
      return null;
    return {
      userId: session.usuario.id,
      sessionId: session.id,
      rol: session.usuario.rol,
      correo: session.usuario.correo,
    };
  }

  csrfToken(sessionId: string) {
    return createHmac('sha256', this.key).update(`csrf:${sessionId}`).digest('base64url');
  }

  validCsrf(sessionId: string, submitted: unknown) {
    if (typeof submitted !== 'string') return false;
    const expected = Buffer.from(this.csrfToken(sessionId));
    const actual = Buffer.from(submitted);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  async logout(actor: AuthActor) {
    await this.database.transaction(async (tx) => {
      const updated = await tx.sesion.updateMany({
        where: { id: actor.sessionId, usuarioId: actor.userId, revocadaEn: null },
        data: { revocadaEn: new Date() },
      });
      if (updated.count)
        await tx.auditoria.create({
          data: {
            actorId: actor.userId,
            accion: 'CERRAR_SESION',
            recurso: 'Sesion',
            recursoId: actor.sessionId,
          },
        });
    });
  }

  async profile(actor: AuthActor) {
    const person =
      actor.rol === 'ESTUDIANTE'
        ? await this.database.client.estudiante.findUnique({
            where: { usuarioId: actor.userId },
            select: { id: true, nombre: true, matricula: true },
          })
        : actor.rol === 'DOCENTE'
          ? await this.database.client.docente.findUnique({
              where: { usuarioId: actor.userId },
              select: { id: true, nombre: true, numeroEmpleado: true },
            })
          : null;
    return {
      id: actor.userId,
      correo: actor.correo,
      rol: actor.rol,
      persona: person,
      csrfToken: this.csrfToken(actor.sessionId),
    };
  }

  async user(userId: string) {
    if (!/^[0-9a-f-]{36}$/.test(userId)) return null;
    return this.database.client.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        correo: true,
        rol: true,
        activo: true,
      },
    });
  }

  async users(input: unknown) {
    const parsed = z
      .object({
        q: z.string().trim().max(120).optional(),
        page: z.coerce.number().int().min(1).max(100000).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
      })
      .safeParse(input);
    if (!parsed.success)
      throw new BadRequestException('Los parámetros de búsqueda no son válidos.');
    const { q, page, pageSize } = parsed.data;
    const where = {
      activo: true,
      ...(q ? { correo: { contains: q, mode: 'insensitive' as const } } : {}),
    };
    const legacy = Object.keys(input as object).length === 0;
    const items = await this.database.client.usuario.findMany({
      where,
      select: { id: true, correo: true, rol: true, activo: true },
      orderBy: { correo: 'asc' },
      skip: legacy ? undefined : (page - 1) * pageSize,
      take: legacy ? 50 : pageSize,
    });
    if (legacy) return items;
    const total = await this.database.client.usuario.count({ where });
    return { items, page, pageSize, total };
  }
}
