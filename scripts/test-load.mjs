import { randomBytes, randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { requireTestDatabaseUrl } from '../apps/api/src/config/environment.ts';
import { createDatabaseClient } from '../apps/api/dist/database/client.js';
import { seedData, seedId } from '../apps/api/dist/database/seed-data.js';

const root = fileURLToPath(new URL('../', import.meta.url));
config({ path: new URL('../.env', import.meta.url), quiet: true });
const baseUrl = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);
const url = new URL(baseUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
  throw new Error('La prueba de carga requiere una base de pruebas local.');
}
const schema = `siga_load_${randomUUID().replaceAll('-', '')}`;
url.searchParams.set('schema', schema);
const pool = new Pool({ connectionString: baseUrl, connectionTimeoutMillis: 2000 });
const client = createDatabaseClient(url.toString());
const namespace = schema;
const password = randomBytes(24).toString('base64url');
const webOrigin = 'http://127.0.0.1:5173';
const users = 20;
const smoke = process.argv.includes('--smoke');
const allOperations = ['reporte', 'oferta', 'matricula', 'pdf', 'pdf_unicode'];
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length);
const unicodeOnly = process.argv.includes('--unicode');
const operations = onlyArg
  ? onlyArg
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  : unicodeOnly
    ? ['pdf_unicode']
    : allOperations;
if (!operations.length || operations.some((item) => !allOperations.includes(item))) {
  throw new Error(`Operaciones de carga no válidas: ${operations.join(', ')}`);
}
const warmupRounds = smoke ? 1 : 5;
const measuredRounds = smoke ? 2 : 39;
const intervalMs = smoke ? 1000 : 300000 / measuredRounds;
const warmupIntervalMs = smoke ? 1000 : 12000;
let created = false;
let server;
let certificatesDir;
let interrupted = false;
const interrupt = () => {
  interrupted = true;
  server?.kill('SIGTERM');
};
process.on('SIGINT', interrupt);
process.on('SIGTERM', interrupt);

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(fraction * sorted.length) - 1];
}

async function availablePort() {
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise((resolveClose, reject) =>
    socket.close((error) => (error ? reject(error) : resolveClose())),
  );
  return port;
}

