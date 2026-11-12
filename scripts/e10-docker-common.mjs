import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { pipeline } from 'node:stream/promises';
import { config } from 'dotenv';
import { Pool } from 'pg';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const localRoot = resolve(root, '.local');
export const backupRoot = resolve(localRoot, 'backups');
config({ path: join(root, '.env'), quiet: true });

export function composeWebOrigin() {
  const port = Number(process.env.WEB_PORT || '8080');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('WEB_PORT debe ser un puerto TCP válido.');
  }
  return `http://localhost:${port}`;
}

export async function persistComposeVersion(version) {
  if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/.test(version)) {
    throw new Error('SIGA_VERSION solo puede contener letras, números, punto, guion o guion bajo.');
  }
  const envPath = join(root, '.env');
  const contents = await readFile(envPath, 'utf8');
  const newline = contents.includes('\r\n') ? '\r\n' : '\n';
  const lines = contents.split(/\r?\n/);
  const index = lines.findIndex((line) => /^SIGA_VERSION=/.test(line));
  if (index < 0) lines.push(`SIGA_VERSION=${version}`);
  else lines[index] = `SIGA_VERSION=${version}`;
  const updated = lines.join(newline);
  await writeFile(envPath, updated.endsWith(newline) ? updated : `${updated}${newline}`, {
    mode: 0o600,
  });
}

export function dockerDatabaseUrl(database = 'siga_dev') {
  const raw = process.env.DATABASE_URL;
  if (!raw || !URL.canParse(raw)) throw new Error('Falta DATABASE_URL válida en .env.');
  const url = new URL(raw);
  if (
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    !['5432', '55432'].includes(url.port || '5432') ||
    decodeURIComponent(url.pathname) !== '/siga_dev'
  ) {
    throw new Error('Las operaciones E10 solo aceptan siga_dev local de Docker.');
  }
  const composePort = Number(process.env.POSTGRES_PORT || '5432');
  if (!Number.isInteger(composePort) || composePort < 1 || composePort > 65535) {
    throw new Error('POSTGRES_PORT debe ser un puerto TCP válido.');
  }
  url.port = String(composePort);
  url.pathname = `/${database}`;
  url.searchParams.delete('schema');
  return url.toString();
}

export function createPool(database = 'siga_dev') {
  const pool = new Pool({
    connectionString: dockerDatabaseUrl(database),
    connectionTimeoutMillis: 3000,
  });
  pool.on('error', () => {});
  return pool;
}

export function dockerApplicationDatabaseUrl(database = 'siga_dev') {
  const appUser = process.env.POSTGRES_APP_USER || 'siga_app';
  const appPassword = process.env.POSTGRES_APP_PASSWORD;
  if (!appPassword)
    throw new Error('Falta POSTGRES_APP_PASSWORD para probar el rol de aplicación.');
  const url = new URL(dockerDatabaseUrl(database));
  url.username = appUser;
  url.password = appPassword;
  return url.toString();
}

export function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

export async function tableCounts(pool) {
  const { rows } = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  const counts = {};
  for (const { tablename } of rows) {
    const table = quoteIdentifier(tablename);
    const result = await pool.query(`SELECT count(*)::text AS total FROM public.${table}`);
    counts[tablename] = result.rows[0].total;
  }
  return counts;
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export async function fileSha256(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

export async function fileManifest(directory) {
  const files = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error('El respaldo no admite enlaces simbólicos.');
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile()) {
        const bytes = await readFile(absolute);
        files.push({
          path: relative(directory, absolute).split('\\').join('/'),
          bytes: bytes.length,
          sha256: sha256(bytes),
        });
      } else {
        throw new Error(`Tipo de archivo no admitido en el respaldo: ${entry.name}`);
      }
    }
  }
  await walk(directory);
  files.sort((left, right) => left.path.localeCompare(right.path));
  return files;
}

export async function run(command, args, { cwd = root, env = process.env, capture = false } = {}) {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (!capture) {
    const [code] = await once(child, 'close');
    if (code !== 0) throw new Error(`${command} terminó con código ${code}.`);
    return '';
  }
  const out = [];
  const errors = [];
  child.stdout.on('data', (chunk) => out.push(chunk));
  child.stderr.on('data', (chunk) => errors.push(chunk));
  const [code] = await once(child, 'close');
  if (code !== 0) {
    throw new Error(
      `${command} terminó con código ${code}: ${Buffer.concat(errors).toString('utf8').slice(0, 2000)}`,
    );
  }
  return Buffer.concat(out).toString('utf8').trim();
}

export async function streamCommandToFile(command, args, file) {
  const child = spawn(command, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  const closePromise = once(child, 'close');
  const errors = [];
  child.stderr.on('data', (chunk) => errors.push(chunk));
  try {
    await pipeline(child.stdout, createWriteStream(file, { flags: 'wx' }));
    const [code] = await closePromise;
    if (code !== 0) {
      throw new Error(
        `${command} terminó con código ${code}: ${Buffer.concat(errors).toString('utf8').slice(0, 2000)}`,
      );
    }
  } catch (error) {
    child.kill();
    throw error;
  }
}

export async function streamFileToCommand(file, command, args) {
  const child = spawn(command, args, { cwd: root, stdio: ['pipe', 'ignore', 'pipe'] });
  const closePromise = once(child, 'close');
  const errors = [];
  child.stderr.on('data', (chunk) => errors.push(chunk));
  try {
    await pipeline(createReadStream(file), child.stdin);
    const [code] = await closePromise;
    if (code !== 0) {
      throw new Error(
        `${command} terminó con código ${code}: ${Buffer.concat(errors).toString('utf8').slice(0, 2000)}`,
      );
    }
  } catch (error) {
    child.kill();
    throw error;
  }
}

export async function waitForHealthyApi(baseUrl, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'API aún no disponible';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1500) });
      const body = await response.json();
      if (
        response.ok &&
        body?.status === 'ok' &&
        (body?.checks?.database === 'up' || body?.database === 'up')
      ) {
        return body;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Error de conexión';
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 400));
  }
  throw new Error(`La API no pasó el healthcheck: ${lastError}`);
}
