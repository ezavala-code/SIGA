import { randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { requireTestDatabaseUrl } from '../apps/api/src/config/environment.ts';
import { createDatabaseClient } from '../apps/api/dist/database/client.js';
import { seedData, seedId } from '../apps/api/dist/database/seed-data.js';

const root = fileURLToPath(new URL('../', import.meta.url));
config({ path: new URL('../.env', import.meta.url), quiet: true });
let activeChild;
let interrupted;
const onInterrupt = () => interrupt('SIGINT');
const onTerminate = () => interrupt('SIGTERM');

function interrupt(signal) {
  interrupted ??= signal;
  activeChild?.kill('SIGINT');
}

function throwIfInterrupted() {
  if (interrupted) throw new Error(`E2E interrumpido por ${interrupted}.`);
}

function runChild(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
    activeChild = child;
    child.once('error', (error) => {
      activeChild = undefined;
      reject(error);
    });
    child.once('exit', (code) => {
      activeChild = undefined;
      resolve(interrupted ? (interrupted === 'SIGINT' ? 130 : 143) : (code ?? 1));
    });
  });
}

const testUrl = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);
const url = new URL(testUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
  throw new Error('E2E aislado requiere una base de pruebas local.');
}
const schema = `siga_e2e_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);
const pool = new Pool({ connectionString: testUrl, connectionTimeoutMillis: 2000 });
let created = false;
let certificatesDir;
process.on('SIGINT', onInterrupt);
process.on('SIGTERM', onTerminate);
try {
  await pool.query(`CREATE SCHEMA "${schema}"`);
  created = true;
  throwIfInterrupted();
  const migration = await runChild(
    [
      fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url)),
      'migrate',
      'deploy',
      '--config',
      'apps/api/prisma.config.ts',
    ],
    { ...process.env, DATABASE_URL: url.toString() },
  );
  if (migration !== 0) throw new Error('Falló o se interrumpió la migración E2E.');
  const password = randomBytes(24).toString('base64url');
  const hash = await bcrypt.hash(password, 4);
  const client = createDatabaseClient(url.toString());
  const accounts = {};
  const journeys = {};
  const designJourneys = {};
  const certificateJourneys = {};
  try {
    await client.$transaction(
      async (tx) => {
        await seedData(tx, schema);
        const now = Date.now();
        const day = 24 * 60 * 60 * 1000;
        await tx.periodo.update({
          where: { id: seedId(schema, 'actual') },
          data: {
            inicio: new Date(now - 30 * day),
            fin: new Date(now + 90 * day),
            inscripcionInicio: new Date(now - 7 * day),
            inscripcionFin: new Date(now + 7 * day),
          },
        });
        for (const [role, name] of [
          ['ADMINISTRADOR', 'admin'],
          ['DOCENTE', 'docente1'],
          ['ESTUDIANTE', 'estudiante1'],
          ['ESTUDIANTE_2', 'estudiante2'],
        ]) {
          const user = await tx.usuario.update({
            where: { id: seedId(schema, name) },
            data: { activo: true, passwordHash: hash },
          });
          accounts[role] = { email: user.correo, password };
        }
        for (const project of ['desktop', 'mobile']) {
          const namespace = `${schema}_${project}`;
          await seedData(tx, namespace);
          await tx.periodo.update({
            where: { id: seedId(namespace, 'actual') },
            data: {
              inicio: new Date(now - 30 * day),
              fin: new Date(now + 90 * day),
              inscripcionInicio: new Date(now - 7 * day),
              inscripcionFin: new Date(now + 7 * day),
            },
          });
          const student = await tx.usuario.update({
            where: { id: seedId(namespace, 'estudiante3') },
            data: { activo: true, passwordHash: hash },
          });
          const teacher = await tx.usuario.update({
            where: { id: seedId(namespace, 'docente2') },
            data: { activo: true, passwordHash: hash },
          });
          journeys[project] = {
            student: { email: student.correo, password },
            teacher: { email: teacher.correo, password },
            studentId: seedId(namespace, 'persona-estudiante3'),
            groupId: seedId(namespace, 'intro-alterno'),
          };
          const designStudent = await tx.usuario.update({
            where: { id: seedId(namespace, 'estudiante4') },
            data: { activo: true, passwordHash: hash },
          });
          designJourneys[project] = {
            student: { email: designStudent.correo, password },
            teacher: { email: teacher.correo, password },
            studentId: seedId(namespace, 'persona-estudiante4'),
            groupId: seedId(namespace, 'visual-actual'),
          };
          const certificateStudent = await tx.usuario.update({
            where: { id: seedId(namespace, 'estudiante1') },
            data: { activo: true, passwordHash: hash },
          });
          const administrator = await tx.usuario.update({
            where: { id: seedId(namespace, 'admin') },
            data: { activo: true, passwordHash: hash },
          });
          certificateJourneys[project] = {
            student: { email: certificateStudent.correo, password },
            administrator: { email: administrator.correo, password },
            studentId: seedId(namespace, 'persona-estudiante1'),
          };
        }
      },
      { timeout: 60000 },
    );
  } finally {
    await client.$disconnect();
  }
  throwIfInterrupted();
  certificatesDir = await mkdtemp(join(tmpdir(), 'siga-e2e-certificados-'));
  throwIfInterrupted();
  const tests = await runChild(
    [
      fileURLToPath(new URL('../node_modules/@playwright/test/cli.js', import.meta.url)),
      'test',
      ...process.argv.slice(2),
    ],
    {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: url.toString(),
      WEB_ORIGIN: 'http://127.0.0.1:5173',
      PORT: '3000',
      JWT_SECRET: randomBytes(48).toString('base64url'),
      CERTIFICATES_DIR: certificatesDir,
      SIGA_E2E_ACCOUNTS: JSON.stringify(accounts),
      SIGA_E2E_JOURNEYS: JSON.stringify(journeys),
      SIGA_E2E_DESIGN_JOURNEYS: JSON.stringify(designJourneys),
      SIGA_E2E_CERTIFICATE_JOURNEYS: JSON.stringify(certificateJourneys),
      SIGA_E2E_ISOLATED: '1',
      SIGA_E2E_BASE_URL: 'http://127.0.0.1:5173',
    },
  );
  process.exitCode = tests;
} finally {
  try {
    if (created) await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
  } finally {
    try {
      await pool.end();
    } finally {
      if (certificatesDir) await rm(certificatesDir, { recursive: true, force: true });
      process.off('SIGINT', onInterrupt);
      process.off('SIGTERM', onTerminate);
    }
  }
}
