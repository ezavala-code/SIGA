import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { createDatabaseClient } from '../apps/api/dist/database/client.js';
import { seedData, seedId } from '../apps/api/dist/database/seed-data.js';

const apiImage = process.env.SIGA_PROXY_API_IMAGE;
const webImage = process.env.SIGA_PROXY_WEB_IMAGE;
const migrateImage = process.env.SIGA_PROXY_MIGRATE_IMAGE;
if (!apiImage || !webImage || !migrateImage)
  throw new Error('Se requieren tres imagenes candidatas.');
const directory = await mkdtemp(join(tmpdir(), 'siga-proxy-test-'));
const project = `siga-proxy-test-${randomUUID().replaceAll('-', '')}`;
const password = randomBytes(24).toString('hex');
const appPassword = randomBytes(24).toString('hex');
const userPassword = randomBytes(24).toString('hex');
const secret = randomBytes(32).toString('base64url');
let client;
let pool;
let started = false;
let report;

async function freePort() {
  const server = createServer();
  await new Promise((done, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', done);
  });
  const port = server.address().port;
  await new Promise((done, reject) => server.close((error) => (error ? reject(error) : done())));
  return port;
}
function command(program, args, env) {
  const result = spawnSync(program, args, { cwd: directory, env, encoding: 'utf8' });
  if (result.status !== 0)
    throw new Error(`${program} fallo (${result.status}): ${result.stderr || result.stdout}`);
  return result.stdout;
}
async function waitForHealth(origin) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const result = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(1000) });
      if (result.ok) return result;
    } catch (error) {
      if (!(error instanceof Error)) throw error;
    }
    await delay(500);
  }
  throw new Error('La API aislada no estuvo disponible por Nginx.');
}
try {
  const dbPort = await freePort();
  const webPort = await freePort();
  const origin = `http://localhost:${webPort}`;
  const env = {
    ...process.env,
    COMPOSE_PROJECT_NAME: project,
    COMPOSE_FILE: join(directory, 'compose.json'),
  };
  const apiId = command('docker', ['image', 'inspect', '-f', '{{.Id}}', apiImage], env).trim();
  const webId = command('docker', ['image', 'inspect', '-f', '{{.Id}}', webImage], env).trim();
  const migrateId = command(
    'docker',
    ['image', 'inspect', '-f', '{{.Id}}', migrateImage],
    env,
  ).trim();
  await writeFile(
    join(directory, 'compose.json'),
    JSON.stringify({
      services: {
        db: {
          image: 'postgres:18.6-alpine',
          environment: {
            POSTGRES_USER: 'siga',
            POSTGRES_PASSWORD: password,
            POSTGRES_DB: 'siga_test',
          },
          ports: [`127.0.0.1:${dbPort}:5432`],
          tmpfs: ['/var/lib/postgresql'],
        },
        api: {
          image: apiId,
          environment: {
            NODE_ENV: 'production',
            API_HOST: '0.0.0.0',
            PORT: '3000',
            WEB_ORIGIN: origin,
            DATABASE_URL: `postgresql://siga_app:${appPassword}@db:5432/siga_test`,
            JWT_SECRET: secret,
            CERTIFICATES_DIR: '/data/certificados',
            COOKIE_SECURE: 'false',
          },
        },
        web: { image: webId, ports: [`127.0.0.1:${webPort}:80`] },
      },
    }),
    { mode: 0o600 },
  );
  started = true;
  command('docker', ['compose', 'up', '-d', 'db'], env);
  for (let attempt = 0; attempt < 60; attempt++) {
    const ready = spawnSync(
      'docker',
      ['compose', 'exec', '-T', 'db', 'pg_isready', '-U', 'siga', '-d', 'siga_test'],
      { cwd: directory, env },
    );
    if (ready.status === 0) break;
    if (attempt === 59) throw new Error('PostgreSQL aislado no estuvo disponible.');
    await delay(500);
  }
  command(
    'docker',
    ['run', '--rm', '--network', `${project}_default`, '-e', 'DATABASE_URL', migrateId],
    { ...env, DATABASE_URL: `postgresql://siga:${password}@db:5432/siga_test` },
  );
  const databaseUrl = `postgresql://siga:${password}@127.0.0.1:${dbPort}/siga_test`;
  pool = new Pool({ connectionString: databaseUrl });
  await pool.query(
    `CREATE ROLE siga_app LOGIN PASSWORD '${appPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`,
  );
  await pool.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
  await pool.query('GRANT CONNECT ON DATABASE siga_test TO siga_app');
  await pool.query('GRANT USAGE ON SCHEMA public TO siga_app');
  await pool.query(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO siga_app',
  );
  await pool.query('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO siga_app');
  await pool.query('REVOKE UPDATE, DELETE ON TABLE public."Auditoria" FROM siga_app');
  client = createDatabaseClient(databaseUrl);
  const namespace = `proxy-${randomUUID()}`;
  await client.$transaction((tx) => seedData(tx, namespace), { timeout: 30000 });
  const admin = await client.usuario.update({
    where: { id: seedId(namespace, 'admin') },
    data: { activo: true, passwordHash: await bcrypt.hash(userPassword, 10) },
  });
  await client.$disconnect();
  client = undefined;
  await pool.end();
  pool = undefined;
  command('docker', ['compose', 'up', '-d', 'api', 'web'], env);
  const health = await waitForHealth(origin);
  const index = await fetch(`${origin}/`);
  assert.equal(index.status, 200);
  assert.equal(index.headers.get('x-content-type-options'), 'nosniff');
  const missingAsset = await fetch(`${origin}/assets/archivo-inexistente.js`);
  assert.equal(missingAsset.status, 404);
  assert.equal(missingAsset.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await health.json()).status, 'ok');
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  const missing = await fetch(`${origin}/api/esta-ruta-no-existe`);
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get('x-content-type-options'), 'nosniff');
  const login = await fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Origin: origin },
    body: JSON.stringify({ correo: admin.correo, password: userPassword }),
  });
  assert.equal(login.status, 200);
  assert.equal(login.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(login.headers.get('cache-control'), 'no-store');
  const cookie = login.headers.getSetCookie().find((value) => value.startsWith('siga_session='));
  assert.ok(cookie);
  assert.match(cookie, /(?:^|;\s*)HttpOnly(?:;|$)/i);
  assert.match(cookie, /(?:^|;\s*)SameSite=Strict(?:;|$)/i);
  assert.match(cookie, /(?:^|;\s*)Path=\/(?:;|$)/i);
  assert.doesNotMatch(cookie, /(?:^|;\s*)Secure(?:;|$)/i);
  const session = await login.json();
  const headers = { Cookie: cookie.split(';')[0], Origin: origin };
  assert.equal((await fetch(`${origin}/api/auth/me`, { headers })).status, 200);
  assert.equal(
    (
      await fetch(`${origin}/api/auth/logout`, {
        method: 'POST',
        headers: { ...headers, 'X-CSRF-Token': session.csrfToken },
      })
    ).status,
    204,
  );
  assert.equal((await fetch(`${origin}/api/auth/me`, { headers })).status, 401);
  report = {
    resultado: 'PASO',
    apiId,
    webId,
    migrateId,
    health: 200,
    rutaInexistente: 404,
    login: 200,
    sesion: 200,
    logout: 204,
    sesionRevocada: 401,
    nosniff: true,
    cookie: 'HttpOnly; SameSite=Strict; Path=/; sin Secure en HTTP local',
  };
} finally {
  await client?.$disconnect();
  await pool?.end();
  let cleanupSucceeded = true;
  if (started) {
    const result = spawnSync('docker', ['compose', 'down', '--volumes', '--remove-orphans'], {
      cwd: directory,
      env: {
        ...process.env,
        COMPOSE_PROJECT_NAME: project,
        COMPOSE_FILE: join(directory, 'compose.json'),
      },
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      cleanupSucceeded = false;
      process.exitCode = 1;
      console.error(
        `No se pudieron retirar recursos ${project}; configuracion en ${directory}: ${result.stderr}`,
      );
    }
  }
  if (cleanupSucceeded) await rm(directory, { recursive: true, force: true });
}
if (report && process.exitCode !== 1) console.log(JSON.stringify(report));
