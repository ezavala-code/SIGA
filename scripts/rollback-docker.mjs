import { readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import {
  composeWebOrigin,
  createPool,
  localRoot,
  persistComposeVersion,
  root,
  run,
  waitForHealthyApi,
} from './e10-docker-common.mjs';

const releaseArgument = process.argv.indexOf('--release');
if (releaseArgument < 0 || !process.argv[releaseArgument + 1]) {
  throw new Error('Indica el manifiesto con --release .local/releases/release-<version>.json.');
}
const releasePath = resolve(root, process.argv[releaseArgument + 1]);
const releasesRoot = resolve(localRoot, 'releases');
const releaseRelative = relative(releasesRoot, releasePath);
if (
  releaseRelative === '' ||
  releaseRelative === '..' ||
  releaseRelative.startsWith(`..${sep}`) ||
  isAbsolute(releaseRelative)
) {
  throw new Error('El manifiesto de despliegue debe estar dentro de .local/releases.');
}

const release = JSON.parse(await readFile(releasePath, 'utf8'));
if (release.status !== 'deployed' || !release.previous?.version) {
  throw new Error('El manifiesto no describe una versión desplegada con imagen anterior guardada.');
}
if (JSON.stringify(release.migrationsBefore) !== JSON.stringify(release.migrationsAfter)) {
  throw new Error('No se revierte la aplicación automáticamente: la versión cambió el esquema.');
}

const pool = createPool();
const webOrigin = composeWebOrigin();
try {
  const { rows } = await pool.query(
    `SELECT migration_name FROM public."_prisma_migrations"
     WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`,
  );
  const currentMigrations = rows.map((row) => row.migration_name);
  if (JSON.stringify(currentMigrations) !== JSON.stringify(release.migrationsAfter)) {
    throw new Error(
      'El esquema cambió después del despliegue; revisa recuperación antes de revertir.',
    );
  }

  await run('docker', ['image', 'inspect', release.previous.apiImage], { capture: true });
  await run('docker', ['image', 'inspect', release.previous.webImage], { capture: true });
  process.env.SIGA_VERSION = release.previous.version;
  await run('docker', ['compose', 'up', '-d', '--no-build', '--wait', 'api', 'web']);

  const api = await fetch(`${webOrigin}/api/health`, {
    signal: AbortSignal.timeout(5000),
  });
  const health = await api.json();
  const web = await fetch(`${webOrigin}/`, { signal: AbortSignal.timeout(5000) });
  if (
    !api.ok ||
    health?.status !== 'ok' ||
    (health?.checks?.database !== 'up' && health?.database !== 'up') ||
    !web.ok
  ) {
    throw new Error('La versión anterior no pasó las pruebas de humo.');
  }
  await waitForHealthyApi(`${webOrigin}/api`);

  await persistComposeVersion(release.previous.version);
  release.status = 'rolled-back';
  release.rolledBackAt = new Date().toISOString();
  release.rollbackSmoke = { api: 'ok', base: 'up', web: web.status };
  await writeFile(releasePath, `${JSON.stringify(release, null, 2)}\n`);
  console.log(
    JSON.stringify({
      estado: release.status,
      versionAnterior: release.previous.version,
      humo: release.rollbackSmoke,
    }),
  );
} finally {
  await pool.end();
}
