import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync, fork } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { DatabaseService } from '../apps/api/dist/database/database.service.js';
import { parseEnvironment, requireTestDatabaseUrl } from '../apps/api/dist/config/environment.js';
import { seedData, seedId } from '../apps/api/dist/database/seed-data.js';
import { CertificadosService } from '../apps/api/dist/modules/certificados/certificados.service.js';

config({ path: new URL('../.env', import.meta.url), quiet: true });
const base = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);
const schema = `siga_cert_crash_${randomUUID().replaceAll('-', '')}`;
const url = new URL(base);
url.searchParams.set('schema', schema);
const pool = new Pool({ connectionString: base });
const storage = await mkdtemp(join(tmpdir(), 'siga-cert-crash-'));
let database;
let schemaCreated = false;
let child;

async function interruptAt(phase, id, actor) {
  child = fork(resolve('scripts/certificados-crash-worker.mjs'), [id, actor.userId, phase], {
    env: { ...process.env, TEST_DATABASE_URL: url.toString(), CERTIFICATES_DIR: storage },
    stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
  });
  const worker = child;
  await new Promise((resolveReady, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Sin respuesta del trabajador: ${phase}`)),
      30000,
    );
    worker.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    worker.once('exit', (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`Trabajador termino antes del punto: ${code}/${signal}`));
    });
    worker.once('message', (message) => {
      clearTimeout(timeout);
      if (message?.phase !== phase) reject(new Error('Punto inesperado.'));
      else resolveReady();
    });
  });
  const exited = new Promise((done) =>
    worker.once('exit', (code, signal) => done({ code, signal })),
  );
  assert.equal(worker.kill('SIGKILL'), true);
  assert.deepEqual(await exited, { code: null, signal: 'SIGKILL' });
  child = undefined;
}

try {
  await pool.query(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
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
  const namespace = `crash-${randomUUID()}`;
  await database.transaction((tx) => seedData(tx, namespace), { timeout: 60000 });
  const actor = {
    userId: seedId(namespace, 'estudiante1'),
    sessionId: randomUUID(),
    rol: 'ESTUDIANTE',
    correo: 'ejemplo@demo.invalid',
  };
  const service = new CertificadosService(database, environment);
  const issued = await service.emitirPropio(actor);
  const original = await database.client.certificado.findUniqueOrThrow({
    where: { id: issued.id },
  });
  const makePending = async () => {
    const codigo = randomUUID().replaceAll('-', '');
    return database.client.certificado.create({
      data: {
        estudianteId: original.estudianteId,
        tipo: 'ESTUDIOS',
        codigo,
        estado: 'PENDIENTE',
        solicitadoEn: original.solicitadoEn,
        instantanea: { ...original.instantanea, codigo },
      },
    });
  };
  const before = await makePending();
  await interruptAt('antes-commit', before.id, actor);
  assert.equal(
    (await database.client.certificado.findUniqueOrThrow({ where: { id: before.id } })).estado,
    'PENDIENTE',
  );
  assert.equal(
    (await readdir(storage)).filter((file) => file.startsWith(`${before.id}.`)).length,
    1,
  );
  await service.recuperar(before.id, actor);
  assert.equal(
    (await database.client.certificado.findUniqueOrThrow({ where: { id: before.id } })).estado,
    'EMITIDO',
  );
  assert.equal(
    await database.client.auditoria.count({
      where: { recursoId: before.id, accion: 'EMITIR_CERTIFICADO' },
    }),
    1,
  );
  const after = await makePending();
  await interruptAt('despues-commit', after.id, actor);
  const confirmed = await database.client.certificado.findUniqueOrThrow({
    where: { id: after.id },
  });
  assert.equal(confirmed.estado, 'EMITIDO');
  const bytes = await readFile(confirmed.archivoRuta);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), confirmed.archivoSha256);
  await assert.rejects(
    () => service.recuperar(after.id, actor),
    (error) => error.status === 409,
  );
  assert.equal(
    await database.client.auditoria.count({
      where: { recursoId: after.id, accion: 'EMITIR_CERTIFICADO' },
    }),
    1,
  );
  assert.equal(
    (await service.descargarPdf(after.id, actor)).bytes.subarray(0, 5).toString(),
    '%PDF-',
  );
  console.log(
    JSON.stringify({
      resultado: 'PASO',
      antesCommit: 'pendiente, archivo huerfano, recuperacion unica',
      despuesCommit: 'emitido, hash y descarga validos, reintento rechazado',
    }),
  );
} finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = new Promise((done) => child.once('exit', done));
    child.kill('SIGKILL');
    await exited;
  }
  await database?.onModuleDestroy();
  if (schemaCreated) await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
  await pool.end();
  await rm(storage, { recursive: true, force: true });
}
