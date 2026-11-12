import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  composeWebOrigin,
  createPool,
  localRoot,
  persistComposeVersion,
  root,
  run,
  waitForHealthyApi,
} from './e10-docker-common.mjs';

const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const stamp = new Date()
  .toISOString()
  .replaceAll(/[-:.TZ]/g, '')
  .slice(0, 14);
const versionArgument = process.argv.indexOf('--version');
const requestedVersion =
  versionArgument >= 0 ? process.argv[versionArgument + 1] : process.env.SIGA_RELEASE_VERSION;
if (versionArgument >= 0 && !requestedVersion) {
  throw new Error('Indica la versión con --version <etiqueta>.');
}
const releaseVersion = requestedVersion || `${packageJson.version}-e10-${stamp}`;
if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/.test(releaseVersion)) {
  throw new Error('SIGA_VERSION solo puede contener letras, números, punto, guion o guion bajo.');
}
process.env.SIGA_VERSION = releaseVersion;

const rollbackVersion = `rollback-${stamp}-${randomUUID().slice(0, 6)}`;
const releasesDirectory = resolve(localRoot, 'releases');
const releasePath = resolve(releasesDirectory, `release-${releaseVersion}.json`);
const pool = createPool();
const webOrigin = composeWebOrigin();
const compose = ['compose'];
const runNpm = (args, options) =>
  process.platform === 'win32'
    ? run('cmd.exe', ['/d', '/s', '/c', `npm ${args.join(' ')}`], options)
    : run('npm', args, options);
let previous = null;
let backupPath = null;
let migrationsBefore = [];
let migrationsAfter = [];
let deploymentAttempted = false;

async function appliedMigrations() {
  const { rows } = await pool.query(
    `SELECT migration_name FROM public."_prisma_migrations"
     WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`,
  );
  return rows.map((row) => row.migration_name);
}

async function smokeTest() {
  const api = await fetch(`${webOrigin}/api/health`, {
    signal: AbortSignal.timeout(5000),
  });
  const apiBody = await api.json();
  if (
    !api.ok ||
    apiBody?.status !== 'ok' ||
    (apiBody?.checks?.database !== 'up' && apiBody?.database !== 'up')
  ) {
    throw new Error('El endpoint /api/health no confirmó que PostgreSQL esté disponible.');
  }
  const web = await fetch(`${webOrigin}/`, { signal: AbortSignal.timeout(5000) });
  if (!web.ok || !(await web.text()).includes('<html')) {
    throw new Error('La interfaz web no pasó la prueba de humo.');
  }
  await waitForHealthyApi(`${webOrigin}/api`);
  return { api: 'ok', base: 'up', web: web.status };
}

async function writeRelease(details) {
  await mkdir(releasesDirectory, { recursive: true });
  await writeFile(releasePath, `${JSON.stringify(details, null, 2)}\n`, {
    flag: 'wx',
    mode: 0o600,
  });
}

try {
  if (existsSync(releasePath)) throw new Error(`Ya existe el manifiesto ${releasePath}.`);
  const apiId = await run('docker', [...compose, 'ps', '-q', 'api'], { capture: true });
  const webId = await run('docker', [...compose, 'ps', '-q', 'web'], { capture: true });
  if (!apiId || !webId)
    throw new Error('Se requiere una versión anterior activa para desplegar E10.');
  const [apiImageId, webImageId] = await Promise.all([
    run('docker', ['inspect', '-f', '{{.Image}}', apiId], { capture: true }),
    run('docker', ['inspect', '-f', '{{.Image}}', webId], { capture: true }),
  ]);
  await run('docker', ['image', 'inspect', apiImageId], { capture: true });
  await run('docker', ['image', 'tag', apiImageId, `siga-api:${rollbackVersion}`]);
  try {
    await run('docker', ['image', 'inspect', webImageId], { capture: true });
    await run('docker', ['image', 'tag', webImageId, `siga-web:${rollbackVersion}`]);
  } catch {
    // Docker may have removed the untagged image while its exact container still runs.
    // The web image has no application secrets; snapshot its current filesystem/config.
    await run('docker', ['commit', webId, `siga-web:${rollbackVersion}`]);
  }
  previous = {
    version: rollbackVersion,
    apiImageId,
    webImageId,
    apiImage: `siga-api:${rollbackVersion}`,
    webImage: `siga-web:${rollbackVersion}`,
  };
  migrationsBefore = await appliedMigrations();

  await runNpm(['run', 'check']);
  await runNpm(['run', 'test:integration']);
  await run('docker', [...compose, 'config', '--quiet']);
  await run('docker', [...compose, 'build']);

  const backupOutput = await runNpm(['run', 'docker:backup'], { capture: true });
  const backupRecord = backupOutput
    .split(/\r?\n/)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .find((value) => value?.respaldo);
  if (!backupRecord) throw new Error('El respaldo previo al despliegue no devolvió su ubicación.');
  backupPath = backupRecord.respaldo;

  deploymentAttempted = true;
  await run('docker', [...compose, 'up', '-d', '--wait']);
  const smoke = await smokeTest();
  migrationsAfter = await appliedMigrations();
  await persistComposeVersion(releaseVersion);
  const status = 'deployed';
  await writeRelease({
    formatVersion: 1,
    status,
    deployedAt: new Date().toISOString(),
    applicationVersion: packageJson.version,
    releaseVersion,
    backupPath,
    migrationsBefore,
    migrationsAfter,
    migrationSetUnchanged: JSON.stringify(migrationsBefore) === JSON.stringify(migrationsAfter),
    previous,
    smoke,
  });
  console.log(
    JSON.stringify({ version: releaseVersion, estado: status, respaldo: backupPath, humo: smoke }),
  );
} catch (error) {
  let rollbackStatus = 'no-ejecutado';
  let rollbackReason = error instanceof Error ? error.message : 'Error de despliegue.';
  try {
    if (previous && deploymentAttempted) {
      migrationsAfter = await appliedMigrations();
      if (JSON.stringify(migrationsBefore) !== JSON.stringify(migrationsAfter)) {
        rollbackStatus = 'bloqueado-por-cambio-de-esquema';
        rollbackReason = `${rollbackReason} La lista de migraciones cambió; se conserva el respaldo y se requiere recuperación compatible revisada.`;
      } else {
        process.env.SIGA_VERSION = rollbackVersion;
        await run('docker', [...compose, 'up', '-d', '--no-build', '--wait', 'api', 'web']);
        await smokeTest();
        rollbackStatus = 'aplicacion-anterior-restaurada';
        await persistComposeVersion(rollbackVersion);
      }
    }
  } catch (rollbackError) {
    rollbackStatus = 'fallo';
    rollbackReason += ` Falló también la reversión: ${rollbackError instanceof Error ? rollbackError.message : 'error'}.`;
  }
  const details = {
    formatVersion: 1,
    status: rollbackStatus,
    failedAt: new Date().toISOString(),
    applicationVersion: packageJson.version,
    releaseVersion,
    backupPath,
    error: rollbackReason,
    migrationsBefore,
    migrationsAfter,
    previous,
  };
  if (!existsSync(releasePath)) {
    await mkdir(releasesDirectory, { recursive: true });
    await writeFile(releasePath, `${JSON.stringify(details, null, 2)}\n`, {
      flag: 'wx',
      mode: 0o600,
    });
  }
  console.error(
    JSON.stringify({ version: releaseVersion, estado: rollbackStatus, error: rollbackReason }),
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