async function waitForApi(origin) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline && !interrupted) {
    if (server.exitCode !== null || server.signalCode !== null)
      throw new Error('La API de carga terminó al iniciar.');
    try {
      if ((await fetch(`${origin}/health/live`, { signal: AbortSignal.timeout(1500) })).ok) return;
    } catch (error) {
      if (error.name !== 'TypeError' && error.name !== 'TimeoutError') throw error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error('La API de carga no quedó lista.');
}

async function login(origin, correo) {
  const response = await fetch(`${origin}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Origin: webOrigin },
    body: JSON.stringify({ correo, password }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Login de carga rechazado (${response.status}).`);
  const body = await response.json();
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .find((value) => value.startsWith('siga_session='));
  if (!cookie || typeof body.csrfToken !== 'string') throw new Error('Sesión de carga incompleta.');
  return { cookie, csrf: body.csrfToken };
}

async function request(origin, session, operation, groupId) {
  const headers = { Cookie: session.cookie, Origin: webOrigin, 'X-CSRF-Token': session.csrf };
  const paths = {
    reporte: '/reportes/grupos?page=1&pageSize=100',
    oferta: '/matriculas/oferta?page=1&pageSize=50',
    matricula: '/matriculas',
    pdf: '/certificados',
    pdf_unicode: '/certificados',
  };
  const write = operation === 'matricula' || operation === 'pdf' || operation === 'pdf_unicode';
  if (write) headers['content-type'] = 'application/json';
  const response = await fetch(`${origin}${paths[operation]}`, {
    method: write ? 'POST' : 'GET',
    headers,
    ...(operation === 'matricula' ? { body: JSON.stringify({ grupoId: groupId }) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  const body = await response.json();
  let valid;
  if (operation === 'reporte')
    valid = response.status === 200 && body.total === 50 && body.items?.length === 50;
  else if (operation === 'oferta') valid = response.status === 200 && Array.isArray(body.items);
  else if (operation === 'matricula')
    valid = response.status === 201 && typeof body.id === 'string';
  else valid = response.status === 201 && body.estado === 'EMITIDO' && typeof body.id === 'string';
  return { valid, status: response.status, message: valid ? undefined : body.message };
}

async function phase(origin, sessions, operation, groups, warming) {
  const rounds = warming ? warmupRounds : measuredRounds;
  const interval = warming ? warmupIntervalMs : intervalMs;
  const latencies = [];
  let errors = 0;
  const failures = {};
  const start = performance.now();
  for (let round = 0; round < rounds; round++) {
    if (interrupted) throw new Error('Prueba de carga interrumpida.');
    const target = start + round * interval;
    await new Promise((resolveWait) =>
      setTimeout(resolveWait, Math.max(0, target - performance.now())),
    );
    await Promise.all(
      sessions.map(async (session) => {
        const began = performance.now();
        try {
          const response = await request(
            origin,
            session,
            operation,
            groups[(warming ? 0 : warmupRounds) + round],
          );
          if (!response.valid) {
            errors++;
            const key = `${response.status}: ${response.message ?? 'respuesta inesperada'}`;
            failures[key] = (failures[key] ?? 0) + 1;
          }
        } catch (error) {
          errors++;
          const key = error instanceof Error ? error.name : 'Error desconocido';
          failures[key] = (failures[key] ?? 0) + 1;
        } finally {
          latencies.push(performance.now() - began);
        }
      }),
    );
  }
  await new Promise((resolveWait) =>
    setTimeout(resolveWait, Math.max(0, start + rounds * interval - performance.now())),
  );
  return { latencies, errors, failures, elapsedSeconds: (performance.now() - start) / 1000 };
}

async function stopServer() {
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  server.kill('SIGTERM');
  await Promise.race([
    once(server, 'exit'),
    new Promise((resolveWait) => setTimeout(resolveWait, 5000)),
  ]);
  if (server.exitCode === null && server.signalCode === null) {
    server.kill('SIGKILL');
    await once(server, 'exit');
  }
}

try {
  await pool.query(`CREATE SCHEMA "${schema}"`);
  created = true;
  const migration = spawnSync(
    process.execPath,
    [
      resolve(root, 'node_modules/prisma/build/index.js'),
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
  if (migration.error || migration.status !== 0 || interrupted)
    throw new Error('Falló la migración de carga.');
  const hash = await bcrypt.hash(password, 4);
  const students = Array.from({ length: 996 }, (_, index) => ({
    id: randomUUID(),
    studentId: randomUUID(),
    correo: `load-student-${index}@example.invalid`,
  }));
  const admins = Array.from({ length: users }, (_, index) => ({
    id: randomUUID(),
    correo: `load-admin-${index}@example.invalid`,
  }));
  const groups = Array.from({ length: 45 }, () => ({
    id: randomUUID(),
    subjectId: randomUUID(),
  }));
  const loadPlanId = randomUUID();
  await client.$transaction(
    async (tx) => {
      await seedData(tx, namespace);
      const now = Date.now();
      const day = 86400000;
      await tx.periodo.update({
        where: { id: seedId(namespace, 'actual') },
        data: {
          inicio: new Date(now - 30 * day),
          fin: new Date(now + 90 * day),
          inscripcionInicio: new Date(now - 7 * day),
          inscripcionFin: new Date(now + 7 * day),
        },
      });
      await tx.planEstudio.create({
        data: {
          id: loadPlanId,
          programaId: seedId(namespace, 'software'),
          version: 2,
          nombre: 'Plan ficticio de carga',
        },
      });
      await tx.usuario.createMany({
        data: [
          ...students.map((student, index) => ({
            id: student.id,
            correo: student.correo,
            passwordHash: hash,
            rol: 'ESTUDIANTE',
            activo: index < users * 2,
          })),
          ...admins.map((admin) => ({
            id: admin.id,
            correo: admin.correo,
            passwordHash: hash,
            rol: 'ADMINISTRADOR',
            activo: true,
          })),
        ],
      });
      await tx.estudiante.createMany({
        data: students.map((student, index) => ({
          id: student.studentId,
          usuarioId: student.id,
          matricula: `LOAD-${index}`,
          nombre:
            index >= users && index < users * 2
              ? `Estudiante ficticio 李 Ж ${index - users}`
              : `Estudiante ficticio ${index}`,
          planId: loadPlanId,
          fechaIngreso: new Date('2026-01-01'),
        })),
      });
      await tx.asignatura.createMany({
        data: groups.map((group, index) => ({
          id: group.subjectId,
          clave: `LOAD-${index}`,
          nombre: `Asignatura ficticia ${index}`,
        })),
      });
      await tx.planAsignatura.createMany({
        data: groups.map((group) => ({
          planId: loadPlanId,
          asignaturaId: group.subjectId,
          creditos: '6',
          semestreSugerido: 1,
        })),
      });
      await tx.grupo.createMany({
        data: groups.map((group, index) => ({
          id: group.id,
          clave: `LOAD-${index}`,
          planId: loadPlanId,
          asignaturaId: group.subjectId,
          periodoId: seedId(namespace, index === 44 ? 'anterior' : 'actual'),
          politicaId: seedId(namespace, 'politica'),
          docenteId: seedId(namespace, 'persona-docente1'),
          cupo: index === 44 ? users * 2 : users,
        })),
      });
      await tx.inscripcion.createMany({
        data: students.slice(0, users * 2).map((student) => ({
          id: randomUUID(),
          estudianteId: student.studentId,
          grupoId: groups[44].id,
          planId: loadPlanId,
          asignaturaId: groups[44].subjectId,
          periodoId: seedId(namespace, 'anterior'),
          politicaId: seedId(namespace, 'politica'),
          notaFinal: '8.50',
          estado: 'CALIFICADA',
          creditosSnapshot: '6',
        })),
      });
    },
    { timeout: 60000 },
  );
  const counts = {
    estudiantes: await client.estudiante.count(),
    grupos: await client.grupo.count(),
  };
  if (counts.estudiantes !== 1000 || counts.grupos !== 50)
    throw new Error('Conjunto de carga incompleto.');
  certificatesDir = await mkdtemp(join(tmpdir(), 'siga-load-certificados-'));
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [resolve(root, 'apps/api/dist/main.js')], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: url.toString(),
      PORT: String(port),
      API_HOST: '127.0.0.1',
      WEB_ORIGIN: webOrigin,
      COOKIE_SECURE: 'false',
      JWT_SECRET: randomBytes(48).toString('base64url'),
      CERTIFICATES_DIR: certificatesDir,
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  const logs = [];
  server.stderr.on('data', (chunk) => {
    logs.push(chunk.toString());
    if (logs.length > 50) logs.shift();
  });
  await waitForApi(origin);
  const studentSessions = operations.some((op) => ['oferta', 'matricula', 'pdf'].includes(op))
    ? await Promise.all(students.slice(0, users).map((student) => login(origin, student.correo)))
    : [];
  const unicodeStudentSessions = operations.includes('pdf_unicode')
    ? await Promise.all(
        students.slice(users, users * 2).map((student) => login(origin, student.correo)),
      )
    : [];
  const adminSessions = operations.includes('reporte')
    ? await Promise.all(admins.map((admin) => login(origin, admin.correo)))
    : [];
  const results = {};
  for (const operation of operations) {
    const sessions =
      operation === 'reporte'
        ? adminSessions
        : operation === 'pdf_unicode'
          ? unicodeStudentSessions
          : studentSessions;
    console.log(
      `${operation}: calentamiento de ${(warmupRounds * warmupIntervalMs) / 1000} segundos con ${users} usuarios.`,
    );
    const warmup = await phase(
      origin,
      sessions,
      operation,
      groups.map((group) => group.id),
      true,
    );
    if (warmup.errors)
      throw new Error(
        `${operation}: ${warmup.errors} errores durante el calentamiento: ${JSON.stringify(warmup.failures)}`,
      );
    console.log(`${operation}: medición de ${(measuredRounds * intervalMs) / 1000} segundos.`);
    const result = await phase(
      origin,
      sessions,
      operation,
      groups.map((group) => group.id),
      false,
    );
    const p95 = percentile(result.latencies, 0.95);
    const errorRate = (result.errors / result.latencies.length) * 100;
    results[operation] = {
      usuarios: users,
      patron: 'tandas de 20 usuarios con pausas',
      intervaloSegundos: intervalMs / 1000,
      modo: smoke ? 'comprobacion corta sin validez de aceptacion' : 'medicion',
      solicitudes: result.latencies.length,
      duracionSegundos: Number(result.elapsedSeconds.toFixed(2)),
      solicitudesPorSegundo: Number((result.latencies.length / result.elapsedSeconds).toFixed(2)),
      erroresInesperados: result.errors,
      detalleErrores: result.failures,
      erroresPorcentaje: Number(errorRate.toFixed(3)),
      p95Ms: Number(p95.toFixed(2)),
      maximoMs: Number(Math.max(...result.latencies).toFixed(2)),
      aprobado: smoke ? null : p95 < 2000 && errorRate < 1,
    };
    console.log(JSON.stringify({ dataset: counts, operacion: operation, ...results[operation] }));
  }
  if (
    Object.values(results).some(
      (result) => result.aprobado === false || (smoke && result.erroresInesperados > 0),
    )
  )
    process.exitCode = 1;
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Error desconocido en la prueba de carga.',
  );
  process.exitCode = 1;
} finally {
  await stopServer();
  await client.$disconnect();
  try {
    if (created) await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
  } finally {
    await pool.end();
    if (certificatesDir) await rm(certificatesDir, { recursive: true, force: true });
    process.off('SIGINT', interrupt);
    process.off('SIGTERM', interrupt);
  }
}
