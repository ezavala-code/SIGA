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
  EXIGIR_PRERREQUISITOS: 'true',
});
const client = createDatabaseClient(databaseUrl);
const rollback = new Error('Rollback calificaciones');
const password = 'ClaveFicticiaDePrueba_2026!';
jest.setTimeout(60000);

beforeAll(async () => {
  const rows = await client.$queryRaw<{ schema: string }[]>`SELECT current_schema() AS schema`;
  expect(rows[0]?.schema).toBe(new URL(databaseUrl).searchParams.get('schema') ?? 'public');
});

type Context = {
  app: INestApplication;
  tx: Prisma.TransactionClient;
  id: (name: string) => string;
  correo: (name: string) => Promise<string>;
};

async function fixture(run: (context: Context) => Promise<void>) {
  const namespace = `calificaciones-${randomUUID()}`;
  try {
    await client.$transaction(
      async (tx) => {
        await seedData(tx, namespace);
        const id = (name: string) => seedId(namespace, name);
        const hash = await bcrypt.hash(password, 4);
        for (const name of [
          'estudiante1',
          'estudiante2',
          'estudiante3',
          'docente1',
          'docente2',
          'admin',
        ]) {
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
              await tx.$executeRawUnsafe('SAVEPOINT calificacion_operation');
              try {
                const result = await fn(tx);
                await tx.$executeRawUnsafe('RELEASE SAVEPOINT calificacion_operation');
                return result;
              } catch (error) {
                await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT calificacion_operation');
                await tx.$executeRawUnsafe('RELEASE SAVEPOINT calificacion_operation');
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

function api(app: INestApplication, session: { cookie: string; csrf: string }) {
  const headers = (test: request.Test) =>
    test
      .set('Cookie', session.cookie)
      .set('Origin', env.WEB_ORIGIN)
      .set('X-CSRF-Token', session.csrf);
  return {
    get: (path: string) => headers(request(app.getHttpServer()).get(path)),
    put: (path: string) => headers(request(app.getHttpServer()).put(path)),
    patch: (path: string) => headers(request(app.getHttpServer()).patch(path)),
  };
}

type ConcurrentContext = {
  app: INestApplication;
  id: (name: string) => string;
  correo: (name: string) => Promise<string>;
};

async function concurrentFixture(run: (context: ConcurrentContext) => Promise<void>) {
  const namespace = `calificaciones-race-${randomUUID()}`;
  const id = (name: string) => seedId(namespace, name);
  let app: INestApplication | undefined;
  try {
    await client.$transaction(async (tx) => {
      await seedData(tx, namespace);
      const hash = await bcrypt.hash(password, 4);
      for (const name of ['docente1', 'estudiante1']) {
        await tx.usuario.update({
          where: { id: id(name) },
          data: { activo: true, passwordHash: hash },
        });
      }
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

describe('RF-07 y RF-09 calificaciones con PostgreSQL real', () => {
  it('limita captura al docente asignado, versiona cambios y exige motivo en correcciones', async () => {
    await fixture(async ({ app, correo, id, tx }) => {
      const teacher = api(app, await login(app, await correo('docente1')));
      const roster = await teacher
        .get(`/docentes/me/grupos/${id('intro-actual')}/calificaciones`)
        .expect(200);
      const inscription = roster.body.items.find(
        (item: { inscripcionId: string }) => item.inscripcionId === id('grupo-lleno'),
      );
      expect(inscription).toMatchObject({ estado: 'PENDIENTE', version: 1, notaFinal: null });

      const otherTeacher = api(app, await login(app, await correo('docente2')));
      await otherTeacher
        .get(`/docentes/me/grupos/${id('intro-actual')}/calificaciones`)
        .expect(404);
      await otherTeacher
        .put(`/calificaciones/${id('grupo-lleno')}`)
        .send({ notaFinal: '7.5', version: 1 })
        .expect(404);
      const student = api(app, await login(app, await correo('estudiante2')));
      await student
        .put(`/calificaciones/${id('grupo-lleno')}`)
        .send({ notaFinal: '7.5', version: 1 })
        .expect(403);

      const first = await teacher
        .put(`/calificaciones/${id('grupo-lleno')}`)
        .send({ notaFinal: '5.99', version: 1 })
        .expect(200);
      expect(first.body).toMatchObject({ estado: 'CALIFICADA', version: 2, notaFinal: '5.990' });
      const studentAfterFail = await student.get('/estudiantes/me/calificaciones').expect(200);
      expect(
        studentAfterFail.body.items.find(
          (item: { inscripcionId: string }) => item.inscripcionId === id('grupo-lleno'),
        ),
      ).toMatchObject({ resultado: 'REPROBADA', notaFinal: '5.990' });
      expect(
        studentAfterFail.body.items.map((item: { inscripcionId: string }) => item.inscripcionId),
      ).not.toContain(id('ultimo-cupo'));

      await teacher
        .put(`/calificaciones/${id('grupo-lleno')}`)
        .send({ notaFinal: '6.00', version: 2 })
        .expect(400);
      const corrected = await teacher
        .put(`/calificaciones/${id('grupo-lleno')}`)
        .send({ notaFinal: '6.00', version: 2, motivo: 'Corrección tras revisar evidencia.' })
        .expect(200);
      expect(corrected.body).toMatchObject({
        estado: 'CALIFICADA',
        version: 3,
        notaFinal: '6.000',
      });
      await teacher
        .put(`/calificaciones/${id('grupo-lleno')}`)
        .send({ notaFinal: '6.50', version: 2, motivo: 'Versión obsoleta.' })
        .expect(409);

      const persisted = await tx.inscripcion.findUniqueOrThrow({
        where: { id: id('grupo-lleno') },
      });
      expect(persisted.notaFinal?.toFixed(3)).toBe('6.000');
      expect(persisted.version).toBe(3);
      const audits = await tx.auditoria.findMany({
        where: { recurso: 'Inscripcion', recursoId: id('grupo-lleno') },
        orderBy: { creadoEn: 'asc' },
      });
      expect(audits).toHaveLength(2);
      expect(audits[0]?.accion).toBe('CAPTURAR_CALIFICACION');
      expect(audits[1]).toMatchObject({
        accion: 'CORREGIR_CALIFICACION',
        motivo: 'Corrección tras revisar evidencia.',
      });
      const progress = await student.get('/estudiantes/me/progreso').expect(200);
      expect(progress.body.creditosAprobados).toBe('6.00');
    });
  });

  it('valida escala y decimales, acepta cero y no expone grupos ajenos', async () => {
    await fixture(async ({ app, correo, id }) => {
      const teacher = api(app, await login(app, await correo('docente2')));
      const admin = api(app, await login(app, await correo('admin')));
      await admin
        .put(`/calificaciones/${id('ultimo-cupo')}`)
        .send({ notaFinal: '8', version: 1 })
        .expect(403);
      await teacher
        .put(`/calificaciones/${id('ultimo-cupo')}`)
        .send({ notaFinal: '10.01', version: 1 })
        .expect(400);
      await teacher
        .put(`/calificaciones/${id('ultimo-cupo')}`)
        .send({ notaFinal: '8.001', version: 1 })
        .expect(400);
      const zero = await teacher
        .put(`/calificaciones/${id('ultimo-cupo')}`)
        .send({ notaFinal: '0', version: 1 })
        .expect(200);
      expect(zero.body).toMatchObject({ estado: 'CALIFICADA', notaFinal: '0.000' });
      const group = await teacher
        .get(`/docentes/me/grupos/${id('avanzada-actual')}/calificaciones`)
        .expect(200);
      expect(
        group.body.items.map((item: { inscripcionId: string }) => item.inscripcionId),
      ).not.toContain(id('grupo-lleno'));
    });
  });

  it('calcula CP-10/11, conserva historial propio y no duplica créditos por recursamiento', async () => {
    await fixture(async ({ app, correo, id, tx }) => {
      const nextPlanId = randomUUID();
      await tx.planEstudio.create({
        data: {
          id: nextPlanId,
          programaId: id('software'),
          version: 2,
          nombre: 'Plan ficticio 2026 v2',
        },
      });
      await tx.planAsignatura.create({
        data: {
          planId: nextPlanId,
          asignaturaId: id('intro'),
          creditos: '99.00',
          semestreSugerido: 1,
        },
      });
      const communicationGroupId = randomUUID();
      await tx.grupo.create({
        data: {
          id: communicationGroupId,
          clave: `COM-${randomUUID().slice(0, 8).toUpperCase()}`,
          planId: id('plan-software'),
          asignaturaId: id('comunicacion'),
          periodoId: id('anterior'),
          politicaId: id('politica'),
          docenteId: id('persona-docente1'),
          cupo: 20,
        },
      });
      await tx.inscripcion.create({
        data: {
          estudianteId: id('persona-estudiante3'),
          planId: id('plan-software'),
          grupoId: id('intro-anterior'),
          asignaturaId: id('intro'),
          periodoId: id('anterior'),
          politicaId: id('politica'),
          estado: 'CALIFICADA',
          notaFinal: '8.00',
          creditosSnapshot: '6.00',
        },
      });
      await tx.inscripcion.create({
        data: {
          estudianteId: id('persona-estudiante3'),
          planId: id('plan-software'),
          grupoId: communicationGroupId,
          asignaturaId: id('comunicacion'),
          periodoId: id('anterior'),
          politicaId: id('politica'),
          estado: 'CALIFICADA',
          notaFinal: '9.00',
          creditosSnapshot: '4.00',
        },
      });
      await tx.inscripcion.create({
        data: {
          estudianteId: id('persona-estudiante3'),
          planId: id('plan-software'),
          grupoId: id('intro-actual'),
          asignaturaId: id('intro'),
          periodoId: id('actual'),
          politicaId: id('politica'),
          estado: 'CALIFICADA',
          notaFinal: '5.00',
          creditosSnapshot: '6.00',
        },
      });
      await tx.inscripcion.create({
        data: {
          estudianteId: id('persona-estudiante3'),
          planId: id('plan-software'),
          grupoId: id('avanzada-actual'),
          asignaturaId: id('avanzada'),
          periodoId: id('actual'),
          politicaId: id('politica'),
          estado: 'PENDIENTE',
          creditosSnapshot: '8.00',
        },
      });

      const student = api(app, await login(app, await correo('estudiante3')));
      const grades = await student.get('/estudiantes/me/calificaciones').expect(200);
      expect(grades.body.promedioGeneral).toBe('7.13');
      expect(grades.body.periodos).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nombre: 'Periodo ficticio anterior',
            promedio: '8.40',
            intentosCalificados: 2,
          }),
          expect.objectContaining({
            nombre: 'Periodo ficticio actual',
            promedio: '5.00',
            intentosCalificados: 1,
          }),
        ]),
      );
      expect(grades.body.items).toHaveLength(4);
      expect(grades.body.items.every((item: { estudianteId?: string }) => !item.estudianteId)).toBe(
        true,
      );
      const progress = await student.get('/estudiantes/me/progreso').expect(200);
      expect(progress.body).toMatchObject({
        plan: { version: 1, programa: { clave: expect.any(String), nombre: expect.any(String) } },
        creditosTotales: '28.00',
        creditosAprobados: '10.00',
        avancePorcentaje: '35.71',
        asignaturasAprobadas: 2,
        asignaturasTotales: 4,
      });

      const teacher = api(app, await login(app, await correo('docente1')));
      const roster = await teacher
        .get(`/docentes/me/grupos/${communicationGroupId}/calificaciones`)
        .expect(200);
      expect(roster.body.items[0]?.estudiante.nombre).toBe('Carla Prueba');
      await teacher.get(`/docentes/me/grupos/${id('visual-actual')}/calificaciones`).expect(404);
    });
  });

  it('PB-08 y CP-07: ante dos correcciones simultáneas con la misma versión en PATCH /calificaciones/inscripciones/:id confirma exactamente una y rechaza la otra con 409', async () => {
    await concurrentFixture(async ({ app, correo, id }) => {
      const [sessionA, sessionB] = await Promise.all([
        login(app, await correo('docente1')),
        login(app, await correo('docente1')),
      ]);
      const inscripcionId = id('aprobada');
      const before = await client.inscripcion.findUniqueOrThrow({ where: { id: inscripcionId } });
      expect(before.version).toBe(1);
      expect(before.notaFinal?.toFixed(3)).toBe('8.500');

      const [resA, resB] = await Promise.all([
        api(app, sessionA).patch(`/calificaciones/inscripciones/${inscripcionId}`).send({
          notaFinal: '9.10',
          version: 1,
          motivo: 'Corrección simultánea A por revisión de acta.',
        }),
        api(app, sessionB).patch(`/calificaciones/inscripciones/${inscripcionId}`).send({
          notaFinal: '9.40',
          version: 1,
          motivo: 'Corrección simultánea B por revisión de acta.',
        }),
      ]);

      expect([resA.status, resB.status].sort()).toEqual([200, 409]);
      const winner = resA.status === 200 ? resA : resB;
      const expectedNota = resA.status === 200 ? '9.100' : '9.400';
      const expectedMotivo =
        resA.status === 200
          ? 'Corrección simultánea A por revisión de acta.'
          : 'Corrección simultánea B por revisión de acta.';

      expect(winner.body).toMatchObject({
        inscripcionId,
        version: 2,
        estado: 'CALIFICADA',
        notaFinal: expectedNota,
      });

      const after = await client.inscripcion.findUniqueOrThrow({ where: { id: inscripcionId } });
      expect(after.version).toBe(2);
      expect(after.notaFinal?.toFixed(3)).toBe(expectedNota);

      const audits = await client.auditoria.findMany({
        where: {
          recurso: 'Inscripcion',
          recursoId: inscripcionId,
          accion: 'CORREGIR_CALIFICACION',
        },
      });
      expect(audits).toHaveLength(1);
      expect(audits[0]).toMatchObject({
        accion: 'CORREGIR_CALIFICACION',
        recurso: 'Inscripcion',
        recursoId: inscripcionId,
        motivo: expectedMotivo,
        anterior: { estado: 'CALIFICADA', notaFinal: '8.500', version: 1 },
        posterior: { estado: 'CALIFICADA', notaFinal: expectedNota, version: 2 },
      });
    });
  });

  it('D42 y PB-09: verifica en integración todos los casos manuales de referencia (8.40 / 33.33 %, nota 0 vs NULL, recursada TODOS 6 cr únicos y plan con 0 créditos)', async () => {
    await fixture(async ({ app, correo, id, tx }) => {
      // Crear una nueva versión del plan con exactamente 30.00 créditos (6 + 4 + 8 + 12)
      const plan30Id = randomUUID();
      await tx.planEstudio.create({
        data: {
          id: plan30Id,
          programaId: id('software'),
          version: 30,
          nombre: 'Plan D42 30 créditos',
        },
      });
      await tx.planAsignatura.createMany({
        data: [
          { planId: plan30Id, asignaturaId: id('intro'), creditos: '6.00', semestreSugerido: 1 },
          {
            planId: plan30Id,
            asignaturaId: id('comunicacion'),
            creditos: '4.00',
            semestreSugerido: 1,
          },
          { planId: plan30Id, asignaturaId: id('avanzada'), creditos: '8.00', semestreSugerido: 2 },
          {
            planId: plan30Id,
            asignaturaId: id('proyecto'),
            creditos: '12.00',
            semestreSugerido: 3,
          },
        ],
      });
      await tx.estudiante.update({
        where: { id: id('persona-estudiante3') },
        data: { planId: plan30Id },
      });

      const introPrevGroupId = randomUUID();
      const comPrevGroupId = randomUUID();
      const avzActualGroupId = randomUUID();
      const introActualGroupId = randomUUID();
      await tx.grupo.createMany({
        data: [
          {
            id: introPrevGroupId,
            clave: 'INTRO-D42-PREV',
            planId: plan30Id,
            asignaturaId: id('intro'),
            periodoId: id('anterior'),
            politicaId: id('politica'),
            docenteId: id('persona-docente1'),
            cupo: 20,
          },
          {
            id: comPrevGroupId,
            clave: 'COM-D42-REF',
            planId: plan30Id,
            asignaturaId: id('comunicacion'),
            periodoId: id('anterior'),
            politicaId: id('politica'),
            docenteId: id('persona-docente1'),
            cupo: 20,
          },
          {
            id: avzActualGroupId,
            clave: 'AVZ-D42-ACT',
            planId: plan30Id,
            asignaturaId: id('avanzada'),
            periodoId: id('actual'),
            politicaId: id('politica'),
            docenteId: id('persona-docente2'),
            cupo: 20,
          },
          {
            id: introActualGroupId,
            clave: 'INTRO-D42-ACT',
            planId: plan30Id,
            asignaturaId: id('intro'),
            periodoId: id('actual'),
            politicaId: id('politica'),
            docenteId: id('persona-docente1'),
            cupo: 20,
          },
        ],
      });

      // 1. Caso de referencia: 8.00 (6 cr) + 9.00 (4 cr) + PENDIENTE (8 cr) -> promedio 8.40 y avance 33.33 % (10/30 cr)
      const insIntro = await tx.inscripcion.create({
        data: {
          estudianteId: id('persona-estudiante3'),
          planId: plan30Id,
          grupoId: introPrevGroupId,
          asignaturaId: id('intro'),
          periodoId: id('anterior'),
          politicaId: id('politica'),
          estado: 'CALIFICADA',
          notaFinal: '8.00',
          creditosSnapshot: '6.00',
        },
      });
      const insCom = await tx.inscripcion.create({
        data: {
          estudianteId: id('persona-estudiante3'),
          planId: plan30Id,
          grupoId: comPrevGroupId,
          asignaturaId: id('comunicacion'),
          periodoId: id('anterior'),
          politicaId: id('politica'),
          estado: 'CALIFICADA',
          notaFinal: '9.00',
          creditosSnapshot: '4.00',
        },
      });
      const insAvzPending = await tx.inscripcion.create({
        data: {
          estudianteId: id('persona-estudiante3'),
          planId: plan30Id,
          grupoId: avzActualGroupId,
          asignaturaId: id('avanzada'),
          periodoId: id('actual'),
          politicaId: id('politica'),
          estado: 'PENDIENTE',
          notaFinal: null,
          creditosSnapshot: '8.00',
        },
      });

      const student = api(app, await login(app, await correo('estudiante3')));
      const refGrades = await student.get('/estudiantes/me/calificaciones').expect(200);
      expect(refGrades.body.promedioGeneral).toBe('8.40');
      const refProgress = await student.get('/estudiantes/me/progreso').expect(200);
      expect(refProgress.body).toMatchObject({
        creditosTotales: '30.00',
        creditosAprobados: '10.00',
        avancePorcentaje: '33.33',
        asignaturasAprobadas: 2,
        asignaturasTotales: 4,
        sinCreditosEnPlan: false,
      });

      // 2. Calificación 0 (cuenta en promedio con nota 0.000 y 0 créditos aprobados) vs NULL (PENDIENTE)
      await tx.inscripcion.update({
        where: { id: insAvzPending.id },
        data: { estado: 'CALIFICADA', notaFinal: '0.00' },
      });
      const withZero = await student.get('/estudiantes/me/calificaciones').expect(200);
      // ((8*6) + (9*4) + (0*8)) / (6 + 4 + 8) = 84 / 18 = 4.67
      expect(withZero.body.promedioGeneral).toBe('4.67');
      const progressWithZero = await student.get('/estudiantes/me/progreso').expect(200);
      expect(progressWithZero.body.creditosAprobados).toBe('10.00');
      expect(progressWithZero.body.avancePorcentaje).toBe('33.33');

      // 3. Asignatura repetida (reprobada 5.0 e intento aprobado 9.0 de 6 créditos): ambos en promedio TODOS, 6 créditos únicos en avance
      await tx.inscripcion.update({
        where: { id: insAvzPending.id },
        data: { estado: 'CANCELADA', notaFinal: null },
      });
      await tx.inscripcion.update({
        where: { id: insCom.id },
        data: { estado: 'CANCELADA', notaFinal: null },
      });
      await tx.inscripcion.update({
        where: { id: insIntro.id },
        data: { estado: 'CALIFICADA', notaFinal: '5.00' },
      });
      await tx.inscripcion.create({
        data: {
          estudianteId: id('persona-estudiante3'),
          planId: plan30Id,
          grupoId: introActualGroupId,
          asignaturaId: id('intro'),
          periodoId: id('actual'),
          politicaId: id('politica'),
          estado: 'CALIFICADA',
          notaFinal: '9.00',
          creditosSnapshot: '6.00',
        },
      });
      const repeatedGrades = await student.get('/estudiantes/me/calificaciones').expect(200);
      expect(repeatedGrades.body.promedioGeneral).toBe('7.00');
      const repeatedProgress = await student.get('/estudiantes/me/progreso').expect(200);
      expect(repeatedProgress.body).toMatchObject({
        creditosTotales: '30.00',
        creditosAprobados: '6.00',
        avancePorcentaje: '20.00',
        asignaturasAprobadas: 1,
      });

      // 4. Plan con 0 créditos totales: sin división por cero ni NaN
      const emptyPlan = await tx.planEstudio.create({
        data: {
          programaId: id('software'),
          version: 99,
          nombre: 'Plan vacío sin créditos',
        },
      });
      const emptyHash = await bcrypt.hash(password, 4);
      const emptyUser = await tx.usuario.create({
        data: {
          correo: 'estudiante.plan.vacio@example.invalid',
          passwordHash: emptyHash,
          rol: 'ESTUDIANTE',
          activo: true,
        },
      });
      await tx.estudiante.create({
        data: {
          usuarioId: emptyUser.id,
          matricula: 'PLAN-VACIO-01',
          nombre: 'Estudiante Plan Vacío',
          planId: emptyPlan.id,
          fechaIngreso: new Date('2026-08-01T00:00:00.000Z'),
        },
      });
      const emptyStudent = api(app, await login(app, emptyUser.correo));
      const emptyProgress = await emptyStudent.get('/estudiantes/me/progreso').expect(200);
      expect(emptyProgress.body).toMatchObject({
        creditosTotales: '0.00',
        creditosAprobados: '0.00',
        avancePorcentaje: null,
        asignaturasAprobadas: 0,
        asignaturasTotales: 0,
        sinCreditosEnPlan: true,
      });
    });
  });
});

afterAll(async () => {
  await client.$disconnect();
});
