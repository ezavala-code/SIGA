import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { jest } from '@jest/globals';
import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../src/database/database.service.js';
import { seedData, seedId } from '../src/database/seed-data.js';
import { parseEnvironment, requireTestDatabaseUrl } from '../src/config/environment.js';
import { CertificadosService } from '../src/modules/certificados/certificados.service.js';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
jest.setTimeout(120000);

it('recupera después de revertir la emisión y serializa dos reintentos reales', async () => {
  const base = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);
  const schema = `siga_cert_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(base);
  url.searchParams.set('schema', schema);
  const pool = new Pool({ connectionString: base });
  const storage = await mkdtemp(join(tmpdir(), 'siga-cert-concurrency-'));
  let database: DatabaseService | undefined;
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`);
    execFileSync(
      process.execPath,
      [
        resolve('node_modules/prisma/build/index.js'),
        'migrate',
        'deploy',
        '--config',
        'prisma.config.ts',
      ],
      {
        cwd: resolve('apps/api'),
        env: { ...process.env, DATABASE_URL: url.toString() },
        stdio: 'pipe',
      },
    );
    const environment = parseEnvironment({
      NODE_ENV: 'test',
      DATABASE_URL: url.toString(),
      WEB_ORIGIN: 'http://localhost:5173',
      JWT_SECRET: 'testingkeyabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH',
      CERTIFICATES_DIR: storage,
    });
    database = new DatabaseService(environment);
    const db = database;
    const namespace = `concurrencia-${randomUUID()}`;
    await db.transaction((tx) => seedData(tx, namespace), { timeout: 60000 });
    const actor = {
      userId: seedId(namespace, 'estudiante1'),
      sessionId: randomUUID(),
      rol: 'ESTUDIANTE' as const,
      correo: 'demostracion@example.invalid',
    };
    const service = new CertificadosService(db, environment);
    const issued = await service.emitirPropio(actor);
    const original = await db.client.certificado.findUniqueOrThrow({ where: { id: issued.id } });
    const code = randomUUID().replaceAll('-', '');
    const pending = await db.client.certificado.create({
      data: {
        estudianteId: original.estudianteId,
        tipo: 'ESTUDIOS',
        codigo: code,
        estado: 'PENDIENTE',
        solicitadoEn: original.solicitadoEn,
        instantanea: { ...(original.instantanea as object), codigo: code },
      },
    });
    const failingDb = Object.create(db) as DatabaseService;
    failingDb.transaction = (fn, options) =>
      db.transaction(async (tx) => {
        await fn(tx);
        throw new Error('Fallo inyectado después de guardar el archivo');
      }, options);
    await expect(
      new CertificadosService(failingDb, environment).recuperar(pending.id, actor),
    ).rejects.toThrow();
    expect(
      (await db.client.certificado.findUniqueOrThrow({ where: { id: pending.id } })).estado,
    ).toBe('PENDIENTE');
    const attempts = await Promise.allSettled([
      service.recuperar(pending.id, actor),
      service.recuperar(pending.id, actor),
    ]);
    const successes = attempts.filter((result) => result.status === 'fulfilled');
    expect(successes).toHaveLength(1);
    const failures = attempts.filter((result) => result.status === 'rejected');
    expect(failures).toHaveLength(1);
    expect(failures[0]!.reason).toBeInstanceOf(ConflictException);
    const completed = await db.client.certificado.findUniqueOrThrow({ where: { id: pending.id } });
    expect(completed.estado).toBe('EMITIDO');
    expect(
      await db.client.auditoria.count({
        where: { recursoId: pending.id, accion: 'EMITIR_CERTIFICADO' },
      }),
    ).toBe(1);
    expect((await readdir(storage)).filter((name) => name.startsWith(pending.id))).toHaveLength(2);
    expect((await service.descargarPdf(pending.id, actor)).bytes.subarray(0, 5).toString()).toBe(
      '%PDF-',
    );

    const codePostCommit = randomUUID().replaceAll('-', '');
    const pendingPostCommit = await db.client.certificado.create({
      data: {
        estudianteId: original.estudianteId,
        tipo: 'ESTUDIOS',
        codigo: codePostCommit,
        estado: 'PENDIENTE',
        solicitadoEn: original.solicitadoEn,
        instantanea: { ...(original.instantanea as object), codigo: codePostCommit },
      },
    });
    const postCommitLostDb = Object.create(db) as DatabaseService;
    postCommitLostDb.transaction = async (fn, options) => {
      await db.transaction(fn, options);
      throw new Error('Pérdida de respuesta posterior al commit confirmado');
    };
    await expect(
      new CertificadosService(postCommitLostDb, environment).recuperar(pendingPostCommit.id, actor),
    ).rejects.toThrow(ServiceUnavailableException);
    const committedRecord = await db.client.certificado.findUniqueOrThrow({
      where: { id: pendingPostCommit.id },
    });
    expect(committedRecord.estado).toBe('EMITIDO');
    const downloadedAfterLost = await service.descargarPdf(pendingPostCommit.id, actor);
    expect(createHash('sha256').update(downloadedAfterLost.bytes).digest('hex')).toBe(
      committedRecord.archivoSha256,
    );
    await expect(service.recuperar(pendingPostCommit.id, actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(
      await db.client.auditoria.count({
        where: { recursoId: pendingPostCommit.id, accion: 'EMITIR_CERTIFICADO' },
      }),
    ).toBe(1);
    expect(
      (await readdir(storage)).filter((name) => name.startsWith(pendingPostCommit.id)),
    ).toHaveLength(1);

    const report = JSON.parse(
      execFileSync(process.execPath, ['scripts/conciliar-certificados.mjs'], {
        env: { ...process.env, DATABASE_URL: url.toString(), CERTIFICATES_DIR: storage },
        encoding: 'utf8',
      }),
    ) as { candidatosSinReferencia: { archivo: string }[]; problemas: unknown[] };
    expect(report.problemas).toHaveLength(0);
    expect(report.candidatosSinReferencia.length).toBeGreaterThanOrEqual(1);
    expect(
      report.candidatosSinReferencia.every((item) => item.archivo.startsWith(`${pending.id}.`)),
    ).toBe(true);
  } finally {
    await database?.onModuleDestroy();
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool.end();
    await rm(storage, { recursive: true, force: true });
  }
});
