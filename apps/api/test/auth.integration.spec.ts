import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';
import { createDatabaseClient } from '../src/database/client.js';
import { seedData, seedId } from '../src/database/seed-data.js';
import { parseEnvironment, requireTestDatabaseUrl } from '../src/config/environment.js';
import type { Prisma } from '../src/generated/prisma/client.js';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
const databaseUrl = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);
const env = parseEnvironment({
  NODE_ENV: 'test',
  DATABASE_URL: databaseUrl,
  WEB_ORIGIN: 'http://localhost:5173',
  JWT_SECRET: 'testingkeyabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH',
});
const client = createDatabaseClient(databaseUrl);
const rollback = new Error('Rollback autenticación');
jest.setTimeout(30000);
const password = 'ClaveFicticiaDePrueba_2026!';

type TestContext = {
  app: INestApplication;
  tx: Prisma.TransactionClient;
  id: (name: string) => string;
  correo: (name: string) => Promise<string>;
};

async function fixture(run: (context: TestContext) => Promise<void>) {
  const namespace = `auth-${randomUUID()}`;
  try {
    await client.$transaction(
      async (tx) => {
        await seedData(tx, namespace);
        const hash = await bcrypt.hash(password, 4);
        const id = (name: string) => seedId(namespace, name);
        for (const name of ['admin', 'docente1', 'docente2', 'estudiante1', 'estudiante2']) {
          await tx.usuario.update({
            where: { id: id(name) },
            data: { activo: true, passwordHash: hash },
          });
        }
        const module = await Test.createTestingModule({ imports: [AppModule.register(env)] })
          .overrideProvider(DatabaseService)
          .useValue({
            client: tx,
            transaction: async <T>(fn: (client: Prisma.TransactionClient) => Promise<T>) => {
              await tx.$executeRawUnsafe('SAVEPOINT auth_operation');
              try {
                const result = await fn(tx);
                await tx.$executeRawUnsafe('RELEASE SAVEPOINT auth_operation');
                return result;
              } catch (error) {
                await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT auth_operation');
                await tx.$executeRawUnsafe('RELEASE SAVEPOINT auth_operation');
                throw error;
              }
            },
          })
          .compile();
        const app = module.createNestApplication();
        await app.init();
        try {
          await run({
            app,
            tx,
            id,
            correo: async (name) => {
              const user = await tx.usuario.findUniqueOrThrow({ where: { id: id(name) } });
              return user.correo;
            },
          });
        } finally {
          await app.close();
        }
        throw rollback;
      },
      { isolationLevel: 'Serializable', timeout: 60000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

function cookie(response: request.Response) {
  const value = response.headers['set-cookie'];
  const first = Array.isArray(value) ? value[0] : value;
  expect(first).toContain('HttpOnly');
  expect(first).toContain('SameSite=Strict');
  return String(first).split(';')[0]!;
}

async function login(app: INestApplication, correo: string) {
  return request(app.getHttpServer())
    .post('/auth/login')
    .set('Origin', env.WEB_ORIGIN)
    .send({ correo, password })
    .expect(200);
}

afterAll(async () => {
  await client.$disconnect();
});

describe('RF-01 y RNF-01 con PostgreSQL real', () => {
  it('aplica la matriz de lectura por rol en las familias académicas', async () => {
    await fixture(async ({ app, id, correo }) => {
      const sessions = {
        admin: cookie(await login(app, await correo('admin'))),
        docente: cookie(await login(app, await correo('docente1'))),
        estudiante: cookie(await login(app, await correo('estudiante1'))),
      };
      const matrix = [
        ['/auth/usuarios', ['admin']],
        ['/catalogos/programas', ['admin']],
        ['/personas/estudiantes', ['admin']],
        ['/periodos', ['admin']],
        ['/grupos', ['admin']],
        ['/docentes/me/grupos', ['docente']],
        ['/matriculas/me', ['estudiante']],
        ['/matriculas/oferta', ['estudiante']],
        ['/estudiantes/me/calificaciones', ['estudiante']],
        ['/estudiantes/me/progreso', ['estudiante']],
        ['/certificados/me', ['estudiante']],
        ['/certificados', ['admin']],
        ['/reportes/grupos', ['admin']],
        ['/reportes/auditoria', ['admin']],
        [`/reportes/grupos/${id('intro-anterior')}/historial.csv`, ['admin', 'docente']],
      ] as const;
      for (const [path, allowed] of matrix) {
        await request(app.getHttpServer()).get(path).expect(401);
        for (const [role, session] of Object.entries(sessions)) {
          await request(app.getHttpServer())
            .get(path)
            .set('Cookie', session)
            .expect((allowed as readonly string[]).includes(role) ? 200 : 403);
        }
      }
    });
  });

  it('CP-01: acceso válido, cookie HttpOnly, CSRF y cierre efectivo', async () => {
    await fixture(async ({ app, tx, correo }) => {
      const signed = await login(app, await correo('estudiante1'));
      expect(signed.body.usuario.rol).toBe('ESTUDIANTE');
      expect(signed.body.usuario.sessionId).toBeUndefined();
      expect(signed.body.csrfToken).toEqual(expect.any(String));
      const sessionCookie = cookie(signed);
      const me = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', sessionCookie)
        .expect(200);
      expect(me.body.persona.nombre).toBe('Ana Ejemplo');
      expect(me.body.persona.matricula).toContain('DEMO-');
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', sessionCookie)
        .expect(403);
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', sessionCookie)
        .set('X-CSRF-Token', signed.body.csrfToken)
        .set('Origin', env.WEB_ORIGIN)
        .expect(204);
      await request(app.getHttpServer()).get('/auth/me').set('Cookie', sessionCookie).expect(401);
      expect(await tx.sesion.count({ where: { revocadaEn: { not: null } } })).toBe(1);
    });
  });

  it('rechaza clave incorrecta, cuenta ausente e inactiva sin revelar cuál existe', async () => {
    await fixture(async ({ app, correo }) => {
      const active = await correo('estudiante1');
      const inactive = await correo('estudiante3');
      const body = (mail: string) => ({ correo: mail, password: 'clave-equivocada' });
      const wrong = await request(app.getHttpServer())
        .post('/auth/login')
        .send(body(active))
        .expect(401);
      const missing = await request(app.getHttpServer())
        .post('/auth/login')
        .send(body('nadie@example.invalid'))
        .expect(401);
      const disabled = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ correo: inactive, password })
        .expect(401);
      expect(wrong.body.message).toBe(missing.body.message);
      expect(wrong.body.message).toBe(disabled.body.message);
      expect(wrong.headers['set-cookie']).toBeUndefined();
    });
  });

  it('limita intentos fallidos y rechaza origen ajeno', async () => {
    await fixture(async ({ app, correo }) => {
      const user = await correo('estudiante1');
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ correo: user, password: 'incorrecta' })
          .expect(401);
      }
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ correo: user, password })
        .expect(429);
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('Origin', 'https://ajeno.example')
        .send({ correo: user, password })
        .expect(403);
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('Sec-Fetch-Site', 'cross-site')
        .send({ correo: user, password })
        .expect(403);
    });
  });

  it('separa recursos propios y ajenos; solo el administrador lista cuentas', async () => {
    await fixture(async ({ app, id, correo }) => {
      const student = cookie(await login(app, await correo('estudiante1')));
      await request(app.getHttpServer()).get('/auth/usuarios').expect(401);
      await request(app.getHttpServer()).get('/auth/usuarios').set('Cookie', student).expect(403);
      await request(app.getHttpServer())
        .get(`/auth/usuarios/${id('estudiante1')}`)
        .set('Cookie', student)
        .expect(200);
      await request(app.getHttpServer())
        .get(`/auth/usuarios/${id('estudiante2')}`)
        .set('Cookie', student)
        .expect(403);
      const admin = cookie(await login(app, await correo('admin')));
      const list = await request(app.getHttpServer())
        .get('/auth/usuarios')
        .set('Cookie', admin)
        .expect(200);
      expect(list.body.map((user: { id: string }) => user.id)).toEqual(
        expect.arrayContaining(['admin', 'docente1', 'estudiante1', 'estudiante2'].map(id)),
      );
      expect(list.body.every((user: { activo: boolean }) => user.activo)).toBe(true);
      expect(JSON.stringify(list.body)).not.toContain('passwordHash');
      await request(app.getHttpServer())
        .get(`/auth/usuarios/${id('estudiante2')}`)
        .set('Cookie', admin)
        .expect(200);
    });
  });

  it('obtiene datos del docente y comprueba rol actual desde BD, ignorando rol falsificado en JWT', async () => {
    await fixture(async ({ app, tx, id, correo }) => {
      const teacher = cookie(await login(app, await correo('docente1')));
      const profile = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', teacher)
        .expect(200);
      expect(profile.body.persona.numeroEmpleado).toContain('DEMO-');
      const studentLogin = await login(app, await correo('estudiante1'));
      const session = await tx.sesion.findFirstOrThrow({ where: { usuarioId: id('estudiante1') } });
      const forged = await new SignJWT({ sid: session.id, rol: 'ADMINISTRADOR' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('siga')
        .setAudience('siga-web')
        .setSubject(id('estudiante1'))
        .setIssuedAt()
        .setExpirationTime('10m')
        .sign(Buffer.from(env.JWT_SECRET, 'base64url'));
      await request(app.getHttpServer())
        .get('/auth/usuarios')
        .set('Cookie', `siga_session=${forged}`)
        .expect(403);
      expect(studentLogin.body.usuario.rol).toBe('ESTUDIANTE');
    });
  });

  it('rechaza token vencido, sesión revocada y usuario desactivado', async () => {
    await fixture(async ({ app, tx, id, correo }) => {
      const first = cookie(await login(app, await correo('estudiante1')));
      const session = await tx.sesion.findFirstOrThrow({ where: { usuarioId: id('estudiante1') } });
      const expired = await new SignJWT({ sid: session.id })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('siga')
        .setAudience('siga-web')
        .setSubject(id('estudiante1'))
        .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
        .sign(Buffer.from(env.JWT_SECRET, 'base64url'));
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', `siga_session=${expired}`)
        .expect(401);
      await tx.sesion.update({ where: { id: session.id }, data: { revocadaEn: new Date() } });
      await request(app.getHttpServer()).get('/auth/me').set('Cookie', first).expect(401);
      const second = cookie(await login(app, await correo('estudiante1')));
      await tx.usuario.update({ where: { id: id('estudiante1') }, data: { activo: false } });
      await request(app.getHttpServer()).get('/auth/me').set('Cookie', second).expect(401);
    });
  });

  it('mantiene independientes dos sesiones; protege cierre contra CSRF', async () => {
    await fixture(async ({ app, correo }) => {
      const email = await correo('admin');
      const first = await login(app, email);
      const second = await login(app, email);
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookie(first))
        .set('X-CSRF-Token', 'falso')
        .expect(403);
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookie(first))
        .set('Origin', 'https://ajeno.example')
        .set('X-CSRF-Token', first.body.csrfToken)
        .expect(403);
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookie(first))
        .set('X-CSRF-Token', first.body.csrfToken)
        .expect(204);
      await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookie(second)).expect(200);
    });
  });
});

