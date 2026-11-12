import { chmod, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ProvisionError,
  ejecutarProvisionCli,
  provisionarAccesoLocal,
  validarBaseLocal,
} from './provisionar-acceso-local.js';
import type { Prisma } from '../../generated/prisma/client.js';

describe('protección de la provisión local', () => {
  it.each([
    'postgresql://user:password@localhost:5432/siga_dev',
    'postgresql://user:password@127.0.0.1:55432/siga_dev',
    'postgresql://user:password@[::1]:5432/siga_dev',
  ])('permite la base de desarrollo local %s', (url) => {
    expect(() => validarBaseLocal(url, 'development')).not.toThrow();
  });

  it.each([
    'postgresql://user:password@remote.example:5432/siga_dev',
    'postgresql://user:password@localhost:5432/siga_prod',
    'postgresql://user:password@localhost:5432/siga_dev?host=remote.example',
    'postgresql://user:password@localhost:5432/siga_dev?options=-csearch_path%3Dother',
  ])('rechaza destinos distintos o ambiguos', (url) => {
    expect(() => validarBaseLocal(url, 'development')).toThrow();
  });

  it('rechaza producción aunque la URL apunte a localhost', () => {
    expect(() => validarBaseLocal('postgresql://localhost/siga_dev', 'production')).toThrow();
  });

  it('valida correo, permisos 0700/0600, perfiles activos y manejo de errores en CLI', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'siga-prov-unit-'));
    try {
      await chmod(dir, 0o700);
      await expect(
        provisionarAccesoLocal({
          correo: 'correo-invalido',
          directory: dir,
          transaction: async (fn) => fn({} as unknown as Prisma.TransactionClient),
        }),
      ).rejects.toThrow(ProvisionError);

      await chmod(dir, 0o755);
      await expect(
        provisionarAccesoLocal({
          correo: 'estudiante@example.invalid',
          directory: dir,
          transaction: async (fn) => fn({} as unknown as Prisma.TransactionClient),
        }),
      ).rejects.toThrow('0700');
      await chmod(dir, 0o700);

      // Perfil inexistente o inactivo
      await expect(
        provisionarAccesoLocal({
          correo: 'inactivo@example.invalid',
          directory: dir,
          bcryptRounds: 4,
          transaction: async (fn) =>
            fn({
              usuario: {
                findUnique: async () => ({
                  id: 'u-inactivo',
                  rol: 'ESTUDIANTE',
                  activo: false,
                  estudiante: { estado: 'BAJA' },
                  docente: null,
                }),
              },
            } as unknown as Prisma.TransactionClient),
        }),
      ).rejects.toThrow('perfil docente o estudiantil activo');

      // Docente activo + ejecución CLI simulada exitosa y fallida tras crear credencial
      const mockEnv = {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://user:pass@127.0.0.1:5432/siga_dev',
        WEB_ORIGIN: 'http://localhost:5173',
        JWT_SECRET: 'testingkeyabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH',
      };
      const provisioned = await ejecutarProvisionCli(
        mockEnv,
        'DOCENTE.ACTIVO@example.invalid',
        (() => ({
          $queryRaw: async () => [{ name: 'siga_dev' }],
          $transaction: async <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) =>
            fn({
              usuario: {
                findUnique: async () => ({
                  id: 'u-doc',
                  rol: 'DOCENTE',
                  activo: false,
                  estudiante: null,
                  docente: { activo: true },
                }),
                update: async () => ({}),
              },
              sesion: { updateMany: async () => ({ count: 2 }) },
              auditoria: { create: async () => ({}) },
            } as unknown as Prisma.TransactionClient),
          $disconnect: async () => undefined,
        })) as unknown as Parameters<typeof ejecutarProvisionCli>[2],
        dir,
      );
      expect(provisioned.correo).toBe('docente.activo@example.invalid');
      expect(provisioned.sesionesRevocadas).toBe(2);
      const credStat = await stat(provisioned.credentialPath);
      expect(credStat.mode & 0o777).toBe(0o600);

      // Error de base distinta a siga_dev y fallo dentro de transacción después de escribir archivo
      await expect(
        ejecutarProvisionCli(
          mockEnv,
          'docente.activo@example.invalid',
          (() => ({
            $queryRaw: async () => [{ name: 'otra_base' }],
            $transaction: async () => undefined,
            $disconnect: async () => undefined,
          })) as unknown as Parameters<typeof ejecutarProvisionCli>[2],
          dir,
        ),
      ).rejects.toThrow('siga_dev');

      await expect(
        ejecutarProvisionCli(
          mockEnv,
          'docente.activo@example.invalid',
          (() => ({
            $queryRaw: async () => [{ name: 'siga_dev' }],
            $transaction: async () => {
              throw new ProvisionError('Fallo simulado después de crear credencial.');
            },
            $disconnect: async () => undefined,
          })) as unknown as Parameters<typeof ejecutarProvisionCli>[2],
          dir,
        ),
      ).rejects.toThrow('Fallo simulado');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
