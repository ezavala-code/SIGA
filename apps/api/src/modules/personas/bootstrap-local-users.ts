import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { createDatabaseClient } from '../../database/client.js';
import { parseEnvironment } from '../../config/environment.js';

config({ path: new URL('../../../../../.env', import.meta.url), quiet: true });

const newAccounts = [
  {
    correo: 'jon@gmail.com',
    password: randomBytes(24).toString('base64url'),
    rol: 'DOCENTE' as const,
  },
  {
    correo: 'prueba123@gmail.com',
    password: randomBytes(24).toString('base64url'),
    rol: 'ESTUDIANTE' as const,
  },
] as const;

async function bootstrapLocalUsers() {
  const environment = parseEnvironment(process.env);
  const dbUrl = new URL(environment.DATABASE_URL);
  if (
    environment.NODE_ENV === 'production' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(dbUrl.hostname) ||
    dbUrl.port !== '5432' ||
    decodeURIComponent(dbUrl.pathname) !== '/siga_dev'
  ) {
    throw new Error('Las cuentas solicitadas solo se crean en siga_dev de Docker local.');
  }

  const root = new URL('../../../../../.local/', import.meta.url);
  const directory = fileURLToPath(root);
  const target = fileURLToPath(new URL('credenciales-siga.txt', root));
  const adminFile = fileURLToPath(new URL('admin-acceso-5432.txt', root));
  const oldTestFile = fileURLToPath(new URL('perfiles-prueba-5432.txt', root));
  if (!existsSync(adminFile)) throw new Error('No se encontró el acceso local del administrador.');
  if (existsSync(target))
    throw new Error('Ya existe el archivo de credenciales; no se sobrescribió.');

  const adminLine = readFileSync(adminFile, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.split('\t'))
    .find((parts) => parts.length === 3 && parts[0] === 'ADMINISTRADOR');
  if (!adminLine || adminLine[1] !== 'abezav12@gmail.com' || !adminLine[2]) {
    throw new Error('El archivo local no contiene el administrador esperado.');
  }

  mkdirSync(directory, { recursive: true });
  const client = createDatabaseClient(environment.DATABASE_URL);
  let credentialsWritten = false;
  try {
    const db = await client.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
    if (db[0]?.name !== 'siga_dev') throw new Error('La base conectada no es siga_dev.');

    const admin = await client.usuario.findUnique({
      where: { correo: adminLine[1] },
      select: { id: true, activo: true, rol: true },
    });
    if (!admin || !admin.activo || admin.rol !== 'ADMINISTRADOR') {
      throw new Error('El administrador local debe estar activo para preparar las cuentas.');
    }
    const existing = await client.usuario.findMany({
      where: { correo: { in: newAccounts.map((account) => account.correo) } },
      select: { correo: true },
    });
    if (existing.length)
      throw new Error('Una o más cuentas solicitadas ya existen; no se modificaron.');

    const plan = await client.planEstudio.findFirst({
      where: { activo: true, programa: { is: { activo: true, clave: 'ICO-F19' } } },
      select: { id: true },
    });
    if (!plan) throw new Error('No se encontró el plan activo ICO-F19 para el perfil estudiantil.');

    const teacherHash = await bcrypt.hash(newAccounts[0].password, 12);
    const studentHash = await bcrypt.hash(newAccounts[1].password, 12);
    writeFileSync(
      target,
      [
        'SIGA · accesos locales de Docker',
        'Solo para http://localhost:8080. No compartir ni subir a Git.',
        `Generado: ${new Date().toISOString()}`,
        '',
        adminLine.join('\t'),
        ...newAccounts.map((account) => `${account.rol}\t${account.correo}\t${account.password}`),
        '',
      ].join('\n'),
      { flag: 'wx', mode: 0o600 },
    );
    credentialsWritten = true;

    await client.$transaction(async (tx) => {
      const obsolete = await tx.usuario.findMany({
        where: {
          correo: { in: ['estudiante.prueba@example.invalid', 'docente.prueba@example.invalid'] },
        },
        select: {
          id: true,
          correo: true,
          estudiante: { select: { id: true } },
          docente: { select: { id: true } },
        },
      });
      for (const account of obsolete) {
        await tx.sesion.updateMany({
          where: { usuarioId: account.id, revocadaEn: null },
          data: { revocadaEn: new Date() },
        });
        await tx.usuario.update({ where: { id: account.id }, data: { activo: false } });
        if (account.estudiante) {
          await tx.estudiante.update({
            where: { id: account.estudiante.id },
            data: { estado: 'INACTIVO' },
          });
        }
        if (account.docente) {
          await tx.docente.update({ where: { id: account.docente.id }, data: { activo: false } });
        }
        await tx.auditoria.create({
          data: {
            actorId: admin.id,
            accion: 'ARCHIVAR_CUENTA_LOCAL_PRUEBA',
            recurso: 'Usuario',
            recursoId: account.id,
            motivo: 'Se sustituyó la cuenta genérica de prueba por los perfiles solicitados.',
          },
        });
      }

      const teacherCode = `LOCAL-JON-${randomBytes(3).toString('hex').toUpperCase()}`;
      const studentCode = `LOCAL-ALUMNO-${randomBytes(3).toString('hex').toUpperCase()}`;
      const teacher = await tx.usuario.create({
        data: {
          correo: newAccounts[0].correo,
          passwordHash: teacherHash,
          rol: 'DOCENTE',
          activo: true,
          docente: {
            create: { numeroEmpleado: teacherCode, nombre: 'Jon', departamento: 'Docencia' },
          },
        },
        select: { id: true },
      });
      const student = await tx.usuario.create({
        data: {
          correo: newAccounts[1].correo,
          passwordHash: studentHash,
          rol: 'ESTUDIANTE',
          activo: true,
          estudiante: {
            create: {
              matricula: studentCode,
              nombre: 'Alumno de prueba',
              planId: plan.id,
              fechaIngreso: new Date(new Date().toISOString().slice(0, 10)),
            },
          },
        },
        select: { id: true },
      });
      await tx.auditoria.createMany({
        data: [
          {
            actorId: admin.id,
            accion: 'CREAR_CUENTA_LOCAL',
            recurso: 'Usuario',
            recursoId: teacher.id,
            motivo: 'Alta local solicitada para validación del perfil docente.',
          },
          {
            actorId: admin.id,
            accion: 'CREAR_CUENTA_LOCAL',
            recurso: 'Usuario',
            recursoId: student.id,
            motivo: 'Alta local solicitada para validación del perfil estudiante en ICO-F19.',
          },
        ],
      });
    });
    credentialsWritten = false;
    if (existsSync(oldTestFile)) unlinkSync(oldTestFile);
    console.log(`Se crearon los perfiles solicitados y se guardaron tres accesos en ${target}.`);
  } catch (error) {
    if (credentialsWritten) unlinkSync(target);
    throw error;
  } finally {
    await client.$disconnect();
  }
}

bootstrapLocalUsers().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'No se pudieron preparar las cuentas locales.',
  );
  process.exitCode = 1;
});
