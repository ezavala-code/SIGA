import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { PDFDocument } from 'pdf-lib';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { DatabaseService } from '../src/database/database.service.js';
import { createDatabaseClient } from '../src/database/client.js';
import { seedData, seedId } from '../src/database/seed-data.js';
import { parseEnvironment, requireTestDatabaseUrl } from '../src/config/environment.js';
import { CertificadosService } from '../src/modules/certificados/certificados.service.js';
import type { Prisma } from '../src/generated/prisma/client.js';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
const databaseUrl = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);
const environment = parseEnvironment({
  NODE_ENV: 'test',
  DATABASE_URL: databaseUrl,
  WEB_ORIGIN: 'http://localhost:5173',
  JWT_SECRET: 'testingkeyabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH',
  EXIGIR_PRERREQUISITOS: 'true',
});
const client = createDatabaseClient(databaseUrl);
const rollback = new Error('Rollback certificados/reportes');
const password = 'ClaveFicticiaDePrueba_2026!';
jest.setTimeout(60000);

afterAll(async () => {
  await client.$disconnect();
});

type Context = {
  app: INestApplication;
  tx: Prisma.TransactionClient;
  id: (name: string) => string;
  correo: (name: string) => Promise<string>;
  namespace: string;
  storage: string;
};

async function fixture(run: (context: Context) => Promise<void>) {
  const namespace = `e08-${randomUUID()}`;
  const storage = await mkdtemp(join(tmpdir(), `siga-e08-${randomUUID()}-`));
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
          'estudiante4',
          'docente1',
          'docente2',
          'admin',
        ]) {
          await tx.usuario.update({
            where: { id: id(name) },
            data: { activo: true, passwordHash: hash },
          });
        }
        const testEnvironment = { ...environment, CERTIFICATES_DIR: storage };
        const module = await Test.createTestingModule({
          imports: [AppModule.register(testEnvironment)],
        })
          .overrideProvider(DatabaseService)
          .useValue({
            client: tx,
            transaction: async <T>(fn: (client: Prisma.TransactionClient) => Promise<T>) => {
              await tx.$executeRawUnsafe('SAVEPOINT e08_operation');
              try {
                const result = await fn(tx);
                await tx.$executeRawUnsafe('RELEASE SAVEPOINT e08_operation');
                return result;
              } catch (error) {
                await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT e08_operation');
                await tx.$executeRawUnsafe('RELEASE SAVEPOINT e08_operation');
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
            namespace,
            storage,
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
  } finally {
    await rm(storage, { recursive: true, force: true });
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
    .set('Origin', environment.WEB_ORIGIN)
    .send({ correo, password })
    .expect(200);
  return { cookie: cookie(response), csrf: response.body.csrfToken as string };
}

function api(app: INestApplication, session: { cookie: string; csrf: string }) {
  const headers = (test: request.Test) =>
    test
      .set('Cookie', session.cookie)
      .set('Origin', environment.WEB_ORIGIN)
      .set('X-CSRF-Token', session.csrf);
  return {
    get: (path: string) => headers(request(app.getHttpServer()).get(path)),
    post: (path: string) => headers(request(app.getHttpServer()).post(path)),
    put: (path: string) => headers(request(app.getHttpServer()).put(path)),
  };
}

describe('RF-10/11/12 certificados, reportes e historial con PostgreSQL real', () => {
  it('conserva el commit durable cuando se pierde la respuesta HTTP', async () => {
    const namespace = `durable-${randomUUID()}`;
    const storage = await mkdtemp(join(tmpdir(), 'siga-cert-http-durable-'));
    const id = (name: string) => seedId(namespace, name);
    const observer = createDatabaseClient(databaseUrl);
    let app: INestApplication | undefined;
    try {
      await client.$transaction(
        async (tx) => {
          await seedData(tx, namespace);
          await tx.usuario.update({
            where: { id: id('estudiante1') },
            data: { activo: true, passwordHash: await bcrypt.hash(password, 4) },
          });
        },
        { timeout: 60000 },
      );
      const user = await observer.usuario.findUniqueOrThrow({ where: { id: id('estudiante1') } });
      const module = await Test.createTestingModule({
        imports: [AppModule.register({ ...environment, CERTIFICATES_DIR: storage })],
      }).compile();
      app = module.createNestApplication();
      await app.init();
      const student = api(app, await login(app, user.correo));
      const service = app.get(CertificadosService);
      const emitir = service.emitirPropio.bind(service);
      let socket: { destroy: () => void } | undefined;
      app.getHttpServer().once('request', (req: { socket?: { destroy: () => void } }) => {
        socket = req.socket;
      });
      const spy = jest.spyOn(service, 'emitirPropio').mockImplementationOnce(async (actor) => {
        const result = await emitir(actor);
        socket?.destroy();
        return result;
      });
      await expect(student.post('/certificados')).rejects.toThrow();
      spy.mockRestore();
      const records = await observer.certificado.findMany({
        where: { estudianteId: id('persona-estudiante1') },
      });
      expect(records).toHaveLength(1);
      const record = records[0]!;
      expect(record.estado).toBe('EMITIDO');
      expect(
        await observer.auditoria.count({
          where: { recursoId: record.id, accion: 'EMITIR_CERTIFICADO' },
        }),
      ).toBe(1);
      const pdf = await student.get(`/certificados/${record.id}/pdf`).expect(200);
      expect(
        createHash('sha256')
          .update(Buffer.from(pdf.body as Buffer))
          .digest('hex'),
      ).toBe(record.archivoSha256);
      await student.post(`/certificados/${record.id}/recuperar`).expect(409);
      expect(
        await observer.certificado.count({ where: { estudianteId: id('persona-estudiante1') } }),
      ).toBe(1);
    } finally {
      await app?.close();
      await observer.$disconnect();
      await rm(storage, { recursive: true, force: true });
    }
  });
  it('emite PDF/QR inmutable, protege su descarga, comprueba hash y revoca/reemite con vínculo', async () => {
    await fixture(async ({ app, correo, id, storage, tx }) => {
      const studentSession = await login(app, await correo('estudiante1'));
      const student = api(app, studentSession);
      const otherStudent = api(app, await login(app, await correo('estudiante2')));
      const teacher = api(app, await login(app, await correo('docente1')));
      const admin = api(app, await login(app, await correo('admin')));

      const initial = await student.get('/certificados/me').expect(200);
      expect(initial.body.items).toEqual([]);
      await request(app.getHttpServer())
        .get('/certificados/verificar/codigo-invalido')
        .expect(200)
        .expect({ estado: 'INEXISTENTE' });
      await student.get('/certificados/not-an-id/pdf').expect(400);
      const issued = await student.post('/certificados').expect(201);
      expect(issued.body).toMatchObject({ tipo: 'ESTUDIOS', estado: 'EMITIDO' });
      expect(issued.body.codigo).toMatch(/^[0-9a-f]{32}$/);
      const certificate = await tx.certificado.findUniqueOrThrow({ where: { id: issued.body.id } });
      const snapshot = certificate.instantanea as {
        estudiante: { nombre: string };
        calificaciones: Array<{ notaFinal: string; resultado: string; asignaturaNombre: string }>;
      };
      expect(snapshot.estudiante.nombre).toBe('Ana Ejemplo');
      expect(snapshot.calificaciones).toHaveLength(1);
      expect(snapshot.calificaciones[0]).toMatchObject({
        notaFinal: '8.500',
        resultado: 'APROBADA',
        asignaturaNombre: 'Fundamentos de programación',
      });
      await student.post(`/certificados/${issued.body.id}/reemitir`).expect(409);
      await admin.post(`/certificados/estudiantes/${id('perfil-inexistente')}`).expect(404);
      await admin.get('/certificados?page=1&pageSize=101').expect(400);

      const adminIssued = await admin
        .post(`/certificados/estudiantes/${id('persona-estudiante2')}`)
        .expect(201);
      const adminSnapshot = await tx.certificado.findUniqueOrThrow({
        where: { id: adminIssued.body.id },
      });
      expect((adminSnapshot.instantanea as typeof snapshot).calificaciones[0]).toMatchObject({
        notaFinal: '5.000',
        resultado: 'REPROBADA',
      });
      await admin.get(`/certificados/${adminIssued.body.id}/pdf`).expect(200);

      const pdfResponse = await student.get(`/certificados/${issued.body.id}/pdf`).expect(200);
      expect(pdfResponse.headers['content-type']).toContain('application/pdf');
      expect(pdfResponse.headers['cache-control']).toBe('private, no-store');
      const originalPdf = Buffer.from(pdfResponse.body as Buffer);
      expect(originalPdf.subarray(0, 5).toString()).toBe('%PDF-');
      const parsedPdf = await PDFDocument.load(originalPdf);
      expect(parsedPdf.getPageCount()).toBeGreaterThanOrEqual(1);
      expect(originalPdf.toString('latin1')).toMatch(/\/Subtype\s*\/Image/);
      expect(createHash('sha256').update(originalPdf).digest('hex')).toBe(
        certificate.archivoSha256,
      );

      await otherStudent.get(`/certificados/${issued.body.id}/pdf`).expect(403);
      await teacher.get(`/certificados/${issued.body.id}/pdf`).expect(403);
      const publicValid = await request(app.getHttpServer())
        .get(`/certificados/verificar/${issued.body.codigo}`)
        .expect(200);
      expect(publicValid.body).toMatchObject({
        estado: 'VIGENTE',
        codigo: issued.body.codigo,
        tipo: 'ESTUDIOS',
        nombre: 'Ana E.',
        programa: 'Desarrollo de Software (demostración)',
      });
      expect(JSON.stringify(publicValid.body)).not.toContain('matricula');
      expect(JSON.stringify(publicValid.body)).not.toContain('calificaciones');
      expect(JSON.stringify(publicValid.body)).not.toContain('correo');
      expect(
        (
          await request(app.getHttpServer())
            .get('/certificados/verificar/00000000000000000000000000000000')
            .expect(200)
        ).body,
      ).toEqual({ estado: 'INEXISTENTE' });

      expect(certificate.archivoRuta).toBeTruthy();
      const storedFile = resolve(storage, certificate.archivoRuta!.split('/').at(-1)!);
      await rm(storedFile);
      await student.get(`/certificados/${issued.body.id}/pdf`).expect(503);
      await writeFile(storedFile, originalPdf);
      await writeFile(storedFile, Buffer.from('PDF alterado'));
      await student.get(`/certificados/${issued.body.id}/pdf`).expect(409);
      await writeFile(storedFile, originalPdf);

      await teacher
        .put(`/calificaciones/${id('aprobada')}`)
        .send({ notaFinal: '9.00', version: 1, motivo: 'Corrección posterior a la emisión.' })
        .expect(200);
      const stillOriginal = await student.get(`/certificados/${issued.body.id}/pdf`).expect(200);
      expect(Buffer.from(stillOriginal.body as Buffer).equals(originalPdf)).toBe(true);
      const unchanged = await tx.certificado.findUniqueOrThrow({ where: { id: issued.body.id } });
      expect((unchanged.instantanea as typeof snapshot).calificaciones[0]?.notaFinal).toBe('8.500');

      await admin.post(`/certificados/${issued.body.id}/revocar`).send({ motivo: '' }).expect(400);
      await admin
        .post(`/certificados/${issued.body.id}/revocar`)
        .send({ motivo: 'Corrección de calificación posterior a la emisión.' })
        .expect(201);
      await admin
        .post(`/certificados/${issued.body.id}/revocar`)
        .send({ motivo: 'La constancia ya estaba revocada.' })
        .expect(404);
      const publicRevoked = await request(app.getHttpServer())
        .get(`/certificados/verificar/${issued.body.codigo}`)
        .expect(200);
      expect(publicRevoked.body.estado).toBe('REVOCADO');

      const replacement = await student
        .post(`/certificados/${issued.body.id}/reemitir`)
        .expect(201);
      expect(replacement.body.estado).toBe('EMITIDO');
      const replacementRecord = await tx.certificado.findUniqueOrThrow({
        where: { id: replacement.body.id },
      });
      expect(replacementRecord.reemplazaId).toBe(issued.body.id);
      expect((replacementRecord.instantanea as typeof snapshot).calificaciones[0]?.notaFinal).toBe(
        '9.000',
      );
      expect(
        (
          await request(app.getHttpServer()).get(
            `/certificados/verificar/${replacement.body.codigo}`,
          )
        ).body.estado,
      ).toBe('VIGENTE');
      await student.post(`/certificados/${issued.body.id}/reemitir`).expect(409);

      const audit = await tx.auditoria.findMany({
        where: { recurso: 'Certificado', recursoId: issued.body.id },
        orderBy: { creadoEn: 'asc' },
      });
      expect(audit.map((row) => row.accion)).toContain('FALLA_INTEGRIDAD_CERTIFICADO');
      expect(audit.map((row) => row.accion)).toContain('REVOCAR_CERTIFICADO');
      expect(audit.map((row) => row.motivo)).toContain('ARCHIVO_AUSENTE');
      expect(audit[0]?.actorId).toBeDefined();
      const listed = await student.get('/certificados/me').expect(200);
      expect(listed.body.items).toHaveLength(2);
    });
  });

  it.each(['PENDIENTE', 'FALLIDO'] as const)(
    'recupera una reemisión %s sin cambiar su identidad ni su instantánea',
    async (estado) => {
      await fixture(async ({ app, correo, tx }) => {
        const student = api(app, await login(app, await correo('estudiante1')));
        const admin = api(app, await login(app, await correo('admin')));
        const original = await student.post('/certificados').expect(201);
        const previous = await tx.certificado.findUniqueOrThrow({
          where: { id: original.body.id },
        });
        await admin
          .post(`/certificados/${original.body.id}/revocar`)
          .send({ motivo: 'Prueba de recuperación.' })
          .expect(201);
        const codigo = randomUUID().replaceAll('-', '');
        const instantanea = { ...(previous.instantanea as object), codigo };
        const unfinished = await tx.certificado.create({
          data: {
            estudianteId: previous.estudianteId,
            tipo: 'ESTUDIOS',
            codigo,
            estado,
            solicitadoEn: previous.solicitadoEn,
            instantanea,
            reemplazaId: previous.id,
          },
        });
        const recovered = await student.post(`/certificados/${previous.id}/reemitir`).expect(201);
        expect(recovered.body).toMatchObject({ id: unfinished.id, codigo, estado: 'EMITIDO' });
        const stored = await tx.certificado.findUniqueOrThrow({ where: { id: unfinished.id } });
        expect(stored.instantanea).toEqual(instantanea);
        expect(stored.reemplazaId).toBe(previous.id);
        await student.get(`/certificados/${unfinished.id}/pdf`).expect(200);
        const audit = await tx.auditoria.findFirstOrThrow({
          where: { recursoId: unfinished.id, accion: 'REEMITIR_CERTIFICADO' },
        });
        expect(audit.anterior).toEqual({ estado });
        await student.post(`/certificados/${previous.id}/reemitir`).expect(409);
      });
    },
  );

  it('recupera una emisión tras un fallo real de almacenamiento y protege su propietario', async () => {
    await fixture(async ({ app, correo, storage, tx }) => {
      const student = api(app, await login(app, await correo('estudiante1')));
      const other = api(app, await login(app, await correo('estudiante2')));
      await rm(storage, { recursive: true });
      await writeFile(storage, 'almacenamiento no disponible');

      await student.post('/certificados').expect(503);
      const listed = await student.get('/certificados/me').expect(200);
      expect(listed.body.items).toHaveLength(1);
      const pending = listed.body.items[0];
      expect(pending.estado).toBe('PENDIENTE');
      await other.post(`/certificados/${pending.id}/recuperar`).expect(403);

      await rm(storage);
      const recovered = await student.post(`/certificados/${pending.id}/recuperar`).expect(201);
      expect(recovered.body).toMatchObject({
        id: pending.id,
        codigo: pending.codigo,
        estado: 'EMITIDO',
      });
      await student.get(`/certificados/${pending.id}/pdf`).expect(200);
      expect(
        await tx.auditoria.count({
          where: { recursoId: pending.id, accion: 'EMITIR_CERTIFICADO' },
        }),
      ).toBe(1);
      await student.post(`/certificados/${pending.id}/recuperar`).expect(409);
    });
  });

  it('mantiene una única constancia emitida e íntegra cuando la respuesta HTTP se pierde tras el commit y rechaza recuperar con 409', async () => {
    await fixture(async ({ app, correo, storage, tx }) => {
      const student = api(app, await login(app, await correo('estudiante1')));
      const service = app.get(CertificadosService);
      const originalEmitirPropio = service.emitirPropio.bind(service);
      let activeSocket: { destroy: () => void } | undefined;
      app.getHttpServer().once('request', (req: { socket?: { destroy: () => void } }) => {
        activeSocket = req.socket;
      });
      const spyEmitir = jest
        .spyOn(service, 'emitirPropio')
        .mockImplementationOnce(async (actor) => {
          const result = await originalEmitirPropio(actor);
          activeSocket?.destroy();
          return result;
        });

      await expect(student.post('/certificados')).rejects.toThrow();
      spyEmitir.mockRestore();

      const listed = await student.get('/certificados/me').expect(200);
      expect(listed.body.items).toHaveLength(1);
      const confirmed = listed.body.items[0] as { id: string; codigo: string; estado: string };
      expect(confirmed.estado).toBe('EMITIDO');
      expect(confirmed.codigo).toMatch(/^[0-9a-f]{32}$/);

      const dbRecord = await tx.certificado.findUniqueOrThrow({ where: { id: confirmed.id } });
      expect(dbRecord.estado).toBe('EMITIDO');
      expect(dbRecord.archivoSha256).toMatch(/^[0-9a-f]{64}$/);
      const filesBeforeRetry = (await readdir(storage)).filter((name) =>
        name.startsWith(confirmed.id),
      );
      expect(filesBeforeRetry).toHaveLength(1);

      const downloaded = await student.get(`/certificados/${confirmed.id}/pdf`).expect(200);
      const pdfBytes = Buffer.from(downloaded.body as Buffer);
      expect(pdfBytes.subarray(0, 5).toString()).toBe('%PDF-');
      expect(createHash('sha256').update(pdfBytes).digest('hex')).toBe(dbRecord.archivoSha256);

      const verified = await request(app.getHttpServer())
        .get(`/certificados/verificar/${confirmed.codigo}`)
        .expect(200);
      expect(verified.body).toMatchObject({
        codigo: confirmed.codigo,
        estado: 'VIGENTE',
      });

      await student.post(`/certificados/${confirmed.id}/recuperar`).expect(409);
      const filesAfterRetry = (await readdir(storage)).filter((name) =>
        name.startsWith(confirmed.id),
      );
      expect(filesAfterRetry).toEqual(filesBeforeRetry);
      const listedAfterRetry = await student.get('/certificados/me').expect(200);
      expect(listedAfterRetry.body.items).toHaveLength(1);
      expect(
        await tx.auditoria.count({
          where: { recursoId: confirmed.id, accion: 'EMITIR_CERTIFICADO' },
        }),
      ).toBe(1);
    });
  });

  it('emite, verifica públicamente, descarga y revoca/reemite constancias en ambos programas sintéticos (D41)', async () => {
    await fixture(async ({ app, correo, id, tx }) => {
      await tx.programa.update({
        where: { id: id('software') },
        data: { nombre: 'Ingeniería en Sistemas Computacionales (demostración)' },
      });
      await tx.programa.update({
        where: { id: id('diseno') },
        data: { nombre: 'Licenciatura en Administración y Gestión Académica (demostración)' },
      });
      await tx.inscripcion.create({
        data: {
          id: randomUUID(),
          estudianteId: id('persona-estudiante4'),
          grupoId: id('visual-actual'),
          planId: id('plan-diseno'),
          asignaturaId: id('visual'),
          periodoId: id('actual'),
          politicaId: id('politica'),
          notaFinal: '9.25',
          estado: 'CALIFICADA',
          creditosSnapshot: '6',
        },
      });

      const studentSoftware = api(app, await login(app, await correo('estudiante1')));
      const studentDiseno = api(app, await login(app, await correo('estudiante4')));
      const admin = api(app, await login(app, await correo('admin')));

      for (const caso of [
        {
          client: studentSoftware,
          nombreAbreviado: 'Ana E.',
          programa: 'Ingeniería en Sistemas Computacionales (demostración)',
        },
        {
          client: studentDiseno,
          nombreAbreviado: 'Diego S.',
          programa: 'Licenciatura en Administración y Gestión Académica (demostración)',
        },
      ]) {
        const emitted = await caso.client.post('/certificados').expect(201);
        expect(emitted.body).toMatchObject({ tipo: 'ESTUDIOS', estado: 'EMITIDO' });

        const verification = await request(app.getHttpServer())
          .get(`/certificados/verificar/${emitted.body.codigo}`)
          .expect(200);
        expect(verification.body).toMatchObject({
          codigo: emitted.body.codigo,
          tipo: 'ESTUDIOS',
          nombre: caso.nombreAbreviado,
          programa: caso.programa,
          estado: 'VIGENTE',
        });
        expect(JSON.stringify(verification.body)).not.toMatch(/matricula|calificaciones|correo/);

        const stored = await tx.certificado.findUniqueOrThrow({ where: { id: emitted.body.id } });
        const pdfResponse = await caso.client
          .get(`/certificados/${emitted.body.id}/pdf`)
          .expect(200);
        const pdfBytes = Buffer.from(pdfResponse.body as Buffer);
        expect(createHash('sha256').update(pdfBytes).digest('hex')).toBe(stored.archivoSha256);

        await admin
          .post(`/certificados/${emitted.body.id}/revocar`)
          .send({ motivo: `Revocación de prueba para ${caso.programa}.` })
          .expect(201);
        const revokedCheck = await request(app.getHttpServer())
          .get(`/certificados/verificar/${emitted.body.codigo}`)
          .expect(200);
        expect(revokedCheck.body.estado).toBe('REVOCADO');

        const reemitted = await caso.client
          .post(`/certificados/${emitted.body.id}/reemitir`)
          .expect(201);
        expect(reemitted.body.estado).toBe('EMITIDO');
        const reemittedVerification = await request(app.getHttpServer())
          .get(`/certificados/verificar/${reemitted.body.codigo}`)
          .expect(200);
        expect(reemittedVerification.body).toMatchObject({
          codigo: reemitted.body.codigo,
          programa: caso.programa,
          estado: 'VIGENTE',
        });
        const reemittedStored = await tx.certificado.findUniqueOrThrow({
          where: { id: reemitted.body.id },
        });
        expect(reemittedStored.reemplazaId).toBe(emitted.body.id);
        const reemittedPdf = await caso.client
          .get(`/certificados/${reemitted.body.id}/pdf`)
          .expect(200);
        expect(
          createHash('sha256')
            .update(Buffer.from(reemittedPdf.body as Buffer))
            .digest('hex'),
        ).toBe(reemittedStored.archivoSha256);
      }
    });
  });

  it('emite y descarga nombres chinos y cirílicos; informa caracteres sin fuente', async () => {
    await fixture(async ({ app, correo, id, storage, tx }) => {
      const student = api(app, await login(app, await correo('estudiante1')));
      await tx.estudiante.update({
        where: { usuarioId: id('estudiante1') },
        data: { nombre: 'María 李 Жан' },
      });
      const emitted = await student.post('/certificados').expect(201);
      expect(
        (await student.get(`/certificados/${emitted.body.id}/pdf`).expect(200)).headers[
          'content-type'
        ],
      ).toContain('application/pdf');

      await tx.estudiante.update({
        where: { usuarioId: id('estudiante1') },
        data: { nombre: 'Ana 🦄' },
      });
      const before = await readdir(storage);
      const invalid = await student.post('/certificados').expect(400);
      expect(invalid.body.message).toContain('caracteres');
      const listed = await student.get('/certificados/me').expect(200);
      expect(listed.body.items).toHaveLength(1);
      expect(await readdir(storage)).toEqual(before);
    });
  });

  it('rechaza constancias vacías y limita emisión administrativa, informes, CSV por grupo y bitácora', async () => {
    await fixture(async ({ app, correo, id, namespace }) => {
      const studentWithoutGrades = api(app, await login(app, await correo('estudiante3')));
      const teacher = api(app, await login(app, await correo('docente1')));
      const otherTeacher = api(app, await login(app, await correo('docente2')));
      const admin = api(app, await login(app, await correo('admin')));

      await studentWithoutGrades
        .post('/certificados')
        .send({ estudianteId: id('persona-estudiante1') })
        .expect(400);
      await admin.get('/certificados?page=1&pageSize=10').expect(200);
      await teacher.get('/certificados').expect(403);
      await studentWithoutGrades.get('/reportes/grupos').expect(403);
      await studentWithoutGrades
        .get(`/reportes/grupos/${id('intro-actual')}/historial.csv`)
        .expect(403);
      await teacher.get('/reportes/auditoria').expect(403);

      const csv = await teacher
        .get(`/reportes/grupos/${id('intro-actual')}/historial.csv`)
        .expect(200);
      expect(csv.headers['content-type']).toContain('text/csv');
      expect(csv.text).toContain('Período clave');
      expect(csv.text).toContain('Bruno Demostración');
      await otherTeacher.get(`/reportes/grupos/${id('intro-actual')}/historial.csv`).expect(404);
      await admin.get(`/reportes/grupos/${id('visual-actual')}/historial.csv`).expect(200);

      const groups = await admin.get('/reportes/grupos?page=1&pageSize=100').expect(200);
      expect(groups.body.items.map((item: { id: string }) => item.id)).toEqual(
        expect.arrayContaining(
          [
            'intro-anterior',
            'intro-actual',
            'intro-alterno',
            'avanzada-actual',
            'visual-actual',
          ].map(id),
        ),
      );
      expect(groups.body.total).toBeGreaterThanOrEqual(5);
      expect(
        groups.body.items.find((item: { id: string }) => item.id === id('intro-actual')),
      ).toMatchObject({ clave: expect.any(String), inscripciones: 1, cupo: 1 });
      const filteredGroups = await admin
        .get(`/reportes/grupos?q=INTRO&periodoId=${id('actual')}&page=2&pageSize=1`)
        .expect(200);
      expect(filteredGroups.body).toMatchObject({ page: 2, pageSize: 1, total: 2 });
      expect(filteredGroups.body.items).toHaveLength(1);
      await admin.get('/reportes/grupos?pageSize=0').expect(400);

      const audits = await admin
        .get(`/reportes/auditoria?q=${encodeURIComponent(namespace)}`)
        .expect(200);
      expect(
        audits.body.items.some((item: { accion: string }) => item.accion === 'DEMO_CREADA'),
      ).toBe(true);
      const filteredAudits = await admin
        .get(
          `/reportes/auditoria?q=${encodeURIComponent(namespace)}&accion=DEMO&recurso=Dataset&desde=2020-01-01T00%3A00%3A00.000Z&hasta=2030-01-01T00%3A00%3A00.000Z&page=1&pageSize=10`,
        )
        .expect(200);
      expect(filteredAudits.body.items).toHaveLength(1);
      await admin
        .get(
          '/reportes/auditoria?desde=2026-10-10T00%3A00%3A00.000Z&hasta=2026-10-01T00%3A00%3A00.000Z',
        )
        .expect(400);
      expect(JSON.stringify(audits.body)).not.toMatch(/password|csrfToken|siga_session/i);
    });
  });

  it('escapa CSV controlando formulas al exportar nombres académicos', async () => {
    await fixture(async ({ app, correo, id, tx }) => {
      const teacher = api(app, await login(app, await correo('docente1')));
      for (const name of ['=HYPERLINK("x")', '\t=1+1', ' +SUM(1,2)', '-1+2', '@SUM(1,2)']) {
        await tx.estudiante.update({
          where: { id: id('persona-estudiante2') },
          data: { nombre: name },
        });
        const report = await teacher
          .get(`/reportes/grupos/${id('intro-actual')}/historial.csv`)
          .expect(200);
        expect(report.text).toContain(`'${name.replaceAll('"', '""')}`);
      }
    });
  });
});