describe('Paginacion de cuentas activas', () => {
  it('alcanza cuentas posteriores a 50, filtra y conserva el acceso solo a administracion', async () => {
    await fixture(async ({ app, tx, correo }) => {
      const prefix = `paginacion-${randomUUID()}`;
      await tx.usuario.createMany({
        data: Array.from({ length: 61 }, (_, index) => ({
          correo: `${prefix}-${String(index).padStart(3, '0')}@demo.test`,
          passwordHash: 'inactivo',
          rol: 'ESTUDIANTE' as const,
          activo: true,
        })),
      });
      const admin = cookie(await login(app, await correo('admin')));
      const page = await request(app.getHttpServer())
        .get('/auth/usuarios')
        .query({ q: prefix, page: 3, pageSize: 25 })
        .set('Cookie', admin)
        .expect(200);
      expect(page.body.total).toBe(61);
      expect(page.body.items).toHaveLength(11);
      expect(page.body.items[10].correo).toContain('-060@');
      const legacy = await request(app.getHttpServer())
        .get('/auth/usuarios')
        .set('Cookie', admin)
        .expect(200);
      expect(Array.isArray(legacy.body)).toBe(true);
      expect(legacy.body.length).toBeLessThanOrEqual(50);
      await request(app.getHttpServer())
        .get('/auth/usuarios')
        .query({ page: 0 })
        .set('Cookie', admin)
        .expect(400);
      const student = cookie(await login(app, await correo('estudiante1')));
      await request(app.getHttpServer())
        .get('/auth/usuarios')
        .query({ q: prefix })
        .set('Cookie', student)
        .expect(403);
    });
  });

  it('PB-14: aplica la matriz completa de escritura (POST/PATCH/PUT) para sin sesión, rol no autorizado, CSRF, Origin y propiedad de recurso', async () => {
    await fixture(async ({ app, tx, id, correo }) => {
      const adminRes = await login(app, await correo('admin'));
      const docente1Res = await login(app, await correo('docente1'));
      const docente2Res = await login(app, await correo('docente2'));
      const estudiante1Res = await login(app, await correo('estudiante1'));
      const estudiante2Res = await login(app, await correo('estudiante2'));

      const sessions = {
        admin: { cookie: cookie(adminRes), csrf: adminRes.body.csrfToken as string },
        docente: { cookie: cookie(docente1Res), csrf: docente1Res.body.csrfToken as string },
        estudiante: {
          cookie: cookie(estudiante1Res),
          csrf: estudiante1Res.body.csrfToken as string,
        },
      };

      const writeMatrix: Array<{
        method: 'post' | 'patch' | 'put';
        path: string;
        allowed: Array<'admin' | 'docente' | 'estudiante'>;
        body: Record<string, unknown>;
      }> = [
        {
          method: 'post',
          path: '/catalogos/programas',
          allowed: ['admin'],
          body: { clave: 'PRG-MAT', nombre: 'Programa Matriz' },
        },
        {
          method: 'patch',
          path: `/catalogos/programas/${id('software')}`,
          allowed: ['admin'],
          body: { nombre: 'Software Matriz' },
        },
        {
          method: 'post',
          path: '/catalogos/asignaturas',
          allowed: ['admin'],
          body: { clave: 'ASG-MAT', nombre: 'Asignatura Matriz' },
        },
        {
          method: 'patch',
          path: `/catalogos/asignaturas/${id('intro')}`,
          allowed: ['admin'],
          body: { nombre: 'Intro Matriz' },
        },
        {
          method: 'post',
          path: '/catalogos/planes',
          allowed: ['admin'],
          body: { programaId: id('software'), version: 77, nombre: 'Plan Matriz' },
        },
        {
          method: 'patch',
          path: `/catalogos/planes/${id('plan-software')}`,
          allowed: ['admin'],
          body: { activo: true },
        },
        {
          method: 'post',
          path: `/catalogos/planes/${id('plan-software')}/nueva-version`,
          allowed: ['admin'],
          body: {},
        },
        {
          method: 'put',
          path: `/catalogos/planes/${id('plan-software')}/contenido`,
          allowed: ['admin'],
          body: { revision: 1, asignaturas: [] },
        },
        {
          method: 'post',
          path: '/personas/estudiantes',
          allowed: ['admin'],
          body: {
            correo: 'matriz.est@example.invalid',
            matricula: 'MAT-EST-1',
            nombre: 'Estudiante Matriz',
            planId: id('plan-software'),
            fechaIngreso: '2026-08-01',
          },
        },
        {
          method: 'patch',
          path: `/personas/estudiantes/${id('persona-estudiante1')}`,
          allowed: ['admin'],
          body: { nombre: 'Ana Matriz' },
        },
        {
          method: 'post',
          path: '/personas/docentes',
          allowed: ['admin'],
          body: {
            correo: 'matriz.doc@example.invalid',
            numeroEmpleado: 'MAT-DOC-1',
            nombre: 'Docente Matriz',
            departamento: 'Sistemas',
          },
        },
        {
          method: 'patch',
          path: `/personas/docentes/${id('persona-docente1')}`,
          allowed: ['admin'],
          body: { departamento: 'Sistemas' },
        },
        {
          method: 'post',
          path: '/periodos',
          allowed: ['admin'],
          body: {
            clave: 'PER-MAT',
            nombre: 'Periodo Matriz',
            inicio: '2027-01-10',
            fin: '2027-06-30',
            inscripcionInicio: '2027-01-01T08:00:00-06:00',
            inscripcionFin: '2027-01-05T18:00:00-06:00',
            estado: 'PLANIFICADO',
            politicaId: id('politica'),
          },
        },
        {
          method: 'patch',
          path: `/periodos/${id('actual')}`,
          allowed: ['admin'],
          body: { nombre: 'Periodo Actual Matriz' },
        },
        {
          method: 'post',
          path: '/grupos',
          allowed: ['admin'],
          body: {
            clave: 'GRP-MAT',
            planId: id('plan-software'),
            asignaturaId: id('intro'),
            periodoId: id('actual'),
            docenteId: id('persona-docente1'),
            cupo: 10,
          },
        },
        {
          method: 'patch',
          path: `/grupos/${id('intro-actual')}`,
          allowed: ['admin'],
          body: { cupo: 5 },
        },
        {
          method: 'post',
          path: '/matriculas',
          allowed: ['estudiante'],
          body: { grupoId: id('intro-alterno') },
        },
        {
          method: 'put',
          path: `/calificaciones/${id('grupo-lleno')}`,
          allowed: ['docente'],
          body: { notaFinal: '8.00', version: 1 },
        },
        {
          method: 'patch',
          path: `/calificaciones/inscripciones/${id('grupo-lleno')}`,
          allowed: ['docente'],
          body: { notaFinal: '8.00', version: 1, motivo: 'Corrección matriz' },
        },
      ];

      const call = (method: 'post' | 'patch' | 'put', path: string) =>
        request(app.getHttpServer())[method](path);

      for (const endpoint of writeMatrix) {
        // 1. Sin sesión -> 401
        await call(endpoint.method, endpoint.path)
          .set('Origin', env.WEB_ORIGIN)
          .send(endpoint.body)
          .expect(401);

        // 2. Con cada rol no autorizado -> 403
        for (const [role, session] of Object.entries(sessions) as Array<
          ['admin' | 'docente' | 'estudiante', { cookie: string; csrf: string }]
        >) {
          if (!endpoint.allowed.includes(role)) {
            await call(endpoint.method, endpoint.path)
              .set('Cookie', session.cookie)
              .set('Origin', env.WEB_ORIGIN)
              .set('X-CSRF-Token', session.csrf)
              .send(endpoint.body)
              .expect(403);
          }
        }

        // 3. Con rol autorizado pero sin CSRF, con CSRF inválido y con Origin inválido -> 403
        const authorizedSession = sessions[endpoint.allowed[0]!];
        await call(endpoint.method, endpoint.path)
          .set('Cookie', authorizedSession.cookie)
          .set('Origin', env.WEB_ORIGIN)
          .send(endpoint.body)
          .expect(403);
        await call(endpoint.method, endpoint.path)
          .set('Cookie', authorizedSession.cookie)
          .set('Origin', env.WEB_ORIGIN)
          .set('X-CSRF-Token', 'csrf-invalido')
          .send(endpoint.body)
          .expect(403);
        await call(endpoint.method, endpoint.path)
          .set('Cookie', authorizedSession.cookie)
          .set('Origin', 'https://malicioso.example')
          .set('X-CSRF-Token', authorizedSession.csrf)
          .send(endpoint.body)
          .expect(403);
      }

      // 4. Violación de propiedad de recurso:
      // 4a: Estudiante B (estudiante2) intentando consultar o descargar recursos de Estudiante A (estudiante1)
      const certEst1 = await tx.certificado.create({
        data: {
          estudianteId: id('persona-estudiante1'),
          tipo: 'ESTUDIOS',
          codigo: randomUUID().replaceAll('-', ''),
          estado: 'EMITIDO',
          solicitadoEn: new Date('2026-11-01T10:00:00.000Z'),
          emitidoEn: new Date('2026-11-01T10:01:00.000Z'),
          archivoRuta: 'constancia-ficticia.pdf',
          archivoSha256: 'a'.repeat(64),
          instantanea: { estudiante: 'Ana Ejemplo' },
        },
      });
      const est2Cookie = cookie(estudiante2Res);
      const est2Csrf = estudiante2Res.body.csrfToken as string;
      await request(app.getHttpServer())
        .get(`/auth/usuarios/${id('estudiante1')}`)
        .set('Cookie', est2Cookie)
        .expect(403);
      await request(app.getHttpServer())
        .get(`/certificados/${certEst1.id}/pdf`)
        .set('Cookie', est2Cookie)
        .expect(403);
      await request(app.getHttpServer())
        .post(`/certificados/${certEst1.id}/recuperar`)
        .set('Cookie', est2Cookie)
        .set('Origin', env.WEB_ORIGIN)
        .set('X-CSRF-Token', est2Csrf)
        .expect(403);
      await request(app.getHttpServer())
        .post(`/certificados/${certEst1.id}/reemitir`)
        .set('Cookie', est2Cookie)
        .set('Origin', env.WEB_ORIGIN)
        .set('X-CSRF-Token', est2Csrf)
        .expect(403);

      // 4b: Docente no asignado (docente2) intentando ver/capturar/corregir calificaciones o exportar CSV de grupo de docente1
      const doc2Cookie = cookie(docente2Res);
      const doc2Csrf = docente2Res.body.csrfToken as string;
      await request(app.getHttpServer())
        .get(`/docentes/me/grupos/${id('intro-actual')}/calificaciones`)
        .set('Cookie', doc2Cookie)
        .expect(404);
      await request(app.getHttpServer())
        .put(`/calificaciones/${id('grupo-lleno')}`)
        .set('Cookie', doc2Cookie)
        .set('Origin', env.WEB_ORIGIN)
        .set('X-CSRF-Token', doc2Csrf)
        .send({ notaFinal: '8.00', version: 1 })
        .expect(404);
      await request(app.getHttpServer())
        .patch(`/calificaciones/inscripciones/${id('grupo-lleno')}`)
        .set('Cookie', doc2Cookie)
        .set('Origin', env.WEB_ORIGIN)
        .set('X-CSRF-Token', doc2Csrf)
        .send({ notaFinal: '8.00', version: 1, motivo: 'Intento docente ajeno' })
        .expect(404);
      await request(app.getHttpServer())
        .get(`/reportes/grupos/${id('intro-actual')}/historial.csv`)
        .set('Cookie', doc2Cookie)
        .expect(404);
    });
  });

  it('CP-13 y PB-28: acredita paridad exacta BD <-> JSON <-> CSV, sanitización de fórmulas (=, +, -, @, \\t, \\r) y auditoría completa', async () => {
    await fixture(async ({ app, tx, id, correo }) => {
      await tx.periodo.update({
        where: { id: id('actual') },
        data: {
          inscripcionInicio: new Date(Date.now() - 86_400_000),
          inscripcionFin: new Date(Date.now() + 86_400_000),
        },
      });
      const adminRes = await login(app, await correo('admin'));
      const adminCookie = cookie(adminRes);
      const adminCsrf = adminRes.body.csrfToken as string;
      const admin = (method: 'get' | 'post' | 'patch' | 'put', path: string) => {
        const agent = request(app.getHttpServer());
        return agent[method](path)
          .set('Cookie', adminCookie)
          .set('Origin', env.WEB_ORIGIN)
          .set('X-CSRF-Token', adminCsrf);
      };

      // 1. Ejecutar operaciones en catálogos, personas, oferta, matrículas y calificaciones
      const prog = await admin('post', '/catalogos/programas')
        .send({ clave: 'PRG-CP13', nombre: 'Programa CP13' })
        .expect(201);
      await admin('patch', `/catalogos/programas/${prog.body.id}`)
        .send({ nombre: 'Programa CP13 Editado' })
        .expect(200);

      const doc = await admin('post', '/personas/docentes')
        .send({
          correo: 'docente.cp13@example.invalid',
          numeroEmpleado: 'DOC-CP13',
          nombre: '+Docente Fórmula CP13',
          departamento: 'Auditoría',
        })
        .expect(201);
      await admin('patch', `/personas/docentes/${doc.body.id}`)
        .send({ nombre: '@Docente Fórmula "Segura"' })
        .expect(200);

      const grp = await admin('post', '/grupos')
        .send({
          clave: 'GRP-CP13',
          planId: id('plan-software'),
          asignaturaId: id('comunicacion'),
          periodoId: id('actual'),
          docenteId: doc.body.id,
          cupo: 10,
        })
        .expect(201);
      await admin('patch', `/grupos/${grp.body.id}`).send({ cupo: 12 }).expect(200);

      const est3Hash = await bcrypt.hash(password, 4);
      await tx.usuario.update({
        where: { id: id('estudiante3') },
        data: { activo: true, passwordHash: est3Hash },
      });
      const est3Res = await login(app, await correo('estudiante3'));
      const est3Cookie = cookie(est3Res);
      const est3Csrf = est3Res.body.csrfToken as string;
      const enrollment = await request(app.getHttpServer())
        .post('/matriculas')
        .set('Cookie', est3Cookie)
        .set('Origin', env.WEB_ORIGIN)
        .set('X-CSRF-Token', est3Csrf)
        .send({ grupoId: id('intro-alterno') })
        .expect(201);

      const doc2Res = await login(app, await correo('docente2'));
      const doc2Cookie = cookie(doc2Res);
      const doc2Csrf = doc2Res.body.csrfToken as string;
      await request(app.getHttpServer())
        .put(`/calificaciones/${enrollment.body.id}`)
        .set('Cookie', doc2Cookie)
        .set('Origin', env.WEB_ORIGIN)
        .set('X-CSRF-Token', doc2Csrf)
        .send({ notaFinal: '8.75', version: 1 })
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/calificaciones/inscripciones/${enrollment.body.id}`)
        .set('Cookie', doc2Cookie)
        .set('Origin', env.WEB_ORIGIN)
        .set('X-CSRF-Token', doc2Csrf)
        .send({ notaFinal: '9.25', version: 2, motivo: 'Ajuste CP-13 verificado.' })
        .expect(200);

      // 2. Comprobar paridad exacta entre BD, reporte JSON paginado (/reportes/grupos), kárdex y exportación CSV
      const dbGroup = await tx.grupo.findUniqueOrThrow({
        where: { id: id('intro-alterno') },
        include: {
          inscripciones: { include: { estudiante: true } },
          periodo: true,
          docente: true,
          planAsignatura: { include: { asignatura: true } },
        },
      });
      const jsonReport = await admin(
        'get',
        `/reportes/grupos?q=${encodeURIComponent(dbGroup.clave)}&page=1&pageSize=10`,
      ).expect(200);
      expect(jsonReport.body.total).toBe(1);
      expect(jsonReport.body.items[0]).toMatchObject({
        id: dbGroup.id,
        clave: dbGroup.clave,
        inscripciones: dbGroup.inscripciones.length,
        asignatura: {
          clave: dbGroup.planAsignatura.asignatura.clave,
          nombre: dbGroup.planAsignatura.asignatura.nombre,
        },
        docente: { nombre: dbGroup.docente.nombre },
      });

      const kardexEst3 = await request(app.getHttpServer())
        .get('/estudiantes/me/calificaciones')
        .set('Cookie', est3Cookie)
        .expect(200);
      expect(kardexEst3.body.items).toHaveLength(1);
      expect(kardexEst3.body.items[0]).toMatchObject({
        inscripcionId: enrollment.body.id,
        estado: 'CALIFICADA',
        notaFinal: '9.250',
        grupo: { clave: dbGroup.clave, docente: dbGroup.docente.nombre },
      });

      const csvRes = await admin(
        'get',
        `/reportes/grupos/${id('intro-alterno')}/historial.csv`,
      ).expect(200);
      expect(csvRes.text.startsWith('\uFEFF')).toBe(true);
      const csvLines = csvRes.text.trim().split('\r\n');
      expect(csvLines).toHaveLength(dbGroup.inscripciones.length + 1);
      expect(csvLines[1]).toContain(`"${dbGroup.inscripciones[0]!.estudiante.matricula}"`);
      expect(csvLines[1]).toContain('"9.250"');

      // 3. Sanitización contra inyección de fórmulas (=, +, -, @, \t, \r) en exportación CSV
      const formulaVectors = [
        '=1+1',
        '+SUM(A1:A2)',
        '-2+3',
        '@HYPERLINK("http://evil.invalid")',
        '\t=CMD()',
        '\r=EXEC()',
      ];
      for (const [idx, vector] of formulaVectors.entries()) {
        const u = await tx.usuario.create({
          data: {
            correo: `formula.${idx}@example.invalid`,
            passwordHash: 'inactivo',
            rol: 'ESTUDIANTE',
            activo: false,
          },
        });
        const est = await tx.estudiante.create({
          data: {
            usuarioId: u.id,
            matricula: `FRM-${idx}`,
            nombre: vector,
            planId: id('plan-software'),
            fechaIngreso: new Date('2026-08-01T00:00:00.000Z'),
          },
        });
        await tx.inscripcion.create({
          data: {
            estudianteId: est.id,
            planId: id('plan-software'),
            grupoId: grp.body.id,
            asignaturaId: id('comunicacion'),
            periodoId: id('actual'),
            politicaId: id('politica'),
            estado: 'CALIFICADA',
            notaFinal: '8.00',
            creditosSnapshot: '4.00',
          },
        });
      }
      const formulaCsv = await admin('get', `/reportes/grupos/${grp.body.id}/historial.csv`).expect(
        200,
      );
      expect(formulaCsv.text).toContain('"\'=1+1"');
      expect(formulaCsv.text).toContain('"\'+SUM(A1:A2)"');
      expect(formulaCsv.text).toContain('"\'-2+3"');
      expect(formulaCsv.text).toContain('"\'@HYPERLINK(""http://evil.invalid"")"');
      expect(formulaCsv.text).toContain('"\'\t=CMD()"');
      expect(formulaCsv.text).toContain('"\'\r=EXEC()"');
      expect(formulaCsv.text).toContain('"\'@Docente Fórmula ""Segura"""');

      // 4. Verificar bitácora de auditoría con actorId, accion, recurso, recursoId, anterior y posterior
      const auditReport = await admin('get', '/reportes/auditoria?page=1&pageSize=50').expect(200);
      expect(auditReport.body.total).toBeGreaterThanOrEqual(7);

      for (const expected of [
        { recurso: 'Programa', recursoId: prog.body.id, accion: 'ACTUALIZAR', hasAnterior: true },
        { recurso: 'Docente', recursoId: doc.body.id, accion: 'ACTUALIZAR', hasAnterior: true },
        { recurso: 'Grupo', recursoId: grp.body.id, accion: 'ACTUALIZAR', hasAnterior: true },
        {
          recurso: 'Inscripcion',
          recursoId: enrollment.body.id,
          accion: 'CREAR',
          hasAnterior: false,
        },
        {
          recurso: 'Inscripcion',
          recursoId: enrollment.body.id,
          accion: 'CAPTURAR_CALIFICACION',
          hasAnterior: true,
        },
        {
          recurso: 'Inscripcion',
          recursoId: enrollment.body.id,
          accion: 'CORREGIR_CALIFICACION',
          hasAnterior: true,
        },
      ]) {
        const entry = await tx.auditoria.findFirstOrThrow({
          where: {
            recurso: expected.recurso,
            recursoId: expected.recursoId,
            accion: expected.accion,
          },
        });
        expect(entry.actorId).toEqual(expect.any(String));
        expect(entry.posterior).not.toBeNull();
        if (expected.hasAnterior) {
          expect(entry.anterior).not.toBeNull();
        }
      }
    });
  });
});
