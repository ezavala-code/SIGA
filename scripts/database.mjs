import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { requireTestDatabaseUrl } from '../apps/api/src/config/environment.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
config({ path: new URL('../.env', import.meta.url), quiet: true });
const [action, target = 'dev'] = process.argv.slice(2);
if (!['deploy', 'status', 'seed'].includes(action) || !['dev', 'test'].includes(target)) {
  throw new Error('Uso: node scripts/database.mjs deploy|status|seed [dev|test]');
}
const connectionString =
  target === 'test'
    ? requireTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL)
    : process.env.DATABASE_URL;
if (!connectionString || !URL.canParse(connectionString))
  throw new Error('Falta una URL de PostgreSQL válida.');
const url = new URL(connectionString);
if (!['postgres:', 'postgresql:'].includes(url.protocol))
  throw new Error('Se requiere PostgreSQL.');
const expectedName = decodeURIComponent(url.pathname.slice(1));
// Semillas limitadas al entorno local de desarrollo/pruebas. Nunca son un paso de producción.
if (
  action === 'seed' &&
  (process.env.NODE_ENV === 'production' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    !['siga_dev', 'siga_test'].includes(expectedName))
) {
  throw new Error('Las semillas solo están habilitadas en siga_dev/siga_test locales.');
}
if (action === 'seed' && target === 'test') {
  throw new Error(
    'No se permite llenar la base de pruebas compartida; las integraciones usan esquemas aislados.',
  );
}
const pool = new Pool({ connectionString, connectionTimeoutMillis: 2000 });
try {
  const { rows } = await pool.query('SELECT current_database() AS name');
  if (rows[0]?.name !== expectedName)
    throw new Error('La base conectada no coincide con la solicitada.');
  console.log(`Base identificada: ${expectedName}; acción: ${action}; destino: ${target}.`);
} catch {
  throw new Error('No se pudo identificar la base. Revisar configuración y servicio PostgreSQL.');
} finally {
  await pool.end();
}
if (action === 'seed') {
  const { createDatabaseClient } = await import('../apps/api/dist/database/client.js');
  const { seedIcoF19Metadata } = await import('../apps/api/dist/database/seed-data.js');
  const client = createDatabaseClient(connectionString);
  try {
    console.log(await seedIcoF19Metadata(client));
  } finally {
    await client.$disconnect();
  }
} else {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url)),
      'migrate',
      action,
      '--config',
      'apps/api/prisma.config.ts',
    ],
    { cwd: root, env: { ...process.env, DATABASE_URL: connectionString }, stdio: 'inherit' },
  );
  if (result.error) throw new Error('No se pudo iniciar Prisma.');
  process.exitCode = result.status ?? 1;
}
