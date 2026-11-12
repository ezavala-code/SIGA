import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { requireTestDatabaseUrl } from '../apps/api/src/config/environment.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
config({ path: new URL('../.env', import.meta.url), quiet: true });

const baseUrl = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);
const schemaName = `siga_test_run_${randomUUID().replaceAll('-', '')}`;
const coverage = process.argv.includes('--coverage');
const url = new URL(baseUrl);
url.searchParams.set('schema', schemaName);
let schemaCreated = false;
const pool = new Pool({ connectionString: baseUrl, connectionTimeoutMillis: 2000 });

try {
  await pool.query(`CREATE SCHEMA "${schemaName}"`);
  schemaCreated = true;

  const migration = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url)),
      'migrate',
      'deploy',
      '--config',
      'apps/api/prisma.config.ts',
    ],
    {
      cwd: root,
      env: { ...process.env, DATABASE_URL: url.toString() },
      stdio: 'inherit',
    },
  );
  if (migration.error || migration.status !== 0) {
    throw new Error('No se pudo preparar el esquema temporal para las pruebas de integración.');
  }

  const jestArgs = [
    '--experimental-vm-modules',
    fileURLToPath(new URL('../node_modules/jest/bin/jest.js', import.meta.url)),
    '--config',
    'apps/api/jest.config.cjs',
    '--selectProjects',
    'integration',
    '--runInBand', '--runTestsByPath', 'apps/api/test/certificados.integration.spec.ts', '--testNamePattern', 'recupera una reemisión',
  ];
  if (coverage) {
    jestArgs.push(
      '--coverage',
      '--coverageDirectory',
      resolve(root, '.local/e09-coverage'),
      '--collectCoverageFrom',
      'src/modules/**/*.service.ts',
    );
  }

  const tests = spawnSync(process.execPath, jestArgs, {
    cwd: root,
    env: { ...process.env, TEST_DATABASE_URL: url.toString() },
    stdio: 'inherit',
  });
  if (tests.error) throw new Error('No se pudo iniciar Jest para las pruebas de integración.');
  process.exitCode = tests.status ?? 1;
} finally {
  if (schemaCreated) {
    await pool.query(`DROP SCHEMA "${schemaName}" CASCADE`);
  }
  await pool.end();
}
