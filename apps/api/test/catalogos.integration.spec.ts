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
const rollback = new Error('Rollback catálogos');
const password = 'ClaveFicticiaDePrueba_2026!';
jest.setTimeout(30000);

type TestContext = {
  app: INestApplication;
  tx: Prisma.TransactionClient;
  id: (name: string) => string;
  correo: (name: string) => Promise<string>;
};

async function fixture(run: (context: TestContext) => Promise<void>) {
  const namespace = `catalogos-${randomUUID()}`;
  try {
    await client.$transaction(
      async (tx) => {
        await seedData(tx, namespace);
        const hash = await bcrypt.hash(password, 4);
        const id = (name: string) => seedId(namespace, name);
        await tx.periodo.update({
          where: { id: id('actual') },
          data: {
            inscripcionInicio: new Date(Date.now() - 86_400_000),
            inscripcionFin: new Date(Date.now() + 86_400_000),
          },
        });
        for (const name of ['admin', 'estudiante1', 'estudiante3', 'docente1']) {
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
              await tx.$executeRawUnsafe('SAVEPOINT catalog_operation');
              try {
                const result = await fn(tx);
                await tx.$executeRawUnsafe('RELEASE SAVEPOINT catalog_operation');
                return result;
              } catch (error) {
                await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT catalog_operation');
                await tx.$executeRawUnsafe('RELEASE SAVEPOINT catalog_operation');
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

function adminRequest(app: INestApplication, cookie: string, csrf: string) {
  const headers = (test: request.Test) =>
    test.set('Cookie', cookie).set('Origin', env.WEB_ORIGIN).set('X-CSRF-Token', csrf);
  return {
    get: (path: string) => headers(request(app.getHttpServer()).get(path)),
    post: (path: string) => headers(request(app.getHttpServer()).post(path)),
    patch: (path: string) => headers(request(app.getHttpServer()).patch(path)),
    put: (path: string) => headers(request(app.getHttpServer()).put(path)),
  };
}

afterAll(async () => {
  await client.$disconnect();
});

describe('RF-04 catálogos y planes con PostgreSQL real', () => {
  it('valida altas, bajas y cambios de contenido sin alterar planes inválidos', async () => {
    await fixture(async ({ app, correo, id }) => {
      const admin = await login(app, await correo('admin'));
      const api = adminRequest(app, admin.cookie, admin.csrf);
      const subject = await api
        .post('/catalogos/asignaturas')
        .send({ clave: 'RAMAS', nombre: 'Asignatura de prueba' })
        .expect(201);
      await api.get('/catalogos/asignaturas?q=RAMAS').expect(200);
      await api
        .patch(`/catalogos/asignaturas/${subject.body.id}`)
        .send({ activo: false })
        .expect(200);
      expect((await api.get('/catalogos/asignaturas?q=RAMAS').expect(200)).body.total).toBe(0);
      expect(
        (await api.get('/catalogos/asignaturas?q=RAMAS&incluirInactivos=true').expect(200)).body
          .total,
      ).toBe(1);
      await api.patch(`/catalogos/asignaturas/${randomUUID()}`).send({ activo: true }).expect(404);
      await api
        .patch(`/catalogos/asignaturas/${subject.body.id}`)
        .send({ activo: true })
        .expect(200);
      await api
        .post('/catalogos/planes')
        .send({ programaId: randomUUID(), version: 1, nombre: 'Inválido' })
        .expect(400);
      const plan = await api
        .post('/catalogos/planes')
        .send({ programaId: id('software'), version: 91, nombre: 'Plan de prueba' })
        .expect(201);
      await api.get('/catalogos/planes?q=prueba&incluirInactivos=true').expect(200);
      await api
        .patch(`/catalogos/planes/${randomUUID()}`)
        .send({ nombre: 'No existe' })
        .expect(404);
      await api.patch(`/catalogos/planes/${plan.body.id}`).send({ activo: false }).expect(200);
      const course = {
        asignaturaId: subject.body.id,
        creditos: '3',
        semestreSugerido: 1,
        prerrequisitos: [] as string[],
      };
      const save = (asignaturas: (typeof course)[], revision = plan.body.revision) =>
        api.put(`/catalogos/planes/${plan.body.id}/contenido`).send({ revision, asignaturas });
      await save([course]).expect(409);
      await api.patch(`/catalogos/planes/${plan.body.id}`).send({ activo: true }).expect(200);
      await save([{ ...course, creditos: '0' }]).expect(400);
      await save([course, course]).expect(400);
      await save([{ ...course, prerrequisitos: [subject.body.id] }]).expect(400);
      await save([{ ...course, prerrequisitos: [randomUUID()] }]).expect(400);
      await save([{ ...course, asignaturaId: randomUUID() }]).expect(400);
      const saved = await save([course]).expect(200);
      await save([], plan.body.revision).expect(409);
      expect(
        (await api.get(`/catalogos/planes/${plan.body.id}`).expect(200)).body.asignaturas,
      ).toHaveLength(1);
      await save([], saved.body.revision).expect(200);
    });
  });
  it('protege lectura y cambios del catálogo con rol administrador y CSRF', async () => {
    await fixture(async ({ app, correo }) => {
      await request(app.getHttpServer()).get('/catalogos/programas').expect(401);
      const student = await login(app, await correo('estudiante1'));
      await request(app.getHttpServer())
        .get('/catalogos/programas')
        .set('Cookie', student.cookie)
        .expect(403);
      await request(app.getHttpServer())
        .post('/catalogos/programas')
        .set('Cookie', student.cookie)
        .set('X-CSRF-Token', student.csrf)
        .set('Origin', env.WEB_ORIGIN)
        .send({ clave: 'DENEGADO', nombre: 'No permitido' })
        .expect(403);
      const admin = await login(app, await correo('admin'));
      await request(app.getHttpServer())
        .post('/catalogos/programas')
        .set('Cookie', admin.cookie)
        .set('Origin', env.WEB_ORIGIN)
        .send({ clave: 'FALTA-CSRF', nombre: 'Debe rechazarse' })
        .expect(403);
    });
  });

  it('normaliza clave, rechaza duplicados, pagina y da de baja sin borrar', async () => {
    await fixture(async ({ app, correo, tx }) => {
      const admin = await login(app, await correo('admin'));
      const created = await adminRequest(app, admin.cookie, admin.csrf)
        .post('/catalogos/programas')
        .send({ clave: '  codeshift  ', nombre: 'CodeShift Formación' })
        .expect(201);
      expect(created.body.clave).toBe('CODESHIFT');
      await adminRequest(app, admin.cookie, admin.csrf)
        .post('/catalogos/programas')
        .send({ clave: 'codeshift', nombre: 'Duplicado' })
        .expect(409);

      const page = await adminRequest(app, admin.cookie, admin.csrf)
        .get('/catalogos/programas?q=CodeShift&page=1&pageSize=1')
        .expect(200);
      expect(page.body.total).toBe(1);
      expect(page.body.items).toHaveLength(1);
      expect(page.body.pageSize).toBe(1);

      const disabled = await adminRequest(app, admin.cookie, admin.csrf)
        .patch(`/catalogos/programas/${created.body.id}`)
        .send({ activo: false })
        .expect(200);
      expect(disabled.body.activo).toBe(false);
      const audit = await tx.auditoria.findFirstOrThrow({
        where: { recurso: 'Programa', recursoId: created.body.id, accion: 'ACTUALIZAR' },
      });
      expect(audit.anterior).toMatchObject({ nombre: 'CodeShift Formación', activo: true });
      expect(audit.posterior).toMatchObject({ nombre: 'CodeShift Formación', activo: false });
      expect(await tx.programa.count({ where: { id: created.body.id } })).toBe(1);
      const visiblePrograms = await adminRequest(app, admin.cookie, admin.csrf)
        .get('/catalogos/programas?q=CodeShift&page=1&pageSize=10')
        .expect(200);
      expect(visiblePrograms.body.total).toBe(0);
      const archivedPrograms = await adminRequest(app, admin.cookie, admin.csrf)
        .get('/catalogos/programas?q=CodeShift&page=1&pageSize=10&incluirInactivos=true')
        .expect(200);
      expect(archivedPrograms.body.total).toBe(1);
      expect(
        await tx.auditoria.count({
          where: {
            actorId: (
              await tx.usuario.findFirstOrThrow({ where: { correo: await correo('admin') } })
            ).id,
            recurso: 'Programa',
          },
        }),
      ).toBeGreaterThanOrEqual(2);
    });
  });

  it('guarda cursos, créditos exactos y prerrequisitos; rechaza ciclos sin mutación parcial', async () => {
    await fixture(async ({ app, correo, tx }) => {
      const admin = await login(app, await correo('admin'));
      const create = (path: string, body: Record<string, unknown>) =>
        adminRequest(app, admin.cookie, admin.csrf).post(path).send(body);
      const program = await create('/catalogos/programas', {
        clave: 'NUEVO-PROG',
        nombre: 'Programa nuevo',
      }).expect(201);
      const firstSubject = await create('/catalogos/asignaturas', {
        clave: 'CURSO-A',
        nombre: 'Curso inicial',
      }).expect(201);
      const secondSubject = await create('/catalogos/asignaturas', {
        clave: 'CURSO-B',
        nombre: 'Curso avanzado',
      }).expect(201);
      const thirdSubject = await create('/catalogos/asignaturas', {
        clave: 'CURSO-C',
        nombre: 'Curso integrador',
      }).expect(201);
      const plan = await create('/catalogos/planes', {
        programaId: program.body.id,
        version: 1,
        nombre: 'Plan base',
      }).expect(201);
      const saved = await adminRequest(app, admin.cookie, admin.csrf)
        .put(`/catalogos/planes/${plan.body.id}/contenido`)
        .send({
          revision: plan.body.revision,
          asignaturas: [
            {
              asignaturaId: firstSubject.body.id,
              creditos: '3.50',
              semestreSugerido: 1,
              prerrequisitos: [],
            },
            {
              asignaturaId: secondSubject.body.id,
              creditos: '4',
              semestreSugerido: 2,
              prerrequisitos: [firstSubject.body.id],
            },
          ],
        })
        .expect(200);
      expect(saved.body.contenidoEditable).toBe(true);
      expect(saved.body.asignaturas[0].creditos).toBe('3.50');
      expect(saved.body.asignaturas[1].prerrequisitos).toEqual([firstSubject.body.id]);
      const audit = await tx.auditoria.findFirstOrThrow({
        where: { recurso: 'PlanEstudio', recursoId: plan.body.id, accion: 'ACTUALIZAR_CONTENIDO' },
      });
      expect(audit.anterior).toEqual({ revision: plan.body.revision, asignaturas: [] });
      expect(audit.posterior).toEqual({
        revision: saved.body.revision,
        asignaturas: [
          {
            asignaturaId: firstSubject.body.id,
            creditos: '3.50',
            semestreSugerido: 1,
            prerrequisitos: [],
          },
          {
            asignaturaId: secondSubject.body.id,
            creditos: '4.00',
            semestreSugerido: 2,
            prerrequisitos: [firstSubject.body.id],
          },
        ],
      });

      // Rechaza ciclo directo A -> B -> A
      await adminRequest(app, admin.cookie, admin.csrf)
        .put(`/catalogos/planes/${plan.body.id}/contenido`)
        .send({
          revision: saved.body.revision,
          asignaturas: [
            {
              asignaturaId: firstSubject.body.id,
              creditos: '3.50',
              semestreSugerido: 1,
              prerrequisitos: [secondSubject.body.id],
            },
            {
              asignaturaId: secondSubject.body.id,
              creditos: '4',
              semestreSugerido: 2,
              prerrequisitos: [firstSubject.body.id],
            },
          ],
        })
        .expect(400);

      // Rechaza ciclo transitivo de tres nodos A -> B -> C -> A
      await adminRequest(app, admin.cookie, admin.csrf)
        .put(`/catalogos/planes/${plan.body.id}/contenido`)
        .send({
          revision: saved.body.revision,
          asignaturas: [
            {
              asignaturaId: firstSubject.body.id,
              creditos: '3.50',
              semestreSugerido: 1,
              prerrequisitos: [thirdSubject.body.id],
            },
            {
              asignaturaId: secondSubject.body.id,
              creditos: '4',
              semestreSugerido: 2,
              prerrequisitos: [firstSubject.body.id],
            },
            {
              asignaturaId: thirdSubject.body.id,
              creditos: '5',
              semestreSugerido: 3,
              prerrequisitos: [secondSubject.body.id],
            },
          ],
        })
        .expect(400);

      const unchanged = await adminRequest(app, admin.cookie, admin.csrf)
        .get(`/catalogos/planes/${plan.body.id}`)
        .expect(200);
      expect(unchanged.body.asignaturas).toHaveLength(2);
      expect(unchanged.body.asignaturas[0].prerrequisitos).toEqual([]);
      expect(unchanged.body.asignaturas[1].prerrequisitos).toEqual([firstSubject.body.id]);
      expect(
        await tx.auditoria.count({
          where: {
            recurso: 'PlanEstudio',
            recursoId: plan.body.id,
            accion: 'ACTUALIZAR_CONTENIDO',
          },
        }),
      ).toBe(1);
    });
  });

  it('protege planes con historial y permite editar una nueva versión que conserva el grafo', async () => {
    await fixture(async ({ app, correo, id }) => {
      const admin = await login(app, await correo('admin'));
      const original = await adminRequest(app, admin.cookie, admin.csrf)
        .get(`/catalogos/planes/${id('plan-software')}`)
        .expect(200);
      expect(original.body.contenidoEditable).toBe(false);
      expect(original.body.historial.inscripciones).toBeGreaterThan(0);
      await adminRequest(app, admin.cookie, admin.csrf)
        .put(`/catalogos/planes/${id('plan-software')}/contenido`)
        .send({
          revision: original.body.revision,
          asignaturas: original.body.asignaturas.map(
            (course: {
              asignaturaId: string;
              creditos: string;
              semestreSugerido: number;
              prerrequisitos: string[];
            }) => ({
              asignaturaId: course.asignaturaId,
              creditos: course.creditos,
              semestreSugerido: course.semestreSugerido,
              prerrequisitos: course.prerrequisitos,
            }),
          ),
        })
        .expect(409);

      const cloned = await adminRequest(app, admin.cookie, admin.csrf)
        .post(`/catalogos/planes/${id('plan-software')}/nueva-version`)
        .expect(201);
      expect(cloned.body.version).toBe(2);
      expect(cloned.body.contenidoEditable).toBe(true);
      expect(cloned.body.asignaturas).toHaveLength(original.body.asignaturas.length);
      expect(
        cloned.body.asignaturas.flatMap(
          (course: { prerrequisitos: string[] }) => course.prerrequisitos,
        ),
      ).toHaveLength(2);

      const editedCourses = cloned.body.asignaturas.map(
        (course: {
          asignaturaId: string;
          creditos: string;
          semestreSugerido: number;
          prerrequisitos: string[];
        }) => ({
          asignaturaId: course.asignaturaId,
          creditos: course.creditos,
          semestreSugerido: course.semestreSugerido,
          prerrequisitos: course.prerrequisitos,
        }),
      );
      editedCourses[0]!.creditos = '7.25';
      const edited = await adminRequest(app, admin.cookie, admin.csrf)
        .put(`/catalogos/planes/${cloned.body.id}/contenido`)
        .send({ revision: cloned.body.revision, asignaturas: editedCourses })
        .expect(200);
      expect(edited.body.asignaturas[0].creditos).toBe('7.25');

      const stillOriginal = await adminRequest(app, admin.cookie, admin.csrf)
        .get(`/catalogos/planes/${id('plan-software')}`)
        .expect(200);
      expect(stillOriginal.body.asignaturas[0].creditos).toBe(
        original.body.asignaturas[0].creditos,
      );
    });
  });

  it('D41 y AUD-19: acredita los dos programas sintéticos de demostración, bajas padre/hijo y preservación del historial', async () => {
    await fixture(async ({ app, correo, id }) => {
      const admin = await login(app, await correo('admin'));
      const api = adminRequest(app, admin.cookie, admin.csrf);
      const student1 = await login(app, await correo('estudiante1'));
      const student3 = await login(app, await correo('estudiante3'));
      const student1Api = adminRequest(app, student1.cookie, student1.csrf);
      const student3Api = adminRequest(app, student3.cookie, student3.csrf);

      // 1. Verificar explícitamente los dos programas sintéticos de demostración (D41) y sus planes
      const programs = await api.get('/catalogos/programas?page=1&pageSize=20').expect(200);
      const demoSoftware = programs.body.items.find((p: { id: string }) => p.id === id('software'));
      const demoDiseno = programs.body.items.find((p: { id: string }) => p.id === id('diseno'));
      expect(demoSoftware).toMatchObject({
        nombre: 'Desarrollo de Software (demostración)',
        activo: true,
      });
      expect(demoDiseno).toMatchObject({
        nombre: 'Diseño Digital (demostración)',
        activo: true,
      });

      const planSoftware = await api.get(`/catalogos/planes/${id('plan-software')}`).expect(200);
      const planDiseno = await api.get(`/catalogos/planes/${id('plan-diseno')}`).expect(200);
      expect(planSoftware.body.asignaturas).toHaveLength(4);
      expect(planDiseno.body.asignaturas).toHaveLength(2);

      // 2. Crear desde cero un programa, plan, asignaturas, prerrequisito, período y grupo
      const newProg = await api
        .post('/catalogos/programas')
        .send({ clave: 'PROG-R03', nombre: 'Programa Sintético R03 (demostración)' })
        .expect(201);
      const newPlan = await api
        .post('/catalogos/planes')
        .send({ programaId: newProg.body.id, version: 1, nombre: 'Plan R03 v1' })
        .expect(201);
      const sub1 = await api
        .post('/catalogos/asignaturas')
        .send({ clave: 'MAT-R03-1', nombre: 'Álgebra R03' })
        .expect(201);
      const sub2 = await api
        .post('/catalogos/asignaturas')
        .send({ clave: 'MAT-R03-2', nombre: 'Cálculo R03' })
        .expect(201);
      await api
        .put(`/catalogos/planes/${newPlan.body.id}/contenido`)
        .send({
          revision: newPlan.body.revision,
          asignaturas: [
            {
              asignaturaId: sub1.body.id,
              creditos: '5.00',
              semestreSugerido: 1,
              prerrequisitos: [],
            },
            {
              asignaturaId: sub2.body.id,
              creditos: '6.00',
              semestreSugerido: 2,
              prerrequisitos: [sub1.body.id],
            },
          ],
        })
        .expect(200);
      const newPeriod = await api
        .post('/periodos')
        .send({
          clave: 'PER-R03',
          nombre: 'Periodo R03',
          inicio: '2026-08-01',
          fin: '2026-12-20',
          inscripcionInicio: new Date(Date.now() - 3600_000).toISOString(),
          inscripcionFin: new Date(Date.now() + 3600_000).toISOString(),
          estado: 'ABIERTO',
          politicaId: id('politica'),
        })
        .expect(201);
      await api
        .post('/grupos')
        .send({
          clave: 'GRP-R03-1',
          planId: newPlan.body.id,
          asignaturaId: sub1.body.id,
          periodoId: newPeriod.body.id,
          docenteId: id('persona-docente1'),
          cupo: 15,
        })
        .expect(201);

      // 3. Bajas padre/hijo sobre el nuevo programa sin historial y sobre el programa con historial
      const editablePlan = await api
        .post('/catalogos/planes')
        .send({ programaId: newProg.body.id, version: 2, nombre: 'Plan R03 v2 editable' })
        .expect(201);
      await api
        .patch(`/catalogos/programas/${newProg.body.id}`)
        .send({ activo: false })
        .expect(200);

      // Con el programa padre inactivo:
      // - No se permite crear planes nuevos ni clonar versión
      await api
        .post('/catalogos/planes')
        .send({
          programaId: newProg.body.id,
          version: 3,
          nombre: 'Rechazado por programa inactivo',
        })
        .expect(400);
      await api.post(`/catalogos/planes/${newPlan.body.id}/nueva-version`).expect(409);
      // - No se permite modificar contenido de un plan cuyo programa padre está inactivo
      await api
        .put(`/catalogos/planes/${editablePlan.body.id}/contenido`)
        .send({
          revision: editablePlan.body.revision,
          asignaturas: [
            {
              asignaturaId: sub1.body.id,
              creditos: '5.00',
              semestreSugerido: 1,
              prerrequisitos: [],
            },
          ],
        })
        .expect(409);
      // - No se permite activar un plan inactivo si su programa padre está inactivo
      await api
        .patch(`/catalogos/planes/${editablePlan.body.id}`)
        .send({ activo: false })
        .expect(200);
      await api
        .patch(`/catalogos/planes/${editablePlan.body.id}`)
        .send({ activo: true })
        .expect(409);
      // - No se permite crear grupos nuevos ni estudiantes nuevos sobre un plan de programa inactivo
      await api
        .post('/grupos')
        .send({
          clave: 'GRP-R03-BLOQ',
          planId: newPlan.body.id,
          asignaturaId: sub2.body.id,
          periodoId: newPeriod.body.id,
          docenteId: id('persona-docente1'),
          cupo: 10,
        })
        .expect(400);
      await api
        .post('/personas/estudiantes')
        .send({
          correo: 'bloqueado.r03@example.invalid',
          matricula: 'BLOQ-R03',
          nombre: 'Estudiante Bloqueado',
          planId: newPlan.body.id,
          fechaIngreso: '2026-08-24',
        })
        .expect(400);

      // 4. Desactivar el programa padre 'software' bloquea nuevas matrículas en sus grupos pero preserva todo el historial
      const offerBefore = await student3Api.get('/matriculas/oferta').expect(200);
      expect(
        offerBefore.body.some((g: { grupoId: string }) => g.grupoId === id('intro-alterno')),
      ).toBe(true);

      await api
        .patch(`/catalogos/programas/${id('software')}`)
        .send({ activo: false })
        .expect(200);
      const offerWhileProgInactive = await student3Api.get('/matriculas/oferta').expect(200);
      expect(offerWhileProgInactive.body).toHaveLength(0);
      await student3Api
        .post('/matriculas')
        .send({ grupoId: id('intro-alterno') })
        .expect(409);

      // El historial académico, kárdex, avance y reportes de estudiante1 siguen intactos
      const history1 = await student1Api.get('/matriculas/me').expect(200);
      expect(history1.body.length).toBeGreaterThanOrEqual(2);
      const kardex1 = await student1Api.get('/estudiantes/me/calificaciones').expect(200);
      expect(kardex1.body.promedioGeneral).toBe('8.50');
      const progress1 = await student1Api.get('/estudiantes/me/progreso').expect(200);
      expect(progress1.body.creditosAprobados).toBe('6.00');
      const groupReport = await api.get('/reportes/grupos').expect(200);
      expect(groupReport.body.total).toBeGreaterThanOrEqual(5);
      const csvReport = await api
        .get(`/reportes/grupos/${id('intro-anterior')}/historial.csv`)
        .expect(200);
      expect(csvReport.text).toContain('Ana Ejemplo');

      // Reactivar el programa y verificar que desactivar el plan también bloquea oferta/matrícula preservando historial
      await api
        .patch(`/catalogos/programas/${id('software')}`)
        .send({ activo: true })
        .expect(200);
      await api
        .patch(`/catalogos/planes/${id('plan-software')}`)
        .send({ activo: false })
        .expect(200);
      expect((await student3Api.get('/matriculas/oferta').expect(200)).body).toHaveLength(0);
      await student3Api
        .post('/matriculas')
        .send({ grupoId: id('intro-alterno') })
        .expect(409);
      await api
        .patch(`/catalogos/planes/${id('plan-software')}`)
        .send({ activo: true })
        .expect(200);
    });
  });
});
