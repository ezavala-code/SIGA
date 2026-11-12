import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { config } from 'dotenv';
import { Pool } from 'pg';

config({ quiet: true });
const databaseUrl = process.env.DATABASE_URL;
const directory = process.env.CERTIFICATES_DIR;
if (!databaseUrl || !directory) {
  throw new Error('Se requieren DATABASE_URL y CERTIFICATES_DIR.');
}

const storage = resolve(directory);
const schema = new URL(databaseUrl).searchParams.get('schema');
if (schema && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) throw new Error('Esquema no válido.');
const pool = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 2000,
  ...(schema ? { options: `-c search_path=${schema}` } : {}),
});
try {
  const { rows } = await pool.query(
    'SELECT id, estado, "archivoRuta", "archivoSha256", "solicitadoEn" FROM "Certificado"',
  );
  const files = new Set(await readdir(storage));
  const referenced = new Set();
  const problems = [];
  for (const row of rows) {
    if (row.estado === 'PENDIENTE' || row.estado === 'FALLIDO') {
      problems.push({ id: row.id, estado: row.estado, solicitadoEn: row.solicitadoEn });
    }
    if (!row.archivoRuta) continue;
    const name = basename(row.archivoRuta);
    referenced.add(name);
    const validName = new RegExp(`^${row.id}(?:\\.[0-9a-f-]{36})?\\.pdf$`, 'i');
    if (!validName.test(name)) {
      problems.push({ id: row.id, problema: 'RUTA_INVALIDA' });
      continue;
    }
    if (!files.has(name)) {
      problems.push({ id: row.id, problema: 'ARCHIVO_AUSENTE' });
      continue;
    }
    const digest = createHash('sha256')
      .update(await readFile(resolve(storage, name)))
      .digest('hex');
    if (digest !== row.archivoSha256) problems.push({ id: row.id, problema: 'HASH_DIFERENTE' });
  }
  const candidates = [];
  const pattern = /^[0-9a-f-]{36}(?:\.[0-9a-f-]{36})?\.pdf$/i;
  for (const name of files) {
    if (!pattern.test(name) || referenced.has(name)) continue;
    const info = await stat(resolve(storage, name));
    if (info.isFile()) candidates.push({ archivo: name, modificadoEn: info.mtime.toISOString() });
  }
  console.log(
    JSON.stringify({ problemas: problems, candidatosSinReferencia: candidates }, null, 2),
  );
} finally {
  await pool.end();
}
