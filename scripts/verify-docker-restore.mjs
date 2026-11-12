import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { cp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { once } from 'node:events';
import { Pool } from 'pg';
import {
  backupRoot,
  composeWebOrigin,
  createPool,
  dockerDatabaseUrl,
  dockerApplicationDatabaseUrl,
  fileSha256,
  fileManifest,
  localRoot,
  root,
  quoteIdentifier,
  run,
  sha256,
  streamFileToCommand,
  tableCounts,
  waitForHealthyApi,
} from './e10-docker-common.mjs';

const compose = ['compose'];
const uuid = randomUUID().replaceAll('-', '');
const restoreDatabase = `siga_restore_e10_${uuid}`;
const restoreDirectory = resolve(localRoot, `e10-restore-${uuid}`);
const apiOrigin = 'http://127.0.0.1:3138';
const browserOrigin = composeWebOrigin();
const dumpImage = process.env.POSTGRES_USER || 'siga';
let databaseCreated = false;
let restoreApi;
let restoreContainer;
let copiedFiles = false;
let restorePool;
const adminPool = createPool();

function inside(parent, target) {
  const path = relative(parent, target);
  return path !== '' && path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

async function latestBackup() {
  const candidates = [];
  for (const name of await readdir(backupRoot)) {
    const directory = resolve(backupRoot, name);
    if (!(await stat(directory)).isDirectory()) continue;
    try {
      const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
      candidates.push({ directory, createdAt: manifest.createdAt });
    } catch {
      // Ignore partial backup directories without a completed manifest.
    }
  }
  candidates.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  if (!candidates.length) throw new Error('No hay un respaldo E10 completo en .local/backups.');
  return candidates[0].directory;
}

const backupArgument = process.argv.indexOf('--backup');
const backupDirectory =
  backupArgument >= 0
    ? resolve(root, process.argv[backupArgument + 1] || '')
    : await latestBackup();
if (!inside(backupRoot, backupDirectory)) {
  throw new Error('El respaldo debe estar dentro de .local/backups.');
}

const manifest = JSON.parse(await readFile(join(backupDirectory, 'manifest.json'), 'utf8'));
if (manifest.formatVersion !== 1 || manifest.database?.file !== 'database.dump') {
  throw new Error('Formato de manifiesto de respaldo no reconocido.');
}
if (process.argv.includes('--require-certificate') && !manifest.certificates?.smokeCertificate) {
  throw new Error('El respaldo no contiene una constancia emitida para verificar la descarga.');
}
const dumpPath = resolve(backupDirectory, manifest.database.file);
const certificatesDirectory = resolve(backupDirectory, manifest.certificates.directory);
if (!inside(backupDirectory, dumpPath) || !inside(backupDirectory, certificatesDirectory)) {
  throw new Error('El manifiesto contiene rutas fuera del respaldo.');
}
if ((await fileSha256(dumpPath)) !== manifest.database.sha256) {
  throw new Error('El SHA-256 del dump no coincide con el manifiesto.');
}
const sourceFiles = await fileManifest(certificatesDirectory);
if (JSON.stringify(sourceFiles) !== JSON.stringify(manifest.certificates.files)) {
  throw new Error('Los hashes de los PDFs del respaldo no coinciden con el manifiesto.');
}

try {
  await run('docker', [
    ...compose,
    'exec',
    '-T',
    'db',
    'pg_isready',
    '-U',
    dumpImage,
    '-d',
    'siga_dev',
  ]);
  const current = await adminPool.query('SELECT current_database() AS name');
  if (current.rows[0]?.name !== 'siga_dev') throw new Error('La base destino no es siga_dev.');
  const exists = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [
    restoreDatabase,
  ]);
  if (exists.rowCount) throw new Error('El identificador temporal de restauración ya existe.');
  await adminPool.query(`CREATE DATABASE "${restoreDatabase}"`);
  databaseCreated = true;

  const dbUser = process.env.POSTGRES_USER || 'siga';
  await streamFileToCommand(dumpPath, 'docker', [
    ...compose,
    'exec',
    '-T',
    'db',
    'pg_restore',
    '--exit-on-error',
    '--no-owner',
    '--no-privileges',
    '-U',
    dbUser,
    '-d',
    restoreDatabase,
  ]);

  restorePool = new Pool({
    connectionString: dockerDatabaseUrl(restoreDatabase),
    connectionTimeoutMillis: 3000,
  });
  restorePool.on('error', () => {});
  const appUser = process.env.POSTGRES_APP_USER || 'siga_app';
  const appRole = await adminPool.query(
    `SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls,
            has_schema_privilege(rolname, 'public', 'CREATE') AS schema_create
     FROM pg_roles WHERE rolname = $1`,
    [appUser],
  );
  const role = appRole.rows[0];
  if (
    !role ||
    role.rolsuper ||
    role.rolcreatedb ||
    role.rolcreaterole ||
    role.rolreplication ||
    role.rolbypassrls ||
    role.schema_create
  ) {
    throw new Error('El rol de aplicación no tiene privilegios mínimos.');
  }
  await adminPool.query(
    `GRANT CONNECT ON DATABASE ${quoteIdentifier(restoreDatabase)} TO ${quoteIdentifier(appUser)}`,
  );
  await restorePool.query(`GRANT USAGE ON SCHEMA public TO ${quoteIdentifier(appUser)}`);
  await restorePool.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${quoteIdentifier(appUser)}`,
  );
  await restorePool.query(
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${quoteIdentifier(appUser)}`,
  );
  await restorePool.query(
    `REVOKE UPDATE, DELETE ON TABLE public."Auditoria" FROM ${quoteIdentifier(appUser)}`,
  );
  const restoredIdentity = await restorePool.query('SELECT current_database() AS name');
  if (restoredIdentity.rows[0]?.name !== restoreDatabase) {
    throw new Error('La conexión de comprobación no apunta a la base restaurada.');
  }
  const restoredCounts = await tableCounts(restorePool);
  if (JSON.stringify(restoredCounts) !== JSON.stringify(manifest.database.rowCounts)) {
    throw new Error('Los conteos de tablas no coinciden con el respaldo.');
  }

  await cp(certificatesDirectory, restoreDirectory, { recursive: true, errorOnExist: true });
  copiedFiles = true;
  const restoredFiles = await fileManifest(restoreDirectory);
  if (JSON.stringify(restoredFiles) !== JSON.stringify(manifest.certificates.files)) {
    throw new Error('Los PDFs restaurados no coinciden con el respaldo.');
  }

  const restoreImage = process.env.SIGA_RESTORE_API_IMAGE;
  if (restoreImage) {
    const dbContainer = await run('docker', [...compose, 'ps', '-q', 'db'], { capture: true });
    const networks = JSON.parse(
      await run('docker', ['inspect', '-f', '{{json .NetworkSettings.Networks}}', dbContainer], {
        capture: true,
      }),
    );
    const networkNames = Object.keys(networks);
    if (networkNames.length !== 1) {
      throw new Error('La base de verificación debe estar conectada a una sola red Docker.');
    }
    const databaseUrl = new URL(dockerApplicationDatabaseUrl(restoreDatabase));
    databaseUrl.hostname = 'db';
    databaseUrl.port = '5432';
    restoreContainer = `siga-restore-api-${uuid}`;
    await run(
      'docker',
      [
        'run',
        '--rm',
        '-d',
        '--name',
        restoreContainer,
        '--label',
        `siga.restore.project=${process.env.COMPOSE_PROJECT_NAME || 'siga'}`,
        '--network',
        networkNames[0],
        '-p',
        '127.0.0.1:3138:3000',
        '-v',
        `${restoreDirectory}:/data/certificados:ro`,
        '-e',
        'DATABASE_URL',
        '-e',
        'JWT_SECRET',
        '-e',
        'NODE_ENV',
        '-e',
        'API_HOST',
        '-e',
        'PORT',
        '-e',
        'WEB_ORIGIN',
        '-e',
        'COOKIE_SECURE',
        '-e',
        'CERTIFICATES_DIR',
        restoreImage,
      ],
      {
        capture: true,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          DATABASE_URL: databaseUrl.toString(),
          API_HOST: '0.0.0.0',
          PORT: '3000',
          WEB_ORIGIN: browserOrigin,
          COOKIE_SECURE: 'false',
          CERTIFICATES_DIR: '/data/certificados',
        },
      },
    );
  } else {
    restoreApi = spawn(process.execPath, [join(root, 'apps/api/dist/main.js')], {
      cwd: root,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: dockerApplicationDatabaseUrl(restoreDatabase),
        API_HOST: '127.0.0.1',
        PORT: '3138',
        WEB_ORIGIN: browserOrigin,
        COOKIE_SECURE: 'false',
        CERTIFICATES_DIR: restoreDirectory,
      },
      stdio: 'ignore',
    });
  }
  await waitForHealthyApi(apiOrigin);

  const credentialLines = (await readFile(join(localRoot, 'admin-acceso-5432.txt'), 'utf8'))
    .split(/\r?\n/)
    .map((line) => line.trim());
  const credentialRow = credentialLines.find((line) => line.startsWith('ADMINISTRADOR\t'));
  if (!credentialRow) throw new Error('No se encontró la cuenta local ADMINISTRADOR.');
  const [, email, password] = credentialRow.split('\t');
  const login = await fetch(`${apiOrigin}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Origin: browserOrigin },
    body: JSON.stringify({ correo: email, password }),
  });
  if (!login.ok) throw new Error(`Login de humo tras restauración devolvió HTTP ${login.status}.`);
  const loginBody = await login.json();
  const cookie = login.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .find((value) => value.startsWith('siga_session='));
  if (!cookie || typeof loginBody.csrfToken !== 'string') {
    throw new Error('La sesión de humo no devolvió cookie y token CSRF.');
  }

  let pdfSmoke = null;
  if (manifest.certificates.smokeCertificate) {
    const certificate = manifest.certificates.smokeCertificate;
    const listing = await fetch(
      `${apiOrigin}/certificados?page=1&pageSize=10&q=${encodeURIComponent(certificate.codigo)}`,
      { headers: { Cookie: cookie, Origin: browserOrigin } },
    );
    if (!listing.ok) throw new Error(`La consulta de constancias devolvió HTTP ${listing.status}.`);
    const listingBody = await listing.json();
    if (!listingBody.items?.some((item) => item.id === certificate.id)) {
      throw new Error('La constancia restaurada no aparece en la consulta autenticada.');
    }
    const verify = await fetch(`${apiOrigin}/certificados/verificar/${certificate.codigo}`);
    if (!verify.ok) throw new Error(`El verificador público devolvió HTTP ${verify.status}.`);
    const verification = await verify.json();
    const expectedPublicState = certificate.estado === 'EMITIDO' ? 'VIGENTE' : 'REVOCADO';
    if (verification.estado !== expectedPublicState) {
      throw new Error('El estado público de la constancia restaurada no coincide.');
    }
    const download = await fetch(`${apiOrigin}/certificados/${certificate.id}/pdf`, {
      headers: { Cookie: cookie, Origin: browserOrigin },
    });
    if (!download.ok) throw new Error(`La descarga restaurada devolvió HTTP ${download.status}.`);
    const bytes = Buffer.from(await download.arrayBuffer());
    if (sha256(bytes) !== certificate.sha256 || bytes.subarray(0, 5).toString() !== '%PDF-') {
      throw new Error('El PDF restaurado no conserva su hash o firma de archivo.');
    }
    pdfSmoke = {
      consulta: listing.status,
      estado: verification.estado,
      sha256Igual: true,
      bytes: bytes.length,
    };
  }

  const logout = await fetch(`${apiOrigin}/auth/logout`, {
    method: 'POST',
    headers: {
      Origin: browserOrigin,
      Cookie: cookie,
      'X-CSRF-Token': loginBody.csrfToken,
    },
  });
  if (!logout.ok) throw new Error(`Logout de humo devolvió HTTP ${logout.status}.`);
  const migrationResult = await restorePool.query(
    'SELECT count(*)::text AS total FROM public."_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL',
  );

  console.log(
    JSON.stringify({
      respaldo: relative(root, backupDirectory).split(sep).join('/'),
      baseRestaurada: restoreDatabase,
      conteosIguales: true,
      tablas: Object.keys(restoredCounts).length,
      archivosIguales: true,
      archivos: restoredFiles.length,
      apiHealth: 'ok',
      inicioSesion: login.status,
      cierreSesion: logout.status,
      certificado: pdfSmoke,
      migracionesAplicadas: migrationResult.rows[0]?.total ?? '0',
      rolAplicacion: appUser,
      rolSinPrivilegiosDDL: true,
      apiImagen: restoreImage ?? null,
      baseTemporal: 'se eliminará al terminar la verificación',
    }),
  );
} finally {
  let containerCleanupError;
  if (restoreContainer) {
    const result = spawnSync('docker', ['rm', '-f', restoreContainer], { encoding: 'utf8' });
    if (result.status !== 0 && !result.stderr.includes('No such container')) {
      containerCleanupError = new Error(
        `No se pudo retirar el contenedor temporal ${restoreContainer}: ${result.stderr}`,
      );
    }
  }
  await restorePool?.end();
  if (restoreApi && restoreApi.exitCode === null) {
    restoreApi.kill('SIGTERM');
    await Promise.race([
      once(restoreApi, 'exit'),
      new Promise((resolveWait) => setTimeout(resolveWait, 5000)),
    ]);
    if (restoreApi.exitCode === null) restoreApi.kill('SIGKILL');
  }
  if (databaseCreated && /^siga_restore_e10_[a-f0-9]{32}$/.test(restoreDatabase)) {
    await adminPool.query(`DROP DATABASE "${restoreDatabase}" WITH (FORCE)`);
  }
  await adminPool.end();
  if (copiedFiles && !containerCleanupError && inside(localRoot, restoreDirectory)) {
    await rm(restoreDirectory, { recursive: true, force: true });
  }
  if (containerCleanupError) {
    console.error(containerCleanupError.message);
    process.exitCode = 1;
  }
}
