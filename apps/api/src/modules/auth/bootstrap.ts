import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { createDatabaseClient } from '../../database/client.js';
import { parseEnvironment } from '../../config/environment.js';

config({ path: new URL('../../../../../.env', import.meta.url), quiet: true });

async function bootstrap() {
  const environment = parseEnvironment(process.env);
  const dbUrl = new URL(environment.DATABASE_URL);
  if (
    environment.NODE_ENV === 'production' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(dbUrl.hostname) ||
    decodeURIComponent(dbUrl.pathname) !== '/siga_dev'
  ) {
    throw new Error('La creación inicial de administrador solo funciona en siga_dev local.');
  }

  const directory = fileURLToPath(new URL('../../../../../.local/', import.meta.url));
  const instanceSuffix = dbUrl.port === '55432' ? '' : `-${dbUrl.port || '5432'}`;
  const target = fileURLToPath(
    new URL(`../../../../../.local/admin-acceso${instanceSuffix}.txt`, import.meta.url),
  );
  mkdirSync(directory, { recursive: true });
  if (existsSync(target))
    throw new Error('Ya existe el archivo local de acceso; no se sobrescribió.');

  const client = createDatabaseClient(environment.DATABASE_URL);
  let written = false;
  try {
    const db = await client.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
    if (db[0]?.name !== 'siga_dev') throw new Error('La base conectada no es siga_dev.');

    const activeAdmin = await client.usuario.findFirst({
      where: { rol: 'ADMINISTRADOR', activo: true },
      select: { id: true },
    });
    if (activeAdmin) throw new Error('Ya existe un administrador activo; no se creó otra cuenta.');

    let correo = (process.argv[2] ?? process.env.SIGA_BOOTSTRAP_EMAIL ?? '').trim().toLowerCase();
    if (!correo) {
      const prompt = createInterface({ input: stdin, output: stdout });
      try {
        correo = (await prompt.question('Correo del administrador: ')).trim().toLowerCase();
      } finally {
        prompt.close();
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 254) {
      throw new Error('Escribe un correo válido para la cuenta administradora.');
    }
    if (await client.usuario.findUnique({ where: { correo }, select: { id: true } })) {
      throw new Error('Ese correo ya está registrado; no se modificó ninguna cuenta.');
    }

    const providedPassword = process.env.SIGA_BOOTSTRAP_PASSWORD;
    if (providedPassword !== undefined) {
      const passwordBytes = Buffer.byteLength(providedPassword, 'utf8');
      if (passwordBytes < 12 || passwordBytes > 72 || /[\r\n]/.test(providedPassword)) {
        throw new Error(
          'La contraseña definida debe tener entre 12 y 72 bytes y no contener saltos de línea.',
        );
      }
    }
    const password = providedPassword ?? randomBytes(24).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 12);
    writeFileSync(
      target,
      `SIGA · administrador local · ${new Date().toISOString()}\nNo compartir ni subir a Git.\n\nADMINISTRADOR\t${correo}\t${password}\n`,
      { flag: 'wx', mode: 0o600 },
    );
    written = true;

    const user = await client.$transaction(async (tx) => {
      const created = await tx.usuario.create({
        data: { correo, passwordHash, rol: 'ADMINISTRADOR', activo: true },
        select: { id: true, correo: true },
      });
      await tx.auditoria.create({
        data: {
          actorId: created.id,
          accion: 'BOOTSTRAP_ADMIN',
          recurso: 'Usuario',
          recursoId: created.id,
          motivo: 'Creación inicial del administrador local.',
        },
      });
      return created;
    });
    written = false;
    console.log(`Administrador local ${user.correo} creado. Acceso guardado en ${target}.`);
  } catch (error) {
    if (written) unlinkSync(target);
    throw error;
  } finally {
    await client.$disconnect();
  }
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'No se pudo crear el administrador.';
  console.error(message);
  process.exitCode = 1;
});
