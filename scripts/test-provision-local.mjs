import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, cp, symlink, readFile, readdir, stat, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const tmp = await mkdtemp(join(tmpdir(), 'siga-provision-test-'));
const name = `siga-provision-test-${randomUUID()}`;
const password = randomBytes(24).toString('base64url');
const run = (cmd, args, options = {}) => spawnSync(cmd, args, { encoding: 'utf8', ...options });
let client;
try {
  const build = run('npm', ['run', 'build', '-w', '@siga/api'], { cwd: root });
  assert.equal(build.status, 0, 'No se pudo compilar la API para la prueba');
  const started = run('docker', [
    'run',
    '-d',
    '--name',
    name,
    '-e',
    'POSTGRES_USER=siga_test',
    '-e',
    `POSTGRES_PASSWORD=${password}`,
    '-e',
    'POSTGRES_DB=siga_dev',
    '--tmpfs',
    '/var/lib/postgresql',
    '-p',
    '127.0.0.1::5432',
    'postgres:18.6-alpine',
  ]);
  assert.equal(started.status, 0, 'No inició PostgreSQL aislado');
  let ready = false;
  for (let i = 0; i < 60; i++) {
    const result = run('docker', ['exec', name, 'pg_isready', '-U', 'siga_test', '-d', 'siga_dev']);
    if (result.status === 0) {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(ready, 'PostgreSQL aislado no estuvo disponible');
  const portOutput = run('docker', ['port', name, '5432/tcp']).stdout.trim();
  const port = Number(portOutput.split(':').at(-1));
  assert.ok(port > 0);
  const url = `postgresql://siga_test:${password}@127.0.0.1:${port}/siga_dev`;
  const env = {
    ...process.env,
    DATABASE_URL: url,
    NODE_ENV: 'test',
    JWT_SECRET: 'testsecret_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
    WEB_ORIGIN: 'http://localhost:5173',
  };
  const migration = run(
    process.execPath,
    [
      join(root, 'node_modules/prisma/build/index.js'),
      'migrate',
      'deploy',
      '--config',
      'apps/api/prisma.config.ts',
    ],
    { cwd: root, env },
  );
  assert.equal(migration.status, 0, 'Migración de base temporal falló');
  await mkdir(join(tmp, 'apps/api'), { recursive: true });
  await cp(join(root, 'apps/api/dist'), join(tmp, 'apps/api/dist'), { recursive: true });
  await cp(join(root, 'apps/api/package.json'), join(tmp, 'apps/api/package.json'));
  await symlink(join(root, 'node_modules'), join(tmp, 'node_modules'), 'dir');
  const { createDatabaseClient } = await import(
    pathToFileURL(join(root, 'apps/api/dist/database/client.js'))
  );
  const { seedData, seedId } = await import(
    pathToFileURL(join(root, 'apps/api/dist/database/seed-data.js'))
  );
  const bcrypt = (await import(pathToFileURL(join(root, 'node_modules/bcryptjs/index.js'))))
    .default;
  client = createDatabaseClient(url);
  const ns = `provision-${randomUUID()}`;
  await client.$transaction((tx) => seedData(tx, ns), { timeout: 30000 });
  const id = (x) => seedId(ns, x);
  const student = await client.usuario.findUniqueOrThrow({ where: { id: id('estudiante1') } });
  const teacher = await client.usuario.findUniqueOrThrow({ where: { id: id('docente1') } });
  const admin = await client.usuario.findUniqueOrThrow({ where: { id: id('admin') } });
  const historyCount = await client.inscripcion.count();
  const cli = join(tmp, 'apps/api/dist/modules/personas/provisionar-acceso-local.js');
  const provision = (email, extraEnv = {}) =>
    run(process.execPath, [cli, email], { cwd: tmp, env: { ...env, ...extraEnv } });
  const directory = join(tmp, '.local');
  const files = () => readdir(directory);
  const credential = async (before) => {
    const after = await files();
    const created = after.filter((f) => !before.includes(f));
    assert.equal(created.length, 1);
    const path = join(directory, created[0]);
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    return (await readFile(path, 'utf8')).match(/Contraseña: (.+)/)?.[1];
  };
  let result = provision(student.correo.toUpperCase());
  assert.equal(result.status, 0, 'provisión estudiante');
  assert.equal((await stat(directory)).mode & 0o777, 0o700);
  let current = await client.usuario.findUniqueOrThrow({ where: { id: student.id } });
  const firstSecret = await credential([]);
  assert.equal(current.activo, true);
  assert.equal(await bcrypt.compare(firstSecret, current.passwordHash), true);
  await client.sesion.createMany({
    data: [0, 1].map(() => ({ usuarioId: student.id, expiraEn: new Date(Date.now() + 3600000) })),
  });
  let before = await files();
  result = provision(student.correo);
  assert.equal(result.status, 0, 'restablecimiento estudiante');
  const secondSecret = await credential(before);
  current = await client.usuario.findUniqueOrThrow({ where: { id: student.id } });
  assert.equal(await bcrypt.compare(secondSecret, current.passwordHash), true);
  assert.equal(await bcrypt.compare(firstSecret, current.passwordHash), false);
  assert.equal(
    await client.sesion.count({ where: { usuarioId: student.id, revocadaEn: null } }),
    0,
  );
  const audit = await client.auditoria.findMany({
    where: { recursoId: student.id, accion: 'PROVISIONAR_ACCESO_LOCAL' },
    orderBy: { creadoEn: 'asc' },
  });
  assert.equal(audit.length, 2);
  assert.deepEqual(
    audit.map((a) => a.posterior.sesionesRevocadas),
    [0, 2],
  );
  before = await files();
  assert.equal(provision(teacher.correo).status, 0, 'provisión docente');
  const teacherSecret = await credential(before);
  const currentTeacher = await client.usuario.findUniqueOrThrow({ where: { id: teacher.id } });
  assert.equal(currentTeacher.activo, true);
  assert.equal(await bcrypt.compare(teacherSecret, currentTeacher.passwordHash), true);
  const auditCount = await client.auditoria.count();
  for (const email of [admin.correo, 'inexistente@example.invalid', 'correo-malformado'])
    assert.notEqual(provision(email).status, 0);
  await client.docente.update({ where: { usuarioId: teacher.id }, data: { activo: false } });
  assert.notEqual(provision(teacher.correo).status, 0);
  await client.estudiante.update({
    where: { usuarioId: student.id },
    data: { estado: 'INACTIVO' },
  });
  assert.notEqual(provision(student.correo).status, 0);
  assert.equal(await client.auditoria.count(), auditCount);
  assert.equal(await client.inscripcion.count(), historyCount);
  const countBeforeBadMode = (await files()).length;
  await chmod(directory, 0o755);
  assert.notEqual(provision(student.correo).status, 0);
  assert.equal((await files()).length, countBeforeBadMode);
  await chmod(directory, 0o700);
  assert.notEqual(provision(student.correo, { NODE_ENV: 'production' }).status, 0);
  console.log(
    'PASÓ: CLI real; estudiante y docente, contraseñas privadas y restablecimiento, 2 sesiones revocadas, auditoría, historial preservado, rechazos y modo de directorio/producción.',
  );
} finally {
  if (client) await client.$disconnect();
  run('docker', ['rm', '-f', '-v', name]);
  await rm(tmp, { recursive: true, force: true });
}
