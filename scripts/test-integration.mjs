import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readdir } from 'node:fs/promises';
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

  const extraJestArgs = process.argv.slice(2).filter((arg) => arg !== '--coverage');
  const jestArgs = [
    '--experimental-vm-modules',
    fileURLToPath(new URL('../node_modules/jest/bin/jest.js', import.meta.url)),
    '--config',
    'apps/api/jest.config.cjs',
    '--selectProjects',
    ...(coverage ? ['unit', 'integration'] : ['integration']),
    '--runInBand',
    ...extraJestArgs,
  ];
  if (coverage) {
    const modules = resolve(root, 'apps/api/src/modules');
    const files = await readdir(modules, { recursive: true, withFileTypes: true });
    const ruleFilePattern =
      /(\.(service|calculo|guard|pdf)|^(cola-grupos|provisionar-acceso-local))\.ts$/;
    const thresholds = Object.fromEntries(
      files
        .filter(
          (entry) =>
            entry.isFile() && !entry.name.endsWith('.spec.ts') && ruleFilePattern.test(entry.name),
        )
        .map((entry) => [resolve(entry.parentPath, entry.name), { lines: 70, branches: 70 }]),
    );
    if (!Object.keys(thresholds).length) throw new Error('No se encontraron archivos de reglas.');
    // CSRF y zona horaria residen en auth.service/auth.guard y oferta.service;
    // el origen y la validación del entorno son reglas críticas fuera de modules.
    for (const file of ['environment.ts', 'origin.ts']) {
      thresholds[resolve(root, 'apps/api/src/config', file)] = { lines: 70, branches: 70 };
    }
    jestArgs.push(
      '--coverage',
      '--coverageDirectory',
      resolve(root, '.local/e09-coverage'),
      '--collectCoverageFrom',
      'src/modules/**/*.{service,calculo,guard,pdf}.ts',
      '--collectCoverageFrom',
      'src/modules/**/{cola-grupos,provisionar-acceso-local}.ts',
      '--collectCoverageFrom',
      'src/config/{environment,origin}.ts',
      '--coverageThreshold',
      JSON.stringify(thresholds),
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
