import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  mkdtemp,
  mkdir,
  cp,
  symlink,
  writeFile,
  readFile,
  readdir,
  appendFile,
  rm,
} from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'siga-backup-test-'));
const project = `siga-backup-test-${randomUUID().replaceAll('-', '')}`;
const dbPassword = randomBytes(24).toString('hex');
const appPassword = randomBytes(24).toString('hex');
const password = randomBytes(24).toString('hex');
const secret = randomBytes(32).toString('hex');
const image = process.env.SIGA_BACKUP_TEST_IMAGE || 'siga-pdf-check:temporary';
const packaged = process.argv.includes('--packaged');
const webImage = process.env.SIGA_BACKUP_TEST_WEB_IMAGE;
const migrateImage = process.env.SIGA_BACKUP_TEST_MIGRATE_IMAGE;
let pool;
let client;
let composeStarted = false;

async function freePort(port = 0) {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const result = server.address().port;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return result;
}
function command(program, args, env, options = {}) {
  const result = spawnSync(program, args, { cwd: temporary, env, encoding: 'utf8', ...options });
  if (result.status !== 0) {
    throw new Error(`${program} falló (${result.status}): ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}
async function ready(url) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch (error) {
      if (!(error instanceof Error)) throw error;
    }
    await delay(500);
  }
  throw new Error('La API aislada no estuvo disponible.');
}

try {
  if (packaged && (!process.env.SIGA_BACKUP_TEST_IMAGE || !webImage || !migrateImage)) {
    throw new Error('El modo empaquetado exige las imágenes API, web y de migraciones.');
  }
  await freePort(3138);
  const dbPort = await freePort();
  const webPort = await freePort();
  const origin = `http://localhost:${webPort}`;
  const databaseUrl = `postgresql://siga:${dbPassword}@127.0.0.1:5432/siga_dev`;
  const actualUrl = `postgresql://siga:${dbPassword}@127.0.0.1:${dbPort}/siga_dev`;
  const env = {
    ...process.env,
    COMPOSE_PROJECT_NAME: project,
    COMPOSE_FILE: join(temporary, 'compose.yml'),
    POSTGRES_USER: 'siga',
    POSTGRES_PASSWORD: dbPassword,
    POSTGRES_DB: 'siga_dev',
    POSTGRES_APP_USER: 'siga_app',
    POSTGRES_APP_PASSWORD: appPassword,
    POSTGRES_PORT: String(dbPort),
    WEB_PORT: String(webPort),
    DATABASE_URL: databaseUrl,
    JWT_SECRET: secret,
    SIGA_RESTORE_API_IMAGE: '',
  };
  const apiImageId = command('docker', ['image', 'inspect', '-f', '{{.Id}}', image], env).trim();
  const webImageId = packaged
    ? command('docker', ['image', 'inspect', '-f', '{{.Id}}', webImage], env).trim()
    : '';
  const migrateImageId = packaged
    ? command('docker', ['image', 'inspect', '-f', '{{.Id}}', migrateImage], env).trim()
    : '';
  if (packaged) env.SIGA_RESTORE_API_IMAGE = apiImageId;
  await mkdir(join(temporary, 'scripts'), { recursive: true });
  await mkdir(join(temporary, 'apps/api'), { recursive: true });
  await mkdir(join(temporary, '.local'), { recursive: true, mode: 0o700 });
  for (const name of ['backup-docker.mjs', 'verify-docker-restore.mjs', 'e10-docker-common.mjs']) {
    await cp(join(root, 'scripts', name), join(temporary, 'scripts', name));
  }
  await cp(join(root, 'package.json'), join(temporary, 'package.json'));
  await cp(join(root, 'apps/api/package.json'), join(temporary, 'apps/api/package.json'));
  await cp(join(root, 'apps/api/dist'), join(temporary, 'apps/api/dist'), { recursive: true });
  await cp(join(root, 'apps/api/assets'), join(temporary, 'apps/api/assets'), { recursive: true });
  await symlink(join(root, 'node_modules'), join(temporary, 'node_modules'), 'dir');
  await writeFile(
    join(temporary, 'nginx.conf'),
    'events {}\nhttp { server { listen 80; location /api/ { proxy_pass http://api:3000/; proxy_set_header Host $host; } } }\n',
  );
  await writeFile(
    join(temporary, 'compose.yml'),
    JSON.stringify({
      services: {
        db: {
          image: 'postgres:18.6-alpine',
          environment: {
            POSTGRES_USER: 'siga',
            POSTGRES_PASSWORD: dbPassword,
            POSTGRES_DB: 'siga_dev',
          },
          ports: [`127.0.0.1:${dbPort}:5432`],
          tmpfs: ['/var/lib/postgresql'],
        },
        api: {
          image: apiImageId,
          environment: {
            NODE_ENV: packaged ? 'production' : 'test',
            API_HOST: '0.0.0.0',
            PORT: '3000',
            WEB_ORIGIN: origin,
            DATABASE_URL: `postgresql://siga_app:${appPassword}@db:5432/siga_dev`,
            JWT_SECRET: secret,
            CERTIFICATES_DIR: '/data/certificados',
            COOKIE_SECURE: 'false',
          },
          volumes: packaged
            ? ['certificados:/data/certificados']
            : [
                'certificados:/data/certificados',
                `${join(root, 'apps/api/dist')}:/app/apps/api/dist:ro`,
                `${join(root, 'apps/api/assets')}:/app/apps/api/assets:ro`,
              ],
        },
        web: {
          image: packaged ? webImageId : 'nginx:1.27-alpine',
          ports: [`127.0.0.1:${webPort}:80`],
          ...(packaged
            ? {}
            : { volumes: [`${join(temporary, 'nginx.conf')}:/etc/nginx/nginx.conf:ro`] }),
        },
      },
      volumes: { certificados: {} },
    }),
  );
  composeStarted = true;
  command('docker', ['compose', 'up', '-d', 'db'], env);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = spawnSync(
      'docker',
      ['compose', 'exec', '-T', 'db', 'pg_isready', '-U', 'siga', '-d', 'siga_dev'],
      { cwd: temporary, env },
    );
    if (result.status === 0) break;
    if (attempt === 59) throw new Error('PostgreSQL aislado no estuvo disponible.');
    await delay(500);
  }
  if (packaged) {
    command(
      'docker',
      ['run', '--rm', '--network', `${project}_default`, '-e', 'DATABASE_URL', migrateImageId],
      { ...env, DATABASE_URL: `postgresql://siga:${dbPassword}@db:5432/siga_dev` },
    );
  } else {
    command(
      process.execPath,
      [
        join(root, 'node_modules/prisma/build/index.js'),
        'migrate',
        'deploy',
        '--config',
        join(root, 'apps/api/prisma.config.ts'),
      ],
      { ...env, DATABASE_URL: actualUrl },
      { cwd: root },
    );
  }
  pool = new Pool({ connectionString: actualUrl });
  await pool.query(
    `CREATE ROLE siga_app LOGIN PASSWORD '${appPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`,
  );
  await pool.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
  await pool.query('GRANT CONNECT ON DATABASE siga_dev TO siga_app');
  await pool.query('GRANT USAGE ON SCHEMA public TO siga_app');
  await pool.query(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO siga_app',
  );
  await pool.query('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO siga_app');
  await pool.query('REVOKE UPDATE, DELETE ON TABLE public."Auditoria" FROM siga_app');
  const { createDatabaseClient } = await import(
    pathToFileURL(join(root, 'apps/api/dist/database/client.js'))
  );
  const { seedData, seedId } = await import(
    pathToFileURL(join(root, 'apps/api/dist/database/seed-data.js'))
  );
  client = createDatabaseClient(actualUrl);
  const namespace = `backup-${randomUUID()}`;
  await client.$transaction((tx) => seedData(tx, namespace), { timeout: 30000 });
  const id = (name) => seedId(namespace, name);
  const hash = await bcrypt.hash(password, 10);
  for (const name of ['admin', 'estudiante1', 'estudiante2']) {
    await client.usuario.update({
      where: { id: id(name) },
      data: { activo: true, passwordHash: hash },
    });
  }
  await client.estudiante.update({
    where: { id: id('persona-estudiante2') },
    data: { nombre: 'София 明' },
  });
  const admin = await client.usuario.findUniqueOrThrow({ where: { id: id('admin') } });
  const student1 = await client.usuario.findUniqueOrThrow({ where: { id: id('estudiante1') } });
  await writeFile(
    join(temporary, '.local/admin-acceso-5432.txt'),
    `ADMINISTRADOR\t${admin.correo}\t${password}\n`,
    { mode: 0o600 },
  );
  await client.$disconnect();
  client = undefined;
  command(
    'docker',
    [
      'compose',
      'run',
      '--rm',
      '--no-deps',
      '--user',
      '0',
      '--entrypoint',
      'sh',
      'api',
      '-c',
      'chown 1000:1000 /data/certificados && chmod 700 /data/certificados',
    ],
    env,
  );
  command('docker', ['compose', 'up', '-d', 'api', 'web'], env);
  await ready(`${origin}/api/health`);
  if (packaged) {
    const index = await fetch(`${origin}/`);
    assert.equal(index.status, 200, 'Página inicial empaquetada');
    const html = await index.text();
    const script = html.match(/<script[^>]+src="(\/assets\/[^" ]+\.js)"/);
    assert.ok(script, 'El HTML no referencia el JavaScript empaquetado');
    assert.equal((await fetch(`${origin}${script[1]}`)).status, 200, 'JavaScript empaquetado');
  }
  const login = await fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Origin: origin },
    body: JSON.stringify({ correo: admin.correo, password }),
  });
  assert.equal(login.status, 200, 'Login de la fuente');
  const session = await login.json();
  const cookie = login.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .find((value) => value.startsWith('siga_session='));
  assert.ok(cookie);
  const issue = await fetch(`${origin}/api/certificados/estudiantes/${id('persona-estudiante1')}`, {
    method: 'POST',
    headers: { Origin: origin, Cookie: cookie, 'X-CSRF-Token': session.csrfToken },
  });
  const issueText = await issue.text();
  assert.equal(issue.status, 201, `Emisión de PDF latino: ${issueText}`);
  const issuedLatin = JSON.parse(issueText);
  const issueUnicode = await fetch(
    `${origin}/api/certificados/estudiantes/${id('persona-estudiante2')}`,
    {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'X-CSRF-Token': session.csrfToken },
    },
  );
  const issueUnicodeText = await issueUnicode.text();
  assert.equal(issueUnicode.status, 201, `Emisión de PDF Unicode: ${issueUnicodeText}`);
  const issuedUnicode = JSON.parse(issueUnicodeText);
  const marcaAntes = `antes-${randomUUID()}`;
  const marcaDespues = `despues-${randomUUID()}`;
  const beforeWrite = await pool.query(
    `INSERT INTO "Auditoria" ("accion", "recurso", "recursoId")
     VALUES ('PRUEBA_RPO', 'Simulacro', $1) RETURNING "creadoEn"`,
    [marcaAntes],
  );
  const ultimaEscrituraAt = beforeWrite.rows[0].creadoEn.toISOString();
  await pool.end();
  pool = undefined;
  const backupStartMs = performance.now();
  const backup = command(process.execPath, [join(temporary, 'scripts/backup-docker.mjs')], env);
  const respaldoDuracionMs = Number((performance.now() - backupStartMs).toFixed(2));
  const verifyStartMs = performance.now();
  const verification = command(
    process.execPath,
    [join(temporary, 'scripts/verify-docker-restore.mjs'), '--require-certificate'],
    env,
  );
  const verificacionDuracionMs = Number((performance.now() - verifyStartMs).toFixed(2));
  const result = JSON.parse(verification.trim().split('\n').at(-1));
  assert.equal(result.conteosIguales, true);
  assert.equal(result.archivosIguales, true);
  assert.ok(result.archivos >= 2);
  assert.equal(result.inicioSesion, 200);
  assert.equal(result.certificado?.consulta, 200);
  assert.equal(result.certificado?.estado, 'VIGENTE');
  assert.equal(result.certificado?.sha256Igual, true);
  assert.ok(result.certificado.bytes > 0);
  if (packaged) assert.equal(result.apiImagen, apiImageId);
  const backups = await readdir(join(temporary, '.local/backups'));
  assert.equal(backups.length, 1);
  const backupDirectory = join(temporary, '.local/backups', backups[0]);
  const manifest = JSON.parse(await readFile(join(backupDirectory, 'manifest.json'), 'utf8'));
  // La copia pertenece al simulacro y nunca reemplaza respaldos operativos existentes.
  const retainedBackupDir = join(temporary, 'respaldo-simulacro');
  await cp(backupDirectory, retainedBackupDir, { recursive: true });
  await appendFile(
    join(backupDirectory, 'certificados', manifest.certificates.smokeCertificate.file),
    'alterado',
  );
  const tampered = spawnSync(
    process.execPath,
    [join(temporary, 'scripts/verify-docker-restore.mjs'), '--require-certificate'],
    { cwd: temporary, env, encoding: 'utf8' },
  );
  assert.notEqual(tampered.status, 0, 'Debe rechazar PDF alterado');
  assert.match(tampered.stderr, /hashes de los PDFs/);

  // Esta escritura ocurre después del respaldo y debe faltar al restaurarlo.
  pool = new Pool({ connectionString: actualUrl });
  const afterWrite = await pool.query(
    `INSERT INTO "Auditoria" ("accion", "recurso", "recursoId")
     VALUES ('PRUEBA_RPO', 'Simulacro', $1) RETURNING "creadoEn"`,
    [marcaDespues],
  );
  const escrituraPosteriorAt = afterWrite.rows[0].creadoEn.toISOString();
  await pool.end();
  pool = undefined;

  // R-12 / D46: Simulación de pérdida total de la instalación original y recuperación operativa completa en destino nuevo
  const incidenteInicioAt = new Date().toISOString();
  const incidentStartMs = performance.now();
  command('docker', ['compose', 'down', '--volumes', '--remove-orphans'], env);
  const restauracionInicioAt = new Date().toISOString();
  command('docker', ['compose', 'up', '-d', 'db'], env);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const readyDb = spawnSync(
      'docker',
      ['compose', 'exec', '-T', 'db', 'pg_isready', '-U', 'siga', '-d', 'siga_dev'],
      { cwd: temporary, env },
    );
    if (readyDb.status === 0) break;
    if (attempt === 59) throw new Error('PostgreSQL de recuperación no estuvo disponible.');
    await delay(500);
  }
  const dumpBuffer = await readFile(join(retainedBackupDir, 'database.dump'));
  const restoreDump = spawnSync(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      'db',
      'pg_restore',
      '--exit-on-error',
      '--no-owner',
      '--no-privileges',
      '-U',
      'siga',
      '-d',
      'siga_dev',
    ],
    { cwd: temporary, env, input: dumpBuffer },
  );
  if (restoreDump.status !== 0) {
    throw new Error(`pg_restore de recuperación falló: ${restoreDump.stderr?.toString()}`);
  }
  pool = new Pool({ connectionString: actualUrl });
  const recoveredMarkers = await pool.query(
    `SELECT "recursoId" FROM "Auditoria" WHERE "accion" = 'PRUEBA_RPO'
     AND "recursoId" = ANY($1::text[])`,
    [[marcaAntes, marcaDespues]],
  );
  assert.deepEqual(
    recoveredMarkers.rows.map((row) => row.recursoId),
    [marcaAntes],
  );
  await pool.query(
    `CREATE ROLE siga_app LOGIN PASSWORD '${appPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`,
  );
  await pool.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
  await pool.query('GRANT CONNECT ON DATABASE siga_dev TO siga_app');
  await pool.query('GRANT USAGE ON SCHEMA public TO siga_app');
  await pool.query(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO siga_app',
  );
  await pool.query('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO siga_app');
  await pool.query('REVOKE UPDATE, DELETE ON TABLE public."Auditoria" FROM siga_app');
  await pool.end();
  pool = undefined;

  command(
    'docker',
    [
      'compose',
      'run',
      '--rm',
      '--no-deps',
      '--user',
      '0',
      '-v',
      `${join(retainedBackupDir, 'certificados')}:/backup-certs:ro`,
      '--entrypoint',
      'sh',
      'api',
      '-c',
      'cp -a /backup-certs/. /data/certificados/ && chown -R 1000:1000 /data/certificados && chmod 700 /data/certificados',
    ],
    env,
  );
  command('docker', ['compose', 'up', '-d', 'api', 'web'], env);
  await ready(`${origin}/api/health`);
  const servicioUtilizableAt = new Date().toISOString();

  const recoveredAdminLogin = await fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Origin: origin },
    body: JSON.stringify({ correo: admin.correo, password }),
  });
  assert.equal(recoveredAdminLogin.status, 200, 'Login admin tras recuperación operativa');
  const recoveredAdminCookie = recoveredAdminLogin.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .find((value) => value.startsWith('siga_session='));
  assert.ok(recoveredAdminCookie);

  const recoveredStudentLogin = await fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Origin: origin },
    body: JSON.stringify({ correo: student1.correo, password }),
  });
  assert.equal(recoveredStudentLogin.status, 200, 'Login estudiante tras recuperación operativa');
  const recoveredStudentCookie = recoveredStudentLogin.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .find((value) => value.startsWith('siga_session='));
  assert.ok(recoveredStudentCookie);
  const progressRes = await fetch(`${origin}/api/estudiantes/me/progreso`, {
    headers: { Cookie: recoveredStudentCookie, Origin: origin },
  });
  assert.equal(progressRes.status, 200, 'Progreso académico tras recuperación operativa');
  const gradesRes = await fetch(`${origin}/api/estudiantes/me/calificaciones`, {
    headers: { Cookie: recoveredStudentCookie, Origin: origin },
  });
  assert.equal(gradesRes.status, 200, 'Calificaciones tras recuperación operativa');

  for (const cert of [issuedLatin, issuedUnicode]) {
    const expectedFile = manifest.certificates.files.find((f) => f.path.startsWith(`${cert.id}.`));
    assert.ok(expectedFile, `Manifiesto incluye PDF ${cert.id}`);
    const verifyPublic = await fetch(`${origin}/api/certificados/verificar/${cert.codigo}`);
    assert.equal(verifyPublic.status, 200);
    const verifyJson = await verifyPublic.json();
    assert.equal(verifyJson.estado, 'VIGENTE');
    const pdfRes = await fetch(`${origin}/api/certificados/${cert.id}/pdf`, {
      headers: { Cookie: recoveredAdminCookie, Origin: origin },
    });
    assert.equal(pdfRes.status, 200);
    const pdfBytes = Buffer.from(await pdfRes.arrayBuffer());
    const actualSha256 = createHash('sha256').update(pdfBytes).digest('hex');
    assert.equal(actualSha256, expectedFile.sha256);
  }

  const verificacionFinalAt = new Date().toISOString();
  const rtoSegundos = Number(((performance.now() - incidentStartMs) / 1000).toFixed(2));
  const rpoSegundos = Number(
    (
      (new Date(incidenteInicioAt).getTime() - new Date(ultimaEscrituraAt).getTime()) /
      1000
    ).toFixed(2),
  );
  assert.ok(rtoSegundos <= 4 * 3600, `RTO excede D46 (4 h): ${rtoSegundos}s`);
  assert.ok(rpoSegundos >= 0 && rpoSegundos <= 24 * 3600, `RPO fuera de D46: ${rpoSegundos}s`);

  console.log(
    JSON.stringify({
      prueba: 'respaldo y restauración aislados',
      resultado: result,
      respaldoCreado: Boolean(backup),
      alteracionDetectada: true,
      recuperacionOperativa: {
        resultado: 'PASO',
        respaldoRetenido: false,
        ultimaEscrituraAt,
        escrituraPosteriorAt,
        marcaAnteriorRecuperada: true,
        marcaPosteriorAusente: true,
        respaldoCreatedAt: manifest.createdAt,
        incidenteInicioAt,
        restauracionInicioAt,
        servicioUtilizableAt,
        verificacionFinalAt,
        respaldoDuracionMs,
        verificacionDuracionMs,
        rtoSegundos,
        rpoSegundos,
        constanciaLatinaSha256: manifest.certificates.files.find((f) =>
          f.path.startsWith(`${issuedLatin.id}.`),
        )?.sha256,
        constanciaUnicodeSha256: manifest.certificates.files.find((f) =>
          f.path.startsWith(`${issuedUnicode.id}.`),
        )?.sha256,
      },
      ...(packaged ? { apiImageId, webImageId, migrateImageId, webEmpaquetada: 'ok' } : {}),
    }),
  );
} finally {
  await client?.$disconnect();
  await pool?.end();
  let cleanupSucceeded = true;
  if (composeStarted) {
    const result = spawnSync('docker', ['compose', 'down', '--volumes', '--remove-orphans'], {
      cwd: temporary,
      env: {
        ...process.env,
        COMPOSE_PROJECT_NAME: project,
        COMPOSE_FILE: join(temporary, 'compose.yml'),
      },
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      cleanupSucceeded = false;
      console.error(`No se pudieron retirar los recursos propios ${project}: ${result.stderr}`);
    }
    const remaining = spawnSync(
      'docker',
      ['ps', '-a', '--filter', `label=siga.restore.project=${project}`, '--format', '{{.Names}}'],
      { encoding: 'utf8' },
    );
    if (remaining.status !== 0 || remaining.stdout.trim()) {
      cleanupSucceeded = false;
      console.error(`Quedan recursos de restauración por revisar para ${project}.`);
    }
  }
  if (cleanupSucceeded) await rm(temporary, { recursive: true, force: true });
  else console.error(`Se conserva la configuración aislada en ${temporary} para su limpieza.`);
}
