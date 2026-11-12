import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { createDatabaseClient } from '../../database/client.js';
import { parseEnvironment } from '../../config/environment.js';

config({ path: new URL('../../../../../.env', import.meta.url), quiet: true });

const testAccounts = [
  {
    correo: 'estudiante.prueba@example.invalid',
    password: randomBytes(24).toString('base64url'),
    rol: 'ESTUDIANTE' as const,
  },
  {
    correo: 'docente.prueba@example.invalid',
    password: randomBytes(24).toString('base64url'),
    rol: 'DOCENTE' as const,
  },
] as const;

async function bootstrapLocalProfiles() {
  const environment = parseEnvironment(process.env);
  const dbUrl = new URL(environment.DATABASE_URL);
  if (
    environment.NODE_ENV === 'production' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(dbUrl.hostname) ||
    decodeURIComponent(dbUrl.pathname) !== '/siga_dev'
  ) {
    throw new Error('Las cuentas de prueba solo se crean en siga_dev local.');
  }

  const suffix = dbUrl.port === '5432' ? '-5432' : '';
  const directory = fileURLToPath(new URL('../../../../../.local/', import.meta.url));
  const target = fileURLToPath(
    new URL(`../../../../../.local/perfiles-prueba${suffix}.txt`, import.meta.url),
  );
  mkdirSync(directory, { recursive: true });
  if (existsSync(target)) throw new Error(`Ya existe ${target}; no se sobrescribió.`);

  const client = createDatabaseClient(environment.DATABASE_URL);
  let credentialsWritten = false;
  try {
    const db = await client.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
    if (db[0]?.name !== 'siga_dev') throw new Error('La base conectada no es siga_dev.');

    const admin = await client.usuario.findFirst({
      where: { rol: 'ADMINISTRADOR', activo: true },
      select: { id: true },
    });
    if (!admin) throw new Error('Crea primero el administrador de esta base local.');

    const existing = await client.usuario.findMany({
      where: { correo: { in: testAccounts.map((account) => account.correo) } },
      select: { correo: true },
    });
    if (existing.length) {
      throw new Error(
        'Ya existen cuentas de prueba en esta base; no se cambió ninguna contraseña.',
      );
    }
    const plan = await client.planEstudio.findFirst({
      where: { activo: true },
      orderBy: [{ nombre: 'asc' }, { version: 'asc' }],
      select: { id: true },
    });
    if (!plan) throw new Error('Carga primero un plan activo para asociar la cuenta estudiantil.');

    const studentHash = await bcrypt.hash(testAccounts[0].password, 12);
    const teacherHash = await bcrypt.hash(testAccounts[1].password, 12);
    const timestamp = new Date().toISOString();
    writeFileSync(
      target,
      [
        'SIGA · perfiles locales de prueba',
        'Solo PostgreSQL local siga_dev. No compartir ni subir a Git.',
        `Generado: ${timestamp}`,
        '',
        ...testAccounts.map((account) => `${account.rol}\t${account.correo}\t${account.password}`),
        '',
      ].join('\n'),
      { flag: 'wx', mode: 0o600 },
    );
    credentialsWritten = true;

    await client.$transaction(async (tx) => {
      const student = await tx.usuario.create({
        data: {
          correo: testAccounts[0].correo,
          passwordHash: studentHash,
          rol: 'ESTUDIANTE',
          activo: true,
          estudiante: {
            create: {
              matricula: 'LOCAL-PRUEBA-EST',
              nombre: 'Cuenta local de prueba · estudiante',
              planId: plan.id,
              fechaIngreso: new Date(`${new Date().getFullYear()}-01-01T00:00:00.000Z`),
            },
          },
        },
        select: { id: true },
      });
      const teacher = await tx.usuario.create({
        data: {
          correo: testAccounts[1].correo,
          passwordHash: teacherHash,
          rol: 'DOCENTE',
          activo: true,
          docente: {
            create: {
              numeroEmpleado: 'LOCAL-PRUEBA-DOC',
              nombre: 'Cuenta local de prueba · docente',
              departamento: 'Pruebas locales',
            },
          },
        },
        select: { id: true },
      });
      const studentProfile = await tx.estudiante.findUniqueOrThrow({
        where: { usuarioId: student.id },
        select: { id: true },
      });
      const teacherProfile = await tx.docente.findUniqueOrThrow({
        where: { usuarioId: teacher.id },
        select: { id: true },
      });
      await tx.auditoria.createMany({
        data: [
          {
            actorId: admin.id,
            accion: 'CREAR_CUENTA_LOCAL_PRUEBA',
            recurso: 'Estudiante',
            recursoId: studentProfile.id,
            motivo: 'Cuenta generada para probar perfiles en navegadores locales aislados.',
          },
          {
            actorId: admin.id,
            accion: 'CREAR_CUENTA_LOCAL_PRUEBA',
            recurso: 'Docente',
            recursoId: teacherProfile.id,
            motivo: 'Cuenta generada para probar perfiles en navegadores locales aislados.',
          },
        ],
      });
    });
    credentialsWritten = false;
    console.log(`Se crearon dos cuentas locales de prueba. Accesos guardados en ${target}.`);
  } catch (error) {
    if (credentialsWritten) unlinkSync(target);
    throw error;
  } finally {
    await client.$disconnect();
  }
}

bootstrapLocalProfiles().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'No se pudieron crear las cuentas locales.',
  );
  process.exitCode = 1;
});
