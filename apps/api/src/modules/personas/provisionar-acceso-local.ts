import { randomBytes, randomUUID } from 'node:crypto';
import { lstat, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { Prisma } from '../../generated/prisma/client.js';
import { createDatabaseClient } from '../../database/client.js';
import { parseEnvironment } from '../../config/environment.js';

export class ProvisionError extends Error {}

export interface ProvisionarAccesoLocalOptions {
  correo: string;
  directory?: string;
  bcryptRounds?: number;
  onCredentialCreated?: (path: string) => void;
  transaction: <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>;
}

export function validarBaseLocal(databaseUrl: string, nodeEnv: string) {
  const url = new URL(databaseUrl);
  if (
    nodeEnv === 'production' ||
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    decodeURIComponent(url.pathname) !== '/siga_dev' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new ProvisionError(
      'La provisión solo funciona en siga_dev local sin parámetros adicionales.',
    );
  }
}

export async function provisionarAccesoLocal(options: ProvisionarAccesoLocalOptions) {
  const correo = (options.correo ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 254) {
    throw new ProvisionError(
      'Indica el correo de una persona existente: provisionar-acceso-local CORREO.',
    );
  }

  const directory =
    options.directory ?? fileURLToPath(new URL('../../../../../.local/', import.meta.url));
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const info = await lstat(directory);
  if (!info.isDirectory() || (info.mode & 0o077) !== 0 || info.uid !== process.getuid?.()) {
    throw new ProvisionError(
      'El directorio .local debe ser privado (0700), propio y no ser un enlace.',
    );
  }

  const password = randomBytes(24).toString('base64url');
  const passwordHash = await bcrypt.hash(password, options.bcryptRounds ?? 12);
  const credentialPath = resolve(directory, `acceso-${randomUUID()}.txt`);
  await writeFile(
    credentialPath,
    `SIGA · acceso local\nCorreo: ${correo}\nContraseña: ${password}\n`,
    {
      flag: 'wx',
      mode: 0o600,
    },
  );
  options.onCredentialCreated?.(credentialPath);

  const result = await options.transaction(async (tx) => {
    const user = await tx.usuario.findUnique({
      where: { correo },
      select: {
        id: true,
        rol: true,
        activo: true,
        estudiante: { select: { estado: true } },
        docente: { select: { activo: true } },
      },
    });
    if (
      !user ||
      !(
        (user.rol === 'ESTUDIANTE' && user.estudiante?.estado === 'ACTIVO') ||
        (user.rol === 'DOCENTE' && user.docente?.activo === true)
      )
    ) {
      throw new ProvisionError(
        'La persona debe existir y tener un perfil docente o estudiantil activo.',
      );
    }
    await tx.usuario.update({ where: { id: user.id }, data: { activo: true, passwordHash } });
    const sessions = await tx.sesion.updateMany({
      where: { usuarioId: user.id, revocadaEn: null },
      data: { revocadaEn: new Date() },
    });
    await tx.auditoria.create({
      data: {
        accion: 'PROVISIONAR_ACCESO_LOCAL',
        recurso: 'Usuario',
        recursoId: user.id,
        motivo: 'Provisión o restablecimiento ejecutado por operador local.',
        anterior: { activo: user.activo },
        posterior: { activo: true, sesionesRevocadas: sessions.count },
      },
    });
    return { usuarioId: user.id, sesionesRevocadas: sessions.count };
  });

  return {
    correo,
    password,
    credentialPath,
    usuarioId: result.usuarioId,
    sesionesRevocadas: result.sesionesRevocadas,
  };
}

export async function ejecutarProvisionCli(
  envInput: NodeJS.ProcessEnv = process.env,
  correoArg = process.argv[2] ?? '',
  createClient: typeof createDatabaseClient = createDatabaseClient,
  directory?: string,
) {
  config({ path: new URL('../../../../../.env', import.meta.url), quiet: true });
  const environment = parseEnvironment(envInput);
  validarBaseLocal(environment.DATABASE_URL, environment.NODE_ENV);
  const client = createClient(environment.DATABASE_URL);
  let target: string | undefined;
  try {
    const db = await client.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
    if (db[0]?.name !== 'siga_dev') throw new ProvisionError('La base conectada no es siga_dev.');
    const provisioned = await provisionarAccesoLocal({
      correo: correoArg,
      ...(directory ? { directory } : {}),
      onCredentialCreated: (path) => {
        target = path;
      },
      transaction: (fn) => client.$transaction(fn, { isolationLevel: 'Serializable' }),
    });
    console.log(`Acceso preparado. Credencial privada: ${provisioned.credentialPath}`);
    return provisioned;
  } catch (error) {
    if (target) {
      console.error(
        `Se conservó ${target}; verifica la auditoría antes de utilizar o eliminar el archivo.`,
      );
    }
    throw error;
  } finally {
    await client.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  ejecutarProvisionCli().catch((error: unknown) => {
    console.error(
      error instanceof ProvisionError
        ? error.message
        : 'No se pudo preparar el acceso local. Revisa la configuración y la conexión.',
    );
    process.exitCode = 1;
  });
}
