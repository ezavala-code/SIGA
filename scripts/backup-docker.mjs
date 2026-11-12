import { randomUUID } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import {
  backupRoot,
  composeWebOrigin,
  createPool,
  fileSha256,
  fileManifest,
  root,
  run,
  streamCommandToFile,
  tableCounts,
  waitForHealthyApi,
} from './e10-docker-common.mjs';

const timestamp = new Date().toISOString().replaceAll(':', '').replaceAll('.', '-');
const backupName = `e10-${timestamp}-${randomUUID().slice(0, 8)}`;
const destination = resolve(backupRoot, backupName);
const certificatesDirectory = join(destination, 'certificados');
const dumpPath = join(destination, 'database.dump');
const manifestPath = join(destination, 'manifest.json');
const compose = ['compose'];
const pool = createPool();
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const webOrigin = composeWebOrigin();
const dbUser = process.env.POSTGRES_USER || 'siga';
const dbName = process.env.POSTGRES_DB || 'siga_dev';
let apiWasRunning = false;
let apiStopped = false;
let apiContainer = '';

async function copyCertificateVolume(containerId) {
  await mkdir(certificatesDirectory, { recursive: true });
  await run('docker', ['cp', `${containerId}:/data/certificados/.`, certificatesDirectory]);
}

try {
  await mkdir(backupRoot, { recursive: true });
  await mkdir(destination, { recursive: false });
  await run('docker', [...compose, 'exec', '-T', 'db', 'pg_isready', '-U', dbUser, '-d', dbName]);
  apiContainer = await run('docker', [...compose, 'ps', '-q', 'api'], { capture: true });
  if (!apiContainer) throw new Error('No se encontró el contenedor de API de Compose.');
  await waitForHealthyApi(`${webOrigin}/api`);
  const [runningState, imageId] = await Promise.all([
    run('docker', ['inspect', '-f', '{{.State.Running}}', apiContainer], { capture: true }),
    run('docker', ['inspect', '-f', '{{.Image}}', apiContainer], { capture: true }),
  ]);
  apiWasRunning = runningState === 'true';
  if (!apiWasRunning)
    throw new Error('La API debe estar activa y sana para crear un respaldo E10.');

  await run('docker', [...compose, 'stop', '-t', '30', 'api']);
  apiStopped = true;

  const database = await pool.query('SELECT current_database() AS name');
  if (database.rows[0]?.name !== dbName || dbName !== 'siga_dev') {
    throw new Error('La conexión no apunta a siga_dev de Docker; se cancela el respaldo.');
  }
  const rowCounts = await tableCounts(pool);
  const certificates = await pool.query(
    `SELECT id::text, codigo, estado::text, "archivoRuta", "archivoSha256" FROM public."Certificado"
     WHERE "archivoRuta" IS NOT NULL ORDER BY "solicitadoEn" DESC, id DESC`,
  );

  await streamCommandToFile(
    'docker',
    [
      ...compose,
      'exec',
      '-T',
      'db',
      'pg_dump',
      '--format=custom',
      '--no-owner',
      '--no-acl',
      '-U',
      dbUser,
      '-d',
      dbName,
    ],
    dumpPath,
  );
  await copyCertificateVolume(apiContainer);

  const files = await fileManifest(certificatesDirectory);
  for (const certificate of certificates.rows) {
    const filename = basename(certificate.archivoRuta);
    const file = files.find((item) => item.path === filename);
    if (!file || file.sha256 !== certificate.archivoSha256) {
      throw new Error(`La constancia ${certificate.id} no coincide con su archivo respaldado.`);
    }
  }
  const sampleCertificate = certificates.rows.find((certificate) => {
    const filename = basename(certificate.archivoRuta);
    const validName =
      filename === `${certificate.id}.pdf` ||
      new RegExp(`^${certificate.id}\\.[0-9a-f-]{36}\\.pdf$`, 'i').test(filename);
    return (
      validName && certificate.estado === 'EMITIDO' && files.some((file) => file.path === filename)
    );
  });
  const manifest = {
    formatVersion: 1,
    createdAt: new Date().toISOString(),
    applicationVersion: packageJson.version,
    releaseVersion: process.env.SIGA_VERSION || packageJson.version,
    source: { composeProject: 'siga', database: dbName, apiImageId: imageId },
    database: {
      file: 'database.dump',
      format: 'pg_dump custom',
      sha256: await fileSha256(dumpPath),
      bytes: (await stat(dumpPath)).size,
      rowCounts,
    },
    certificates: {
      directory: 'certificados',
      count: files.length,
      files,
      smokeCertificate: sampleCertificate
        ? {
            id: sampleCertificate.id,
            codigo: sampleCertificate.codigo,
            estado: sampleCertificate.estado,
            file: basename(sampleCertificate.archivoRuta),
            sha256: files.find((file) => file.path === basename(sampleCertificate.archivoRuta))
              .sha256,
          }
        : null,
    },
  };

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    flag: 'wx',
    mode: 0o600,
  });
} finally {
  try {
    await pool.end();
  } finally {
    if (apiStopped && apiWasRunning) {
      await run('docker', ['start', apiContainer]);
      await waitForHealthyApi(`${webOrigin}/api`);
    }
  }
}

console.log(
  JSON.stringify({
    respaldo: destination,
    manifiesto: manifestPath,
    base: 'siga_dev Docker',
    apiRestaurada: apiWasRunning,
  }),
);
