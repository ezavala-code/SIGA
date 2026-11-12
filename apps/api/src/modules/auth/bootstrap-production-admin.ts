import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { createDatabaseClient } from '../../database/client.js';
import { parseEnvironment } from '../../config/environment.js';

config({ path: new URL('../../../../../.env', import.meta.url), quiet: true });

async function bootstrapProductionAdmin() {
  const environment = parseEnvironment(process.env);
  const dbUrl = new URL(environment.DATABASE_URL);
  const databaseName = decodeURIComponent(dbUrl.pathname.slice(1));
  if (
    environment.NODE_ENV !== 'production' ||
    process.env.SIGA_CONFIRM_PRODUCTION !== 'I_UNDERSTAND' ||
    process.env.SIGA_CONFIRM_DATABASE !== databaseName ||
    ['127.0.0.1', 'localhost', '[::1]'].includes(dbUrl.hostname) ||
    databaseName === 'siga_dev' ||
    databaseName.endsWith('_test') ||
    !environment.COOKIE_SECURE ||
    !environment.WEB_ORIGIN.startsWith('https://')
  ) {
    throw new Error(
      'Bootstrap rechazado. Requiere producción, dominio HTTPS, base remota confirmada y aprobación explícita.',
    );
  }

  const correo = (process.env.SIGA_BOOTSTRAP_EMAIL ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 254) {
    throw new Error('SIGA_BOOTSTRAP_EMAIL debe contener el correo válido del administrador.');
  }

  const root = new URL('../../../../../.local/', import.meta.url);
  const directory = fileURLToPath(root);
  const target = fileURLToPath(new URL('admin-produccion-acceso.txt', root));
  mkdirSync(directory, { recursive: true });
  if (existsSync(target)) throw new Error('Ya existe el archivo local del administrador.');

  const client = createDatabaseClient(environment.DATABASE_URL);
  let credentialsWritten = false;
  try {
    const db = await client.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
    if (db[0]?.name !== databaseName)
      throw new Error('El servidor respondió con otra base de datos.');
    if (await client.usuario.findFirst({ where: { rol: 'ADMINISTRADOR', activo: true } })) {
      throw new Error('Ya existe un administrador activo; no se modificó la base.');
    }
    if (await client.usuario.findUnique({ where: { correo } })) {
      throw new Error('Ese correo ya existe con otro estado o perfil; no se modificó la base.');
    }

    const password = randomBytes(32).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 12);
    writeFileSync(
      target,
      `SIGA · administrador inicial de producción · ${new Date().toISOString()}\nRetirar de este servidor después de entregar el acceso al responsable.\n\nADMINISTRADOR\t${correo}\t${password}\n`,
      { flag: 'wx', mode: 0o600 },
    );
    credentialsWritten = true;
    await client.$transaction(async (tx) => {
      const created = await tx.usuario.create({
        data: { correo, passwordHash, rol: 'ADMINISTRADOR', activo: true },
        select: { id: true },
      });
      await tx.auditoria.create({
        data: {
          actorId: created.id,
          accion: 'BOOTSTRAP_ADMIN_PRODUCCION',
          recurso: 'Usuario',
          recursoId: created.id,
          motivo: 'Creación inicial del administrador en el despliegue confirmado.',
        },
      });
    });
    credentialsWritten = false;
    console.log(`Administrador ${correo} creado en ${databaseName}; acceso guardado en ${target}.`);
  } catch (error) {
    if (credentialsWritten) unlinkSync(target);
    throw error;
  } finally {
    await client.$disconnect();
  }
}

bootstrapProductionAdmin().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'No se pudo crear el administrador inicial.',
  );
  process.exitCode = 1;
});
