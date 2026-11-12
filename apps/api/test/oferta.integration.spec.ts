import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
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
const rollback = new Error('Rollback oferta');
const password = 'ClaveFicticiaDePrueba_2026!';
jest.setTimeout(30000);

type TestContext = {
  app: INestApplication;
  tx: Prisma.TransactionClient;
  id: (name: string) => string;
  correo: (name: string) => Promise<string>;
};

async function fixture(run: (context: TestContext) => Promise<void>) {
  const namespace = `oferta-${randomUUID()}`;
  try {
    await client.$transaction(
      async (tx) => {
        await seedData(tx, namespace);
        const hash = await bcrypt.hash(password, 4);
        const id = (name: string) => seedId(namespace, name);
        for (const name of ['admin', 'docente1', 'docente2', 'estudiante1']) {
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
              await tx.$executeRawUnsafe('SAVEPOINT oferta_operation');
              try {
                const result = await fn(tx);
                await tx.$executeRawUnsafe('RELEASE SAVEPOINT oferta_operation');
                return result;
              } catch (error) {
                await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT oferta_operation');
                await tx.$executeRawUnsafe('RELEASE SAVEPOINT oferta_operation');
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
            correo: async (name) =>
              (await tx.usuario.findUniqueOrThrow({ where: { id: id(name) } })).correo,
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

function sessionCookie(response: request.Response) {
  const setCookie = response.headers['set-cookie'];
  const value = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  expect(value).toContain('HttpOnly');
  return String(value).split(';')[0]!;
}

async function login(app: INestApplication, correo: string) {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .set('Origin', env.WEB_ORIGIN)
    .send({ correo, password })
    .expect(200);
  return { cookie: sessionCookie(response), csrf: response.body.csrfToken as string };
}

function authenticated(app: INestApplication, cookie: string, csrf: string) {
  const headers = (test: request.Test) =>
    test.set('Cookie', cookie).set('Origin', env.WEB_ORIGIN).set('X-CSRF-Token', csrf);
  return {
    get: (path: string) => headers(request(app.getHttpServer()).get(path)),
    post: (path: string) => headers(request(app.getHttpServer()).post(path)),
    patch: (path: string) => headers(request(app.getHttpServer()).patch(path)),
  };
}

afterAll(async () => {
  await client.$disconnect();
});

describe('RF-05 periodos y grupos con PostgreSQL real', () => {
  it('protege periodos y grupos por rol y exige CSRF para cambios', async () => {
    await fixture(async ({ app, correo }) => {
      await request(app.getHttpServer()).get('/periodos').expect(401);
      const student = await login(app, await correo('estudiante1'));
      await request(app.getHttpServer()).get('/periodos').set('Cookie', student.cookie).expect(403);
      await request(app.getHttpServer()).get('/grupos').set('Cookie', student.cookie).expect(403);
      const teacher = await login(app, await correo('docente1'));
      await request(app.getHttpServer())
        .post('/grupos')
        .set('Cookie', teacher.cookie)
        .set('Origin', env.WEB_ORIGIN)
        .send({})
        .expect(403);
      await request(app.getHttpServer())
        .get('/docentes/me/grupos')
        .set('Cookie', teacher.cookie)
        .expect(200);
      const admin = await login(app, await correo('admin'));
      await request(app.getHttpServer())
        .post('/periodos')
        .set('Cookie', admin.cookie)
        .set('Origin', env.WEB_ORIGIN)
        .send({})
        .expect(403);
      await request(app.getHttpServer())
        .get('/docentes/me/grupos')
        .set('Cookie', admin.cookie)
        .expect(403);
    });
  });

  it('valida y registra periodos, normaliza claves y deja explícita la política propuesta', async () => {
    await fixture(async ({ app, correo, id, tx }) => {
      const admin = await login(app, await correo('admin'));
      const api = authenticated(app, admin.cookie, admin.csrf);
      const policies = await api.get('/periodos/politicas').expect(200);
      expect(
        policies.body.find((policy: { id: string }) => policy.id === id('politica')).esPropuesta,
      ).toBe(true);
      const payload = {
        clave: '  prueba-e05  ',
        nombre: 'Periodo de prueba transaccional',
        inicio: '2027-01-10',
        fin: '2027-06-30',
        inscripcionInicio: '2027-01-01T08:00:00-06:00',
        inscripcionFin: '2027-01-07T23:59:00-06:00',
        estado: 'PLANIFICADO',
        politicaId: id('politica'),
      };
      const created = await api.post('/periodos').send(payload).expect(201);
      expect(created.body.clave).toBe('PRUEBA-E05');
      expect(created.body.politica.esPropuesta).toBe(true);
      expect(created.body.inscripcionInicio).toBe('2027-01-01T14:00:00.000Z');
      const createAudit = await tx.auditoria.findFirstOrThrow({
        where: { recurso: 'Periodo', recursoId: created.body.id, accion: 'CREAR' },
      });
      expect(createAudit.posterior).toMatchObject({
        clave: 'PRUEBA-E05',
        politicaId: id('politica'),
      });
      await api
        .post('/periodos')
        .send({ ...payload, nombre: 'duplicado' })
        .expect(409);
      await api
        .post('/periodos')
        .send({ ...payload, clave: 'FECHAS-MAL', inicio: '2027-07-01', fin: '2027-06-30' })
        .expect(400);
      await api
        .post('/periodos')
        .send({
          ...payload,
          clave: 'VENTANA-MAL',
          inscripcionInicio: payload.inscripcionFin,
          inscripcionFin: payload.inscripcionInicio,
        })
        .expect(400);
      await api
        .post('/periodos')
        .send({ ...payload, clave: 'CIERRE-LOCAL', inscripcionFin: '2027-07-01T05:30:00Z' })
        .expect(201);
      await api
        .post('/periodos')
        .send({
          ...payload,
          clave: 'CIERRE-LIMITE-CDMX',
          inscripcionFin: '2027-06-30T23:59:59-06:00',
        })
        .expect(201);
      await api
        .post('/periodos')
        .send({ ...payload, clave: 'CIERRE-FUERA', inscripcionFin: '2027-07-01T06:00:00Z' })
        .expect(400);
      const page = await api.get('/periodos?q=prueba-e05&page=1&pageSize=1').expect(200);
      expect(page.body.total).toBe(1);
      expect(page.body.items[0].clave).toBe('PRUEBA-E05');
      await api.patch(`/periodos/${created.body.id}`).send({ fin: '2027-07-01' }).expect(200);
      expect(
        await tx.auditoria.count({ where: { recurso: 'Periodo', recursoId: created.body.id } }),
      ).toBe(2);
      const periodAudit = await tx.auditoria.findFirstOrThrow({
        where: { recurso: 'Periodo', recursoId: created.body.id, accion: 'ACTUALIZAR' },
      });
      expect(periodAudit.anterior).toMatchObject({ estado: 'PLANIFICADO', fin: '2027-06-30' });
      expect(periodAudit.posterior).toMatchObject({ estado: 'PLANIFICADO', fin: '2027-07-01' });
    });
  });

  it('asigna docente y asignatura válidos, y rechaza plan incorrecto, docente inactivo y periodo cerrado', async () => {
    await fixture(async ({ app, correo, id, tx }) => {
      const admin = await login(app, await correo('admin'));
      const api = authenticated(app, admin.cookie, admin.csrf);
      const base = {
        clave: 'NUEVO-E05',
        planId: id('plan-software'),
        asignaturaId: id('intro'),
        periodoId: id('actual'),
        docenteId: id('persona-docente1'),
        cupo: 3,
      };
      const created = await api.post('/grupos').send(base).expect(201);
      expect(created.body.politicaId).toBe(id('politica'));
      expect(created.body.ocupacion).toBe(0);
      const createAudit = await tx.auditoria.findFirstOrThrow({
        where: { recurso: 'Grupo', recursoId: created.body.id, accion: 'CREAR' },
      });
      expect(createAudit.posterior).toMatchObject({
        clave: 'NUEVO-E05',
        cupo: 3,
        docenteId: id('persona-docente1'),
      });
      await api
        .patch(`/grupos/${created.body.id}`)
        .send({ periodoId: id('anterior') })
        .expect(409);
      await api
        .post('/grupos')
        .send({ ...base, clave: 'MATERIA-AJENA', asignaturaId: id('visual') })
        .expect(400);
      await api
        .post('/grupos')
        .send({ ...base, clave: 'PERIODO-CERRADO', periodoId: id('anterior') })
        .expect(409);
      await api
        .post('/grupos')
        .send({ ...base, clave: created.body.clave })
        .expect(409);
      await tx.docente.update({ where: { id: id('persona-docente2') }, data: { activo: false } });
      await api
        .post('/grupos')
        .send({ ...base, clave: 'DOCENTE-INACTIVO', docenteId: id('persona-docente2') })
        .expect(400);
      await tx.programa.update({ where: { id: id('software') }, data: { activo: false } });
      await api
        .post('/grupos')
        .send({ ...base, clave: 'PROGRAMA-INACTIVO' })
        .expect(400);
      await tx.programa.update({ where: { id: id('software') }, data: { activo: true } });
      await tx.planEstudio.update({ where: { id: id('plan-software') }, data: { activo: false } });
      await api
        .post('/grupos')
        .send({ ...base, clave: 'PLAN-INACTIVO' })
        .expect(400);
      await tx.planEstudio.update({ where: { id: id('plan-software') }, data: { activo: true } });
      await tx.asignatura.update({ where: { id: id('intro') }, data: { activo: false } });
      await api
        .post('/grupos')
        .send({ ...base, clave: 'ASIGNATURA-INACTIVA' })
        .expect(400);
      await tx.asignatura.update({ where: { id: id('intro') }, data: { activo: true } });
      const page = await api.get('/grupos?q=NUEVO-E05&page=1&pageSize=5').expect(200);
      expect(page.body.total).toBe(1);
      expect(page.body.items[0].docente.id).toBe(id('persona-docente1'));
    });
  });

  it('no reduce el cupo por debajo de inscripciones activas; conserva identidad e historial y limita grupos del docente', async () => {
    await fixture(async ({ app, correo, id, tx }) => {
      const admin = await login(app, await correo('admin'));
      const api = authenticated(app, admin.cookie, admin.csrf);
      await api
        .patch(`/grupos/${id('intro-anterior')}`)
        .send({ cupo: 1 })
        .expect(409);
      const resized = await api
        .patch(`/grupos/${id('intro-anterior')}`)
        .send({ cupo: 2 })
        .expect(200);
      expect(resized.body.cupo).toBe(2);
      expect(resized.body.ocupacion).toBe(2);
      await api
        .patch(`/grupos/${id('intro-anterior')}`)
        .send({ clave: 'CAMBIAR-HISTORICO' })
        .expect(409);
      const disabled = await api
        .patch(`/grupos/${id('intro-anterior')}`)
        .send({ activo: false })
        .expect(200);
      expect(disabled.body.activo).toBe(false);
      expect(disabled.body.ocupacion).toBe(2);
      expect(await tx.inscripcion.count({ where: { grupoId: id('intro-anterior') } })).toBe(2);
      const groupAudit = await tx.auditoria.findFirstOrThrow({
        where: { recurso: 'Grupo', recursoId: id('intro-anterior'), accion: 'ACTUALIZAR' },
        orderBy: { creadoEn: 'desc' },
      });
      expect(groupAudit.anterior).toMatchObject({ activo: true, cupo: 2 });
      expect(groupAudit.posterior).toMatchObject({ activo: false, cupo: 2 });

      const teacher1 = await login(app, await correo('docente1'));
      const own = await request(app.getHttpServer())
        .get('/docentes/me/grupos')
        .set('Cookie', teacher1.cookie)
        .expect(200);
      expect(own.body.map((group: { id: string }) => group.id)).toEqual(
        expect.arrayContaining([id('intro-anterior'), id('intro-actual')]),
      );
      expect(own.body.some((group: { id: string }) => group.id === id('intro-alterno'))).toBe(
        false,
      );
      const teacher2 = await login(app, await correo('docente2'));
      const other = await request(app.getHttpServer())
        .get('/docentes/me/grupos')
        .set('Cookie', teacher2.cookie)
        .expect(200);
      expect(other.body.some((group: { id: string }) => group.id === id('intro-anterior'))).toBe(
        false,
      );
    });
  });
});

describe('Paginacion de grupos docentes', () => {
  it('alcanza grupos posteriores a 100 y filtra siempre por docente', async () => {
    await fixture(async ({ app, tx, id, correo }) => {
      const prefix = `PAG${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
      await tx.grupo.createMany({
        data: Array.from({ length: 105 }, (_, index) => ({
          clave: `${prefix}-${String(index).padStart(3, '0')}`,
          planId: id('plan-software'),
          asignaturaId: id('intro'),
          periodoId: id('actual'),
          politicaId: id('politica'),
          docenteId: id('persona-docente1'),
          cupo: 10,
        })),
      });
      const teacher = (await login(app, await correo('docente1'))).cookie;
      const page = await request(app.getHttpServer())
        .get('/docentes/me/grupos')
        .query({ q: prefix, page: 6, pageSize: 20 })
        .set('Cookie', teacher)
        .expect(200);
      expect(page.body.total).toBe(105);
      expect(page.body.items).toHaveLength(5);
      expect(page.body.items[4].clave).toBe(`${prefix}-104`);
      const legacy = await request(app.getHttpServer())
        .get('/docentes/me/grupos')
        .set('Cookie', teacher)
        .expect(200);
      expect(Array.isArray(legacy.body)).toBe(true);
      expect(legacy.body).toHaveLength(100);
      await request(app.getHttpServer())
        .get('/docentes/me/grupos')
        .query({ pageSize: 101 })
        .set('Cookie', teacher)
        .expect(400);
      const other = (await login(app, await correo('docente2'))).cookie;
      const hidden = await request(app.getHttpServer())
        .get('/docentes/me/grupos')
        .query({ q: prefix })
        .set('Cookie', other)
        .expect(200);
      expect(hidden.body.total).toBe(0);
    });
  });
});
