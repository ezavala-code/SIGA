import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
import { provisionarAccesoLocal } from '../src/modules/personas/provisionar-acceso-local.js';
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
const rollback = new Error('Rollback personas');
const password = 'ClaveFicticiaDePrueba_2026!';
jest.setTimeout(30000);

type TestContext = {
  app: INestApplication;
  tx: Prisma.TransactionClient;
  id: (name: string) => string;
  correo: (name: string) => Promise<string>;
};

async function fixture(run: (context: TestContext) => Promise<void>) {
  const namespace = `personas-${randomUUID()}`;
  try {
    await client.$transaction(
      async (tx) => {
        await seedData(tx, namespace);
        const hash = await bcrypt.hash(password, 4);
        const id = (name: string) => seedId(namespace, name);
        for (const name of ['admin', 'estudiante1', 'docente1']) {
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
              await tx.$executeRawUnsafe('SAVEPOINT persona_operation');
              try {
                const result = await fn(tx);
                await tx.$executeRawUnsafe('RELEASE SAVEPOINT persona_operation');
                return result;
              } catch (error) {
                await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT persona_operation');
                await tx.$executeRawUnsafe('RELEASE SAVEPOINT persona_operation');
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
  };
}

afterAll(async () => {
  await client.$disconnect();
});

describe('RF-02/RF-03 gestión de estudiantes y docentes con PostgreSQL real', () => {
  it('valida perfiles inexistentes y permite actualizar un estudiante sin historial y un docente', async () => {
    await fixture(async ({ app, correo, id, tx }) => {
      const admin = await login(app, await correo('admin'));
      const api = adminRequest(app, admin.cookie, admin.csrf);
      await api.get('/personas/docentes?q=docente&incluirInactivos=true').expect(200);
      await api
        .patch(`/personas/estudiantes/${randomUUID()}`)
        .send({ nombre: 'Nadie' })
        .expect(404);
      await api.patch(`/personas/docentes/${randomUUID()}`).send({ nombre: 'Nadie' }).expect(404);
      const created = await api
        .post('/personas/estudiantes')
        .send({
          correo: 'sin.historial@example.invalid',
          matricula: 'SIN-HISTORIAL',
          nombre: 'Sin Historial',
          planId: id('plan-software'),
          fechaIngreso: '2026-08-24',
        })
        .expect(201);
      await api
        .patch(`/personas/estudiantes/${created.body.id}`)
        .send({ planId: randomUUID() })
        .expect(400);
      const updated = await api
        .patch(`/personas/estudiantes/${created.body.id}`)
        .send({
          planId: id('plan-diseno'),
          nombre: 'Nombre actualizado',
          matricula: 'ACTUALIZADA',
          fechaIngreso: '2026-09-01',
        })
        .expect(200);
      expect(updated.body).toMatchObject({
        planId: id('plan-diseno'),
        matricula: 'ACTUALIZADA',
        fechaIngreso: '2026-09-01',
      });
      const teacherSession = await login(app, await correo('docente1'));
      const teacher = await api
        .patch(`/personas/docentes/${id('persona-docente1')}`)
        .send({
          correo: 'docente.actualizado@example.invalid',
          nombre: 'Nombre actualizado',
          numeroEmpleado: 'DOC-EDITADO',
          departamento: 'Otro departamento',
        })
        .expect(200);
      expect(teacher.body).toMatchObject({
        correo: 'docente.actualizado@example.invalid',
        numeroEmpleado: 'DOC-EDITADO',
      });
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', teacherSession.cookie)
        .expect(401);
      expect(
        await tx.sesion.count({ where: { usuarioId: id('docente1'), revocadaEn: null } }),
      ).toBe(0);
    });
  });
  it('exige sesión, rol administrador y protección CSRF', async () => {
    await fixture(async ({ app, correo }) => {
      await request(app.getHttpServer()).get('/personas/estudiantes').expect(401);
      const student = await login(app, await correo('estudiante1'));
      await request(app.getHttpServer())
        .get('/personas/estudiantes')
        .set('Cookie', student.cookie)
        .expect(403);
      const admin = await login(app, await correo('admin'));
      await request(app.getHttpServer())
        .post('/personas/estudiantes')
        .set('Cookie', admin.cookie)
        .set('Origin', env.WEB_ORIGIN)
        .send({})
        .expect(403);
    });
  });

  it('crea ambos perfiles con claves normalizadas y cuentas inactivas sin revelar hash', async () => {
    await fixture(async ({ app, correo, id, tx }) => {
      const admin = await login(app, await correo('admin'));
      const api = adminRequest(app, admin.cookie, admin.csrf);
      const student = await api
        .post('/personas/estudiantes')
        .send({
          correo: '  nueva.alumna@example.invalid ',
          matricula: '  e-900  ',
          nombre: 'Alumna de Prueba',
          planId: id('plan-software'),
          fechaIngreso: '2026-08-24',
        })
        .expect(201);
      expect(student.body.correo).toBe('nueva.alumna@example.invalid');
      expect(student.body.matricula).toBe('E-900');
      expect(student.body.accesoActivo).toBe(false);
      expect(student.body).not.toHaveProperty('passwordHash');
      expect(student.body).not.toHaveProperty('password');
      const studentUser = await tx.usuario.findUniqueOrThrow({
        where: { correo: 'nueva.alumna@example.invalid' },
      });
      expect(studentUser.activo).toBe(false);
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('Origin', env.WEB_ORIGIN)
        .send({ correo: 'nueva.alumna@example.invalid', password: 'cualquier-clave' })
        .expect(401);

      const teacher = await api
        .post('/personas/docentes')
        .send({
          correo: 'nuevo.docente@example.invalid',
          numeroEmpleado: '  d-900 ',
          nombre: 'Docente de Prueba',
          departamento: 'Área de ejemplo',
        })
        .expect(201);
      expect(teacher.body.numeroEmpleado).toBe('D-900');
      expect(teacher.body.accesoActivo).toBe(false);
      expect(teacher.body).not.toHaveProperty('passwordHash');

      await api
        .post('/personas/docentes')
        .send({
          correo: 'nueva.alumna@example.invalid',
          numeroEmpleado: 'D-901',
          nombre: 'Correo duplicado',
          departamento: 'Área de ejemplo',
        })
        .expect(409);
      const defaultPage = await api
        .get('/personas/estudiantes?q=nueva.alumna&page=1&pageSize=1')
        .expect(200);
      expect(defaultPage.body.total).toBe(0);
      const page = await api
        .get('/personas/estudiantes?q=nueva.alumna&page=1&pageSize=1&incluirInactivos=true')
        .expect(200);
      expect(page.body.total).toBe(1);
      expect(page.body.items).toHaveLength(1);
      expect(
        await tx.auditoria.count({
          where: {
            actorId: (
              await tx.usuario.findUniqueOrThrow({ where: { correo: await correo('admin') } })
            ).id,
            recurso: 'Estudiante',
          },
        }),
      ).toBeGreaterThan(0);
    });
  });

  it('desactiva el acceso, revoca sesiones y no lo reactiva implícitamente', async () => {
    await fixture(async ({ app, correo, id, tx }) => {
      const admin = await login(app, await correo('admin'));
      const student = await login(app, await correo('estudiante1'));
      const recordId = id('persona-estudiante1');
      const api = adminRequest(app, admin.cookie, admin.csrf);
      const deactivated = await api
        .patch(`/personas/estudiantes/${recordId}`)
        .send({ estado: 'INACTIVO' })
        .expect(200);
      expect(deactivated.body.estado).toBe('INACTIVO');
      expect(deactivated.body.accesoActivo).toBe(false);
      await request(app.getHttpServer()).get('/auth/me').set('Cookie', student.cookie).expect(401);
      const session = await tx.sesion.findFirstOrThrow({
        where: { usuarioId: id('estudiante1') },
        orderBy: { creadoEn: 'desc' },
      });
      expect(session.revocadaEn).not.toBeNull();

      const restored = await api
        .patch(`/personas/estudiantes/${recordId}`)
        .send({ estado: 'ACTIVO', correo: ' Ana.Actualizada@example.invalid ' })
        .expect(200);
      expect(restored.body.estado).toBe('ACTIVO');
      expect(restored.body.correo).toBe('ana.actualizada@example.invalid');
      expect(restored.body.accesoActivo).toBe(false);
      expect(await tx.inscripcion.count({ where: { estudianteId: recordId } })).toBeGreaterThan(0);
    });
  });

  it('conserva el plan académico cuando hay inscripciones y los grupos del docente', async () => {
    await fixture(async ({ app, correo, id, tx }) => {
      const admin = await login(app, await correo('admin'));
      const api = adminRequest(app, admin.cookie, admin.csrf);
      await api
        .patch(`/personas/estudiantes/${id('persona-estudiante1')}`)
        .send({ planId: id('plan-diseno') })
        .expect(409);
      const teacher = await api
        .patch(`/personas/docentes/${id('persona-docente1')}`)
        .send({ activo: false })
        .expect(200);
      expect(teacher.body.activo).toBe(false);
      expect(teacher.body.accesoActivo).toBe(false);
      expect(
        await tx.grupo.count({ where: { docenteId: id('persona-docente1') } }),
      ).toBeGreaterThan(0);
    });
  });

  it('CP-01/CP-02 y PB-04: completa el recorrido extremo a extremo de estudiante y docente nuevos con provisionarAccesoLocal, restablecimiento, revocación y baja lógica conservando historial', async () => {
    await fixture(async ({ app, correo, id, tx }) => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'siga-personas-acceso-'));
      try {
        await tx.periodo.update({
          where: { id: id('actual') },
          data: {
            inscripcionInicio: new Date(Date.now() - 86_400_000),
            inscripcionFin: new Date(Date.now() + 86_400_000),
          },
        });

        const admin = await login(app, await correo('admin'));
        const api = adminRequest(app, admin.cookie, admin.csrf);

        // 1. Alta de estudiante nuevo y docente nuevo por API (cuentas nacen con accesoActivo: false)
        const studentCreated = await api
          .post('/personas/estudiantes')
          .send({
            correo: 'estudiante.nuevo.r03@example.invalid',
            matricula: 'EST-R03-01',
            nombre: 'Lucía Recorrido R03',
            planId: id('plan-software'),
            fechaIngreso: '2026-08-24',
          })
          .expect(201);
        expect(studentCreated.body.accesoActivo).toBe(false);

        const teacherCreated = await api
          .post('/personas/docentes')
          .send({
            correo: 'docente.nuevo.r03@example.invalid',
            numeroEmpleado: 'DOC-R03-01',
            nombre: 'Marcos Docente R03',
            departamento: 'Ingeniería de Software',
          })
          .expect(201);
        expect(teacherCreated.body.accesoActivo).toBe(false);

        // Asignar un grupo nuevo en el periodo actual al docente recién creado
        const groupCreated = await api
          .post('/grupos')
          .send({
            clave: 'GRP-R03-FLUJO',
            planId: id('plan-software'),
            asignaturaId: id('comunicacion'),
            periodoId: id('actual'),
            docenteId: teacherCreated.body.id,
            cupo: 10,
          })
          .expect(201);

        // 2. Provisión local inicial para estudiante nuevo y docente nuevo
        const provStudent1 = await provisionarAccesoLocal({
          correo: studentCreated.body.correo,
          directory: tmpDir,
          bcryptRounds: 4,
          transaction: (fn) => fn(tx),
        });
        expect(provStudent1.sesionesRevocadas).toBe(0);
        expect((await stat(provStudent1.credentialPath)).mode & 0o777).toBe(0o600);
        const studentFileText1 = await readFile(provStudent1.credentialPath, 'utf8');
        expect(studentFileText1).toContain(`Contraseña: ${provStudent1.password}`);

        const provTeacher1 = await provisionarAccesoLocal({
          correo: teacherCreated.body.correo,
          directory: tmpDir,
          bcryptRounds: 4,
          transaction: (fn) => fn(tx),
        });
        expect(provTeacher1.sesionesRevocadas).toBe(0);

        // 3. Login exitoso con la contraseña provisionada y ejecución de operación propia de cada rol
        const studentLogin1 = await request(app.getHttpServer())
          .post('/auth/login')
          .set('Origin', env.WEB_ORIGIN)
          .send({ correo: studentCreated.body.correo, password: provStudent1.password })
          .expect(200);
        const studentCookie1 = sessionCookie(studentLogin1);
        const studentCsrf1 = studentLogin1.body.csrfToken as string;

        // Operación propia del estudiante: inscribirse al grupo del nuevo docente
        const enrollment = await request(app.getHttpServer())
          .post('/matriculas')
          .set('Cookie', studentCookie1)
          .set('Origin', env.WEB_ORIGIN)
          .set('X-CSRF-Token', studentCsrf1)
          .send({ grupoId: groupCreated.body.id })
          .expect(201);

        const teacherLogin1 = await request(app.getHttpServer())
          .post('/auth/login')
          .set('Origin', env.WEB_ORIGIN)
          .send({ correo: teacherCreated.body.correo, password: provTeacher1.password })
          .expect(200);
        const teacherCookie1 = sessionCookie(teacherLogin1);
        const teacherCsrf1 = teacherLogin1.body.csrfToken as string;

        // Operación propia del docente: consultar sus grupos y capturar calificación
        const teacherGroups = await request(app.getHttpServer())
          .get('/docentes/me/grupos')
          .set('Cookie', teacherCookie1)
          .expect(200);
        expect(teacherGroups.body.map((g: { id: string }) => g.id)).toContain(groupCreated.body.id);
        const captured = await request(app.getHttpServer())
          .put(`/calificaciones/${enrollment.body.id}`)
          .set('Cookie', teacherCookie1)
          .set('Origin', env.WEB_ORIGIN)
          .set('X-CSRF-Token', teacherCsrf1)
          .send({ notaFinal: '9.25', version: 1 })
          .expect(200);
        expect(captured.body).toMatchObject({ estado: 'CALIFICADA', notaFinal: '9.250' });

        // 4. Restablecimiento de acceso local -> revoca inmediatamente la sesión previa (401) y permite nuevo login
        const provStudent2 = await provisionarAccesoLocal({
          correo: studentCreated.body.correo,
          directory: tmpDir,
          bcryptRounds: 4,
          transaction: (fn) => fn(tx),
        });
        expect(provStudent2.sesionesRevocadas).toBe(1);
        expect(provStudent2.password).not.toBe(provStudent1.password);
        await request(app.getHttpServer())
          .get('/auth/me')
          .set('Cookie', studentCookie1)
          .expect(401);
        await request(app.getHttpServer())
          .post('/auth/login')
          .set('Origin', env.WEB_ORIGIN)
          .send({ correo: studentCreated.body.correo, password: provStudent1.password })
          .expect(401);
        const studentLogin2 = await request(app.getHttpServer())
          .post('/auth/login')
          .set('Origin', env.WEB_ORIGIN)
          .send({ correo: studentCreated.body.correo, password: provStudent2.password })
          .expect(200);
        const studentCookie2 = sessionCookie(studentLogin2);
        await request(app.getHttpServer())
          .get('/auth/me')
          .set('Cookie', studentCookie2)
          .expect(200);

        const provTeacher2 = await provisionarAccesoLocal({
          correo: teacherCreated.body.correo,
          directory: tmpDir,
          bcryptRounds: 4,
          transaction: (fn) => fn(tx),
        });
        expect(provTeacher2.sesionesRevocadas).toBe(1);
        await request(app.getHttpServer())
          .get('/auth/me')
          .set('Cookie', teacherCookie1)
          .expect(401);
        const teacherLogin2 = await request(app.getHttpServer())
          .post('/auth/login')
          .set('Origin', env.WEB_ORIGIN)
          .send({ correo: teacherCreated.body.correo, password: provTeacher2.password })
          .expect(200);
        const teacherCookie2 = sessionCookie(teacherLogin2);
        await request(app.getHttpServer())
          .get('/auth/me')
          .set('Cookie', teacherCookie2)
          .expect(200);

        // 5. Baja lógica de ambos perfiles -> revoca sesiones activas y conserva historial académico y auditoría
        const studentDisabled = await api
          .patch(`/personas/estudiantes/${studentCreated.body.id}`)
          .send({ estado: 'INACTIVO' })
          .expect(200);
        expect(studentDisabled.body.accesoActivo).toBe(false);
        await request(app.getHttpServer())
          .get('/auth/me')
          .set('Cookie', studentCookie2)
          .expect(401);

        const teacherDisabled = await api
          .patch(`/personas/docentes/${teacherCreated.body.id}`)
          .send({ activo: false })
          .expect(200);
        expect(teacherDisabled.body.accesoActivo).toBe(false);
        await request(app.getHttpServer())
          .get('/auth/me')
          .set('Cookie', teacherCookie2)
          .expect(401);

        // La provisión local rechaza perfiles dados de baja
        await expect(
          provisionarAccesoLocal({
            correo: studentCreated.body.correo,
            directory: tmpDir,
            bcryptRounds: 4,
            transaction: (fn) => fn(tx),
          }),
        ).rejects.toThrow('perfil docente o estudiantil activo');

        // El historial académico y la auditoría con anterior/posterior se conservan íntegros
        const savedEnrollment = await tx.inscripcion.findUniqueOrThrow({
          where: { id: enrollment.body.id },
        });
        expect(savedEnrollment.notaFinal?.toFixed(3)).toBe('9.250');

        const studentAudit = await tx.auditoria.findFirstOrThrow({
          where: {
            recurso: 'Estudiante',
            recursoId: studentCreated.body.id,
            accion: 'ACTUALIZAR',
          },
          orderBy: { creadoEn: 'desc' },
        });
        expect(studentAudit.anterior).toMatchObject({ estado: 'ACTIVO', accesoActivo: true });
        expect(studentAudit.posterior).toMatchObject({ estado: 'INACTIVO', accesoActivo: false });

        const teacherAudit = await tx.auditoria.findFirstOrThrow({
          where: {
            recurso: 'Docente',
            recursoId: teacherCreated.body.id,
            accion: 'ACTUALIZAR',
          },
          orderBy: { creadoEn: 'desc' },
        });
        expect(teacherAudit.anterior).toMatchObject({ activo: true, accesoActivo: true });
        expect(teacherAudit.posterior).toMatchObject({ activo: false, accesoActivo: false });
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
