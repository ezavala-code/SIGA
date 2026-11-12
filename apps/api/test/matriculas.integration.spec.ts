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
import { MatriculasService } from '../src/modules/matriculas/matriculas.service.js';
import type { Prisma } from '../src/generated/prisma/client.js';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
const databaseUrl = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);
const env = parseEnvironment({
  NODE_ENV: 'test',
  DATABASE_URL: databaseUrl,
  WEB_ORIGIN: 'http://localhost:5173',
  JWT_SECRET: 'testingkeyabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH',
  EXIGIR_PRERREQUISITOS: 'true',
});
const client = createDatabaseClient(databaseUrl);
const rollback = new Error('Rollback matrículas');
const password = 'ClaveFicticiaDePrueba_2026!';
jest.setTimeout(60000);

beforeAll(async () => {
  const rows = await client.$queryRaw<{ schema: string }[]>`SELECT current_schema() AS schema`;
  expect(rows[0]?.schema).toBe(new URL(databaseUrl).searchParams.get('schema') ?? 'public');
});

type TestContext = {
  app: INestApplication;
  tx: Prisma.TransactionClient;
  id: (name: string) => string;
  correo: (name: string) => Promise<string>;
};

async function fixture(run: (context: TestContext) => Promise<void>) {
  const namespace = `matriculas-${randomUUID()}`;
  try {
    await client.$transaction(
      async (tx) => {
        await seedData(tx, namespace);
        const id = (name: string) => seedId(namespace, name);
        await tx.periodo.update({
          where: { id: id('actual') },
          data: {
            inscripcionInicio: new Date(Date.now() - 86_400_000),
            inscripcionFin: new Date(Date.now() + 86_400_000),
          },
        });
        const hash = await bcrypt.hash(password, 4);
        for (const name of ['estudiante1', 'estudiante2', 'estudiante3', 'docente1', 'admin']) {
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
              await tx.$executeRawUnsafe('SAVEPOINT matricula_operation');
              try {
                const result = await fn(tx);
                await tx.$executeRawUnsafe('RELEASE SAVEPOINT matricula_operation');
                return result;
              } catch (error) {
                await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT matricula_operation');
                await tx.$executeRawUnsafe('RELEASE SAVEPOINT matricula_operation');
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

type ConcurrentContext = {
  app: INestApplication;
  id: (name: string) => string;
  correo: (name: string) => Promise<string>;
};

async function concurrentFixture(
  run: (context: ConcurrentContext) => Promise<void>,
  prepare: (tx: Prisma.TransactionClient, id: (name: string) => string) => Promise<void>,
) {
  const namespace = `matriculas-race-${randomUUID()}`;
  const id = (name: string) => seedId(namespace, name);
  let app: INestApplication | undefined;
  try {
    await client.$transaction(async (tx) => {
      await seedData(tx, namespace);
      await tx.periodo.update({
        where: { id: id('actual') },
        data: {
          inscripcionInicio: new Date(Date.now() - 86_400_000),
          inscripcionFin: new Date(Date.now() + 86_400_000),
        },
      });
      const hash = await bcrypt.hash(password, 4);
      for (const name of ['estudiante1', 'estudiante2', 'estudiante3']) {
        await tx.usuario.update({
          where: { id: id(name) },
          data: { activo: true, passwordHash: hash },
        });
      }
      await prepare(tx, id);
    });
    const module = await Test.createTestingModule({ imports: [AppModule.register(env)] }).compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    await run({
      app,
      id,
      correo: async (name) =>
        (await client.usuario.findUniqueOrThrow({ where: { id: id(name) } })).correo,
    });
  } finally {
    if (app) await app.close();
  }
}

function cookie(response: request.Response) {
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
  return { cookie: cookie(response), csrf: response.body.csrfToken as string };
}

function authenticated(app: INestApplication, session: { cookie: string; csrf: string }) {
  const headers = (test: request.Test) =>
    test
      .set('Cookie', session.cookie)
      .set('Origin', env.WEB_ORIGIN)
      .set('X-CSRF-Token', session.csrf);
  return {
    get: (path: string) => headers(request(app.getHttpServer()).get(path)),
    post: (path: string) => headers(request(app.getHttpServer()).post(path)),
  };
}

describe('RF-06 matrícula en línea con PostgreSQL real', () => {
  it('deriva al estudiante de la sesión y protege la ruta por rol y CSRF', async () => {
    await fixture(async ({ app, correo }) => {
      await request(app.getHttpServer()).get('/matriculas/me').expect(401);
      const teacher = await login(app, await correo('docente1'));
      const teacherApi = authenticated(app, teacher);
      await teacherApi.get('/matriculas/me').expect(403);
      await teacherApi.post('/matriculas').send({ grupoId: 'invalid' }).expect(403);
      const admin = await login(app, await correo('admin'));
      await authenticated(app, admin).get('/matriculas/oferta').expect(403);
      const student = await login(app, await correo('estudiante3'));
      await request(app.getHttpServer())
        .post('/matriculas')
        .set('Cookie', student.cookie)
        .set('Origin', env.WEB_ORIGIN)
        .send({ grupoId: '00000000-0000-0000-0000-000000000000' })
        .expect(403);
      await authenticated(app, student)
        .post('/matriculas')
        .send({
          grupoId: '00000000-0000-0000-0000-000000000000',
          estudianteId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(400);
    });
  });

  it('pagina oferta e historial sin truncar registros y mantiene la respuesta anterior sin parámetros', async () => {
    await fixture(async ({ app, correo, id, tx }) => {
      const baseGroup = await tx.grupo.findUniqueOrThrow({ where: { id: id('intro-actual') } });
      const basePeriod = await tx.periodo.findUniqueOrThrow({ where: { id: id('actual') } });
      const suffix = randomUUID().slice(0, 8).toUpperCase();
      const periods = Array.from({ length: 201 }, (_, index) => ({
        ...basePeriod,
        id: randomUUID(),
        clave: `H-${suffix}-${index}`,
        estado: 'CERRADO' as const,
      }));
      await tx.periodo.createMany({ data: periods });
      const historyGroups = periods.map((period, index) => ({
        ...baseGroup,
        id: randomUUID(),
        clave: `H-${index}`,
        periodoId: period.id,
        activo: false,
      }));
      await tx.grupo.createMany({ data: historyGroups });
      const planCourse = await tx.planAsignatura.findUniqueOrThrow({
        where: {
          planId_asignaturaId: { planId: baseGroup.planId, asignaturaId: baseGroup.asignaturaId },
        },
      });
      await tx.inscripcion.createMany({
        data: historyGroups.map((group) => ({
          estudianteId: id('persona-estudiante3'),
          planId: group.planId,
          grupoId: group.id,
          asignaturaId: group.asignaturaId,
          periodoId: group.periodoId,
          politicaId: group.politicaId,
          creditosSnapshot: planCourse.creditos,
        })),
      });
      await tx.grupo.createMany({
        data: Array.from({ length: 101 }, (_, index) => ({
          ...baseGroup,
          id: randomUUID(),
          clave: `O-${suffix}-${index}`,
        })),
      });
      const student = await login(app, await correo('estudiante3'));
      const api = authenticated(app, student);
      const legacy = await api.get('/matriculas/oferta').expect(200);
      expect(Array.isArray(legacy.body)).toBe(true);
      const offerFirst = await api.get('/matriculas/oferta?page=1&pageSize=100').expect(200);
      const offerSecond = await api.get('/matriculas/oferta?page=2&pageSize=100').expect(200);
      expect(offerFirst.body.total).toBeGreaterThan(100);
      expect(offerSecond.body.items.length).toBeGreaterThan(0);
      expect(
        new Set(
          [...offerFirst.body.items, ...offerSecond.body.items].map(
            (item: { grupoId: string }) => item.grupoId,
          ),
        ).size,
      ).toBe(offerFirst.body.total);
      const historyFirst = await api.get('/matriculas/me?page=1&pageSize=100').expect(200);
      const historyLast = await api.get('/matriculas/me?page=3&pageSize=100').expect(200);
      expect(historyFirst.body.total).toBeGreaterThanOrEqual(201);
      expect(historyLast.body.items.length).toBeGreaterThan(0);
      expect(
        historyLast.body.items.every((item: { estudianteId?: string }) => !item.estudianteId),
      ).toBe(true);
      await api.get('/matriculas/me?page=0').expect(400);
      await api.get('/matriculas/oferta?pageSize=101').expect(400);
    });
  });

  it('acepta el cierre de inscripción durante el último día del periodo en Ciudad de México', async () => {
    await fixture(async ({ tx, id }) => {
      const period = await tx.periodo.update({
        where: { id: id('actual') },
        data: {
          fin: new Date('2026-12-20T00:00:00.000Z'),
          inscripcionInicio: new Date('2026-12-20T14:00:00.000Z'),
          inscripcionFin: new Date('2026-12-21T05:30:00.000Z'),
        },
      });
      expect(period.inscripcionFin.toISOString()).toBe('2026-12-21T05:30:00.000Z');
    });
  });

  it('rechaza prerrequisito pendiente sin dejar filas parciales y permite inscribirse al acreditarlo', async () => {
    await fixture(async ({ app, correo, id, tx }) => {
      const student = await login(app, await correo('estudiante3'));
      const api = authenticated(app, student);
      const offer = await api.get('/matriculas/oferta').expect(200);
      const advanced = offer.body.find(
        (item: { grupoId: string }) => item.grupoId === id('avanzada-actual'),
      );
      expect(advanced).toMatchObject({ puedeInscribirse: false });
      expect(advanced.motivo).toContain('Fundamentos de programación');

      const before = await tx.inscripcion.count({
        where: { estudianteId: id('persona-estudiante3'), grupoId: id('avanzada-actual') },
      });
      const auditBefore = await tx.auditoria.count({
        where: { actorId: id('estudiante3'), recurso: 'Inscripcion' },
      });
      await api
        .post('/matriculas')
        .send({ grupoId: id('avanzada-actual') })
        .expect(409);
      expect(
        await tx.inscripcion.count({
          where: { estudianteId: id('persona-estudiante3'), grupoId: id('avanzada-actual') },
        }),
      ).toBe(before);
      expect(
        await tx.auditoria.count({
          where: { actorId: id('estudiante3'), recurso: 'Inscripcion' },
        }),
      ).toBe(auditBefore);

      await tx.inscripcion.create({
        data: {
          estudianteId: id('persona-estudiante3'),
          planId: id('plan-software'),
          grupoId: id('intro-anterior'),
          asignaturaId: id('intro'),
          periodoId: id('anterior'),
          politicaId: id('politica'),
          estado: 'CALIFICADA',
          notaFinal: '8.50',
          creditosSnapshot: '6.00',
        },
      });
      const enrolled = await api
        .post('/matriculas')
        .send({ grupoId: id('avanzada-actual') })
        .expect(201);
      expect(enrolled.body).toMatchObject({
        estado: 'PENDIENTE',
        creditosSnapshot: '8.00',
        grupo: { id: id('avanzada-actual'), asignatura: { nombre: 'Programación avanzada' } },
      });
      expect(
        await tx.auditoria.count({
          where: {
            actorId: id('estudiante3'),
            recurso: 'Inscripcion',
            recursoId: enrolled.body.id,
          },
        }),
      ).toBe(1);
      await api
        .post('/matriculas')
        .send({ grupoId: id('avanzada-actual') })
        .expect(409);
      const own = await api.get('/matriculas/me').expect(200);
      expect(own.body.map((item: { id: string }) => item.id)).toContain(enrolled.body.id);
      expect(own.body.some((item: { estudianteId?: string }) => item.estudianteId)).toBe(false);
    });
  });

  it('bloquea duplicidad entre grupos del periodo y reinscripción aprobada según la política vigente', async () => {
    await fixture(async ({ app, correo, id }) => {
      const studentWithFailedAttempt = await login(app, await correo('estudiante2'));
      await authenticated(app, studentWithFailedAttempt)
        .post('/matriculas')
        .send({ grupoId: id('intro-alterno') })
        .expect(409);
      const studentWithApprovedAttempt = await login(app, await correo('estudiante1'));
      await authenticated(app, studentWithApprovedAttempt)
        .post('/matriculas')
        .send({ grupoId: id('intro-alterno') })
        .expect(409);
    });
  });

  it('rechaza periodo cerrado, ventana vencida y perfil inactivo', async () => {
    await fixture(async ({ app, correo, id, tx }) => {
      const student = await login(app, await correo('estudiante3'));
      const api = authenticated(app, student);
      await api
        .post('/matriculas')
        .send({ grupoId: id('intro-anterior') })
        .expect(409);

      await tx.periodo.update({
        where: { id: id('actual') },
        data: { inscripcionInicio: new Date(Date.now() + 60_000) },
      });
      await api
        .post('/matriculas')
        .send({ grupoId: id('intro-alterno') })
        .expect(409);

      await tx.estudiante.update({
        where: { id: id('persona-estudiante3') },
        data: { estado: 'INACTIVO' },
      });
      await api
        .post('/matriculas')
        .send({ grupoId: id('intro-alterno') })
        .expect(403);
    });
  });

  it('D44: comprueba exactamente las 4 fronteras de ventana [inscripcionInicio, inscripcionFin) en America/Mexico_City', async () => {
    await fixture(async ({ app, correo, id, tx }) => {
      const inicioMx = new Date('2026-11-09T09:00:00-06:00');
      const finMx = new Date('2026-11-09T18:00:00-06:00');
      await tx.periodo.update({
        where: { id: id('actual') },
        data: {
          inicio: new Date('2026-08-01T00:00:00.000Z'),
          fin: new Date('2026-12-20T00:00:00.000Z'),
          inscripcionInicio: inicioMx,
          inscripcionFin: finMx,
          estado: 'ABIERTO',
        },
      });
      const comGroupId = randomUUID();
      await tx.grupo.create({
        data: {
          id: comGroupId,
          clave: 'COM-D44-VENTANA',
          planId: id('plan-software'),
          asignaturaId: id('comunicacion'),
          periodoId: id('actual'),
          politicaId: id('politica'),
          docenteId: id('persona-docente1'),
          cupo: 10,
        },
      });

      const student = await login(app, await correo('estudiante3'));
      const api = authenticated(app, student);
      const nowSpy = jest.spyOn(MatriculasService.prototype, 'now');
      try {
        // 1. 1 segundo antes de inscripcionInicio (08:59:59-06:00) -> no elegible y POST rechaza 409
        nowSpy.mockReturnValue(new Date(inicioMx.getTime() - 1000));
        const offerBefore = await api.get('/matriculas/oferta').expect(200);
        expect(
          offerBefore.body.find((g: { grupoId: string }) => g.grupoId === id('intro-alterno')),
        ).toBeUndefined();
        const rejectBefore = await api
          .post('/matriculas')
          .send({ grupoId: id('intro-alterno') })
          .expect(409);
        expect(rejectBefore.body.message).toContain('ventana de inscripción está cerrada');

        // 2. Exactamente en inscripcionInicio (09:00:00-06:00, now === inscripcionInicio) -> elegible: true y POST 201
        nowSpy.mockReturnValue(new Date(inicioMx.getTime()));
        const offerAtStart = await api.get('/matriculas/oferta').expect(200);
        const introAtStart = offerAtStart.body.find(
          (g: { grupoId: string }) => g.grupoId === id('intro-alterno'),
        );
        expect(introAtStart).toMatchObject({
          grupoId: id('intro-alterno'),
          puedeInscribirse: true,
          motivo: null,
        });
        await api
          .post('/matriculas')
          .send({ grupoId: id('intro-alterno') })
          .expect(201);

        // 3. Exactamente en inscripcionFin (18:00:00-06:00, now === inscripcionFin) -> no elegible y POST rechaza 409
        nowSpy.mockReturnValue(new Date(finMx.getTime()));
        const offerAtEnd = await api.get('/matriculas/oferta').expect(200);
        expect(
          offerAtEnd.body.find((g: { grupoId: string }) => g.grupoId === comGroupId),
        ).toBeUndefined();
        const rejectAtEnd = await api.post('/matriculas').send({ grupoId: comGroupId }).expect(409);
        expect(rejectAtEnd.body.message).toContain('ventana de inscripción está cerrada');

        // 4. Después de inscripcionFin (18:00:01-06:00) -> no elegible y POST rechaza 409
        nowSpy.mockReturnValue(new Date(finMx.getTime() + 1000));
        const offerAfterEnd = await api.get('/matriculas/oferta').expect(200);
        expect(
          offerAfterEnd.body.find((g: { grupoId: string }) => g.grupoId === comGroupId),
        ).toBeUndefined();
        await api.post('/matriculas').send({ grupoId: comGroupId }).expect(409);
      } finally {
        nowSpy.mockRestore();
      }
    });
  });

  it('RN-01 y CP-03: acredita 0, 1 y múltiples prerrequisitos, estados aprobado/reprobado/pendiente/recursado, EXIGIR_PRERREQUISITOS=false y coherencia oferta vs POST', async () => {
    await fixture(async ({ app, correo, id, tx }) => {
      // Crear una nueva versión del plan sin historial previo para configurar múltiples prerrequisitos en 'proyecto'
      const planRn01Id = randomUUID();
      await tx.planEstudio.create({
        data: {
          id: planRn01Id,
          programaId: id('software'),
          version: 20,
          nombre: 'Plan RN-01 Prerrequisitos Múltiples',
        },
      });
      await tx.planAsignatura.createMany({
        data: [
          { planId: planRn01Id, asignaturaId: id('intro'), creditos: '6.00', semestreSugerido: 1 },
          {
            planId: planRn01Id,
            asignaturaId: id('comunicacion'),
            creditos: '4.00',
            semestreSugerido: 1,
          },
          {
            planId: planRn01Id,
            asignaturaId: id('avanzada'),
            creditos: '8.00',
            semestreSugerido: 2,
          },
          {
            planId: planRn01Id,
            asignaturaId: id('proyecto'),
            creditos: '10.00',
            semestreSugerido: 3,
          },
        ],
      });
      await tx.prerrequisito.createMany({
        data: [
          { planId: planRn01Id, asignaturaId: id('avanzada'), requeridaId: id('intro') },
          { planId: planRn01Id, asignaturaId: id('proyecto'), requeridaId: id('avanzada') },
          { planId: planRn01Id, asignaturaId: id('proyecto'), requeridaId: id('comunicacion') },
        ],
      });
      await tx.estudiante.updateMany({
        where: { id: { in: [id('persona-estudiante3'), id('persona-estudiante4')] } },
        data: { planId: planRn01Id },
      });

      const prev2PeriodId = randomUUID();
      await tx.periodo.create({
        data: {
          id: prev2PeriodId,
          clave: 'PER-PREV-RECURSO',
          nombre: 'Periodo previo recursamiento',
          inicio: new Date('2025-08-01T00:00:00.000Z'),
          fin: new Date('2025-12-15T00:00:00.000Z'),
          inscripcionInicio: new Date('2025-07-01T00:00:00.000Z'),
          inscripcionFin: new Date('2025-07-31T00:00:00.000Z'),
          estado: 'CERRADO',
          politicaId: id('politica'),
        },
      });
      const introPrev2GroupId = randomUUID();
      const introPrev1GroupId = randomUUID();
      const comPrevGroupId = randomUUID();
      const avzPrevGroupId = randomUUID();
      const introFullGroupId = randomUUID();
      const introOpenGroupId = randomUUID();
      const avzActualGroupId = randomUUID();
      const proyActualGroupId = randomUUID();
      const comActualGroupId = randomUUID();
      await tx.grupo.createMany({
        data: [
          {
            id: introPrev2GroupId,
            clave: 'INTRO-PREV2',
            planId: planRn01Id,
            asignaturaId: id('intro'),
            periodoId: prev2PeriodId,
            politicaId: id('politica'),
            docenteId: id('persona-docente1'),
            cupo: 10,
          },
          {
            id: introPrev1GroupId,
            clave: 'INTRO-PREV1',
            planId: planRn01Id,
            asignaturaId: id('intro'),
            periodoId: id('anterior'),
            politicaId: id('politica'),
            docenteId: id('persona-docente1'),
            cupo: 10,
          },
          {
            id: comPrevGroupId,
            clave: 'COM-PREV',
            planId: planRn01Id,
            asignaturaId: id('comunicacion'),
            periodoId: id('anterior'),
            politicaId: id('politica'),
            docenteId: id('persona-docente1'),
            cupo: 10,
          },
          {
            id: avzPrevGroupId,
            clave: 'AVZ-PREV',
            planId: planRn01Id,
            asignaturaId: id('avanzada'),
            periodoId: id('anterior'),
            politicaId: id('politica'),
            docenteId: id('persona-docente2'),
            cupo: 10,
          },
          {
            id: introFullGroupId,
            clave: 'INTRO-LLENO-RN01',
            planId: planRn01Id,
            asignaturaId: id('intro'),
            periodoId: id('actual'),
            politicaId: id('politica'),
            docenteId: id('persona-docente1'),
            cupo: 1,
          },
          {
            id: introOpenGroupId,
            clave: 'INTRO-ABIERTO-RN01',
            planId: planRn01Id,
            asignaturaId: id('intro'),
            periodoId: id('actual'),
            politicaId: id('politica'),
            docenteId: id('persona-docente2'),
            cupo: 10,
          },
          {
            id: avzActualGroupId,
            clave: 'AVZ-ACTUAL-RN01',
            planId: planRn01Id,
            asignaturaId: id('avanzada'),
            periodoId: id('actual'),
            politicaId: id('politica'),
            docenteId: id('persona-docente2'),
            cupo: 10,
          },
          {
            id: proyActualGroupId,
            clave: 'PROY-ACTUAL',
            planId: planRn01Id,
            asignaturaId: id('proyecto'),
            periodoId: id('actual'),
            politicaId: id('politica'),
            docenteId: id('persona-docente1'),
            cupo: 10,
          },
          {
            id: comActualGroupId,
            clave: 'COM-ACTUAL',
            planId: planRn01Id,
            asignaturaId: id('comunicacion'),
            periodoId: id('actual'),
            politicaId: id('politica'),
            docenteId: id('persona-docente1'),
            cupo: 10,
          },
        ],
      });
      // Llenar el único lugar de introFullGroupId con estudiante4
      await tx.inscripcion.create({
        data: {
          estudianteId: id('persona-estudiante4'),
          planId: planRn01Id,
          grupoId: introFullGroupId,
          asignaturaId: id('intro'),
          periodoId: id('actual'),
          politicaId: id('politica'),
          estado: 'PENDIENTE',
          creditosSnapshot: '6.00',
        },
      });

      const student = await login(app, await correo('estudiante3'));
      const api = authenticated(app, student);

      // Caso 1: 0 prerrequisitos ('comunicacion') y grupo con cupo lleno ('introFullGroupId')
      let offer = await api.get('/matriculas/oferta').expect(200);
      const comOffer = offer.body.find((g: { grupoId: string }) => g.grupoId === comActualGroupId);
      const fullOffer = offer.body.find((g: { grupoId: string }) => g.grupoId === introFullGroupId);
      expect(comOffer).toMatchObject({
        puedeInscribirse: true,
        motivo: null,
        cupo: 10,
        ocupacion: 0,
      });
      expect(fullOffer).toMatchObject({
        puedeInscribirse: false,
        motivo: 'El grupo ya no tiene lugares disponibles.',
        cupo: 1,
        ocupacion: 1,
      });
      await api.post('/matriculas').send({ grupoId: introFullGroupId }).expect(409);

      // Caso 2: 1 prerrequisito ('avanzada' exige 'intro') con 'intro' PENDIENTE (notaFinal: null)
      const pendingIntro = await tx.inscripcion.create({
        data: {
          estudianteId: id('persona-estudiante3'),
          planId: planRn01Id,
          grupoId: introPrev2GroupId,
          asignaturaId: id('intro'),
          periodoId: prev2PeriodId,
          politicaId: id('politica'),
          estado: 'PENDIENTE',
          notaFinal: null,
          creditosSnapshot: '6.00',
        },
      });
      offer = await api.get('/matriculas/oferta').expect(200);
      expect(
        offer.body.find((g: { grupoId: string }) => g.grupoId === avzActualGroupId),
      ).toMatchObject({
        puedeInscribirse: false,
        motivo: 'Acredita primero: Fundamentos de programación.',
      });
      await api.post('/matriculas').send({ grupoId: avzActualGroupId }).expect(409);

      // Caso 3: 'intro' REPROBADA (notaFinal: 5.00 < 6.00) -> sigue bloqueando 'avanzada'
      await tx.inscripcion.update({
        where: { id: pendingIntro.id },
        data: { estado: 'CALIFICADA', notaFinal: '5.00' },
      });
      offer = await api.get('/matriculas/oferta').expect(200);
      expect(
        offer.body.find((g: { grupoId: string }) => g.grupoId === avzActualGroupId),
      ).toMatchObject({
        puedeInscribirse: false,
        motivo: 'Acredita primero: Fundamentos de programación.',
      });
      await api.post('/matriculas').send({ grupoId: avzActualGroupId }).expect(409);

      // Caso 4: Comportamiento con EXIGIR_PRERREQUISITOS=false (mismo estado en BD)
      const moduleNoPrereq = await Test.createTestingModule({
        imports: [AppModule.register({ ...env, EXIGIR_PRERREQUISITOS: false })],
      })
        .overrideProvider(DatabaseService)
        .useValue({
          client: tx,
          transaction: async <T>(fn: (client: Prisma.TransactionClient) => Promise<T>) => {
            await tx.$executeRawUnsafe('SAVEPOINT matricula_noprereq');
            try {
              const result = await fn(tx);
              await tx.$executeRawUnsafe('RELEASE SAVEPOINT matricula_noprereq');
              return result;
            } catch (error) {
              await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT matricula_noprereq');
              await tx.$executeRawUnsafe('RELEASE SAVEPOINT matricula_noprereq');
              throw error;
            }
          },
        })
        .compile();
      const appNoPrereq = moduleNoPrereq.createNestApplication();
      await appNoPrereq.init();
      try {
        const studentNoPrereq = await login(appNoPrereq, await correo('estudiante3'));
        const apiNoPrereq = authenticated(appNoPrereq, studentNoPrereq);
        const offerNoPrereq = await apiNoPrereq.get('/matriculas/oferta').expect(200);
        expect(
          offerNoPrereq.body.find((g: { grupoId: string }) => g.grupoId === proyActualGroupId),
        ).toMatchObject({
          puedeInscribirse: true,
          motivo: null,
        });
      } finally {
        await appNoPrereq.close();
      }

      // Caso 5: 'intro' RECURSADA (intento reprobado 5.00 en prev2PeriodId + intento aprobado 6.00 en 'anterior')
      await tx.inscripcion.create({
        data: {
          estudianteId: id('persona-estudiante3'),
          planId: planRn01Id,
          grupoId: introPrev1GroupId,
          asignaturaId: id('intro'),
          periodoId: id('anterior'),
          politicaId: id('politica'),
          estado: 'CALIFICADA',
          notaFinal: '6.00',
          creditosSnapshot: '6.00',
        },
      });
      offer = await api.get('/matriculas/oferta').expect(200);
      expect(
        offer.body.find((g: { grupoId: string }) => g.grupoId === avzActualGroupId),
      ).toMatchObject({
        puedeInscribirse: true,
        motivo: null,
      });
      // Además, como 'intro' ya está aprobada y la política no permite reinscripción aprobada:
      expect(
        offer.body.find((g: { grupoId: string }) => g.grupoId === introOpenGroupId),
      ).toMatchObject({
        puedeInscribirse: false,
        motivo: 'La política de este periodo no permite reinscribirse a una asignatura aprobada.',
      });
      await api.post('/matriculas').send({ grupoId: introOpenGroupId }).expect(409);

      // Caso 6: Múltiples prerrequisitos ('proyecto' exige 'avanzada' y 'comunicacion')
      // 6a: Ninguno de los dos acreditado
      const proyMissingBoth = offer.body.find(
        (g: { grupoId: string }) => g.grupoId === proyActualGroupId,
      );
      expect(proyMissingBoth.puedeInscribirse).toBe(false);
      expect(proyMissingBoth.motivo).toContain('Programación avanzada');
      expect(proyMissingBoth.motivo).toContain('Comunicación');
      await api.post('/matriculas').send({ grupoId: proyActualGroupId }).expect(409);

      // 6b: Solo 1 de 2 acreditado ('avanzada' aprobada con 8.00, falta 'comunicacion')
      await tx.inscripcion.create({
        data: {
          estudianteId: id('persona-estudiante3'),
          planId: planRn01Id,
          grupoId: avzPrevGroupId,
          asignaturaId: id('avanzada'),
          periodoId: id('anterior'),
          politicaId: id('politica'),
          estado: 'CALIFICADA',
          notaFinal: '8.00',
          creditosSnapshot: '8.00',
        },
      });
      offer = await api.get('/matriculas/oferta').expect(200);
      const proyMissingOne = offer.body.find(
        (g: { grupoId: string }) => g.grupoId === proyActualGroupId,
      );
      expect(proyMissingOne).toMatchObject({
        puedeInscribirse: false,
        motivo: 'Acredita primero: Comunicación.',
      });
      await api.post('/matriculas').send({ grupoId: proyActualGroupId }).expect(409);

      // 6c: Ambos prerrequisitos acreditados -> elegible y POST 201
      await tx.inscripcion.create({
        data: {
          estudianteId: id('persona-estudiante3'),
          planId: planRn01Id,
          grupoId: comPrevGroupId,
          asignaturaId: id('comunicacion'),
          periodoId: id('anterior'),
          politicaId: id('politica'),
          estado: 'CALIFICADA',
          notaFinal: '7.50',
          creditosSnapshot: '4.00',
        },
      });
      offer = await api.get('/matriculas/oferta').expect(200);
      const proyReady = offer.body.find(
        (g: { grupoId: string }) => g.grupoId === proyActualGroupId,
      );
      expect(proyReady).toMatchObject({
        puedeInscribirse: true,
        motivo: null,
        cupo: 10,
        ocupacion: 0,
      });
      await api.post('/matriculas').send({ grupoId: proyActualGroupId }).expect(201);

      // Tras inscribirse, GET /matriculas/oferta reporta duplicidad y ocupación actualizada (1)
      offer = await api.get('/matriculas/oferta').expect(200);
      expect(
        offer.body.find((g: { grupoId: string }) => g.grupoId === proyActualGroupId),
      ).toMatchObject({
        puedeInscribirse: false,
        motivo: 'Ya tienes una inscripción a esta asignatura en el periodo.',
        cupo: 10,
        ocupacion: 1,
      });
    });
  });

  it('dos estudiantes que compiten por el último lugar producen una sola inscripción', async () => {
    await concurrentFixture(
      async ({ app, correo, id }) => {
        const auditBefore = await client.auditoria.count({ where: { recurso: 'Inscripcion' } });
        const [student2, student3] = await Promise.all([
          login(app, await correo('estudiante2')),
          login(app, await correo('estudiante3')),
        ]);
        const results = await Promise.all([
          authenticated(app, student2)
            .post('/matriculas')
            .send({ grupoId: id('intro-alterno') }),
          authenticated(app, student3)
            .post('/matriculas')
            .send({ grupoId: id('intro-alterno') }),
        ]);
        expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
        const group = await client.grupo.findUniqueOrThrow({ where: { id: id('intro-alterno') } });
        const occupancy = await client.inscripcion.count({
          where: { grupoId: id('intro-alterno'), estado: { not: 'CANCELADA' } },
        });
        expect(group.cupo).toBe(1);
        expect(occupancy).toBe(1);
        expect(occupancy).toBeLessThanOrEqual(group.cupo);
        expect(await client.auditoria.count({ where: { recurso: 'Inscripcion' } })).toBe(
          auditBefore + 1,
        );
      },
      async (tx, id) => {
        await tx.grupo.update({ where: { id: id('intro-alterno') }, data: { cupo: 1 } });
      },
    );
  });

  it('admite veinte estudiantes concurrentes cuando hay veinte plazas', async () => {
    const count = 20;
    await concurrentFixture(
      async ({ app, id }) => {
        const sessions = await Promise.all(
          Array.from({ length: count }, (_, index) =>
            login(app, `carga-${id(String(index))}@example.invalid`),
          ),
        );
        const auditBefore = await client.auditoria.count({ where: { recurso: 'Inscripcion' } });
        const results = await Promise.all(
          sessions.map((session) =>
            authenticated(app, session)
              .post('/matriculas')
              .send({ grupoId: id('intro-alterno') }),
          ),
        );
        expect(results.map((result) => result.status)).toEqual(Array(count).fill(201));
        expect(
          await client.inscripcion.count({
            where: { grupoId: id('intro-alterno'), estado: { not: 'CANCELADA' } },
          }),
        ).toBe(count);
        expect(await client.auditoria.count({ where: { recurso: 'Inscripcion' } })).toBe(
          auditBefore + count,
        );
        await authenticated(app, sessions[0]!)
          .post('/matriculas')
          .send({ grupoId: id('intro-alterno') })
          .expect(409);
      },
      async (tx, id) => {
        const hash = await bcrypt.hash(password, 4);
        await tx.grupo.update({ where: { id: id('intro-alterno') }, data: { cupo: count } });
        await tx.usuario.createMany({
          data: Array.from({ length: count }, (_, index) => ({
            id: id(`usuario-${index}`),
            correo: `carga-${id(String(index))}@example.invalid`,
            passwordHash: hash,
            rol: 'ESTUDIANTE',
            activo: true,
          })),
        });
        await tx.estudiante.createMany({
          data: Array.from({ length: count }, (_, index) => ({
            id: id(`estudiante-carga-${index}`),
            usuarioId: id(`usuario-${index}`),
            matricula: id(String(index)).toUpperCase(),
            nombre: `Estudiante ficticio ${index}`,
            planId: id('plan-software'),
            fechaIngreso: new Date('2026-01-01'),
          })),
        });
      },
    );
  });

  it('el mismo estudiante no ocupa dos grupos paralelos para la misma materia y periodo', async () => {
    await concurrentFixture(
      async ({ app, correo, id }) => {
        const auditBefore = await client.auditoria.count({ where: { recurso: 'Inscripcion' } });
        const student = await login(app, await correo('estudiante3'));
        const results = await Promise.all([
          authenticated(app, student)
            .post('/matriculas')
            .send({ grupoId: id('intro-actual') }),
          authenticated(app, student)
            .post('/matriculas')
            .send({ grupoId: id('intro-alterno') }),
        ]);
        expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
        expect(
          await client.inscripcion.count({
            where: {
              estudianteId: id('persona-estudiante3'),
              asignaturaId: id('intro'),
              periodoId: id('actual'),
            },
          }),
        ).toBe(1);
        const occupancy = await client.inscripcion.count({
          where: {
            grupoId: { in: [id('intro-actual'), id('intro-alterno')] },
            estado: { not: 'CANCELADA' },
          },
        });
        expect(occupancy).toBe(2); // El grupo intro-actual ya tenía una inscripción ficticia.
        expect(await client.auditoria.count({ where: { recurso: 'Inscripcion' } })).toBe(
          auditBefore + 1,
        );
      },
      async (tx, id) => {
        await tx.grupo.update({ where: { id: id('intro-actual') }, data: { cupo: 10 } });
      },
    );
  });
});

afterAll(async () => {
  await client.$disconnect();
});
