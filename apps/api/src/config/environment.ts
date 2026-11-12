import { z } from 'zod';

const postgresUrl = z
  .string()
  .url()
  .refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return ['postgres:', 'postgresql:'].includes(url.protocol) && url.pathname.length > 1;
  }, 'Debe ser una URL de PostgreSQL con nombre de base de datos');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_HOST: z.enum(['127.0.0.1', '0.0.0.0']).default('127.0.0.1'),
  DATABASE_URL: postgresUrl,
  JWT_SECRET: z
    .string()
    .regex(/^[A-Za-z0-9_-]{43,}$/, 'Debe ser un secreto aleatorio base64url de al menos 32 bytes'),
  JWT_TTL_SECONDS: z.coerce.number().int().min(300).max(3600).default(1800),
  EXIGIR_PRERREQUISITOS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  CERTIFICATES_DIR: z.string().trim().min(1).default('.local/certificados'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  WEB_ORIGIN: z
    .string()
    .url()
    .refine((value) => {
      if (!URL.canParse(value)) return false;
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && url.origin === value;
    }, 'Debe contener un único origen HTTP/HTTPS sin ruta'),
});

export type Environment = z.infer<typeof schema>;
export const ENVIRONMENT = Symbol('ENVIRONMENT');

export function parseEnvironment(input: Record<string, unknown>): Environment {
  const result = schema.safeParse(input);
  if (!result.success) {
    // No incorporar valores de entrada: DATABASE_URL puede contener una contraseña.
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`Configuración inválida. Revisar: ${fields.join(', ')}`);
  }
  return result.data;
}

/** Debe llamarse antes de abrir una conexión para integración; nunca usa DATABASE_URL como fallback. */
export function requireTestDatabaseUrl(testUrl?: string, devUrl?: string): string {
  if (!testUrl || !postgresUrl.safeParse(testUrl).success) {
    throw new Error('Se requiere TEST_DATABASE_URL válida para las pruebas de integración.');
  }
  const test = new URL(testUrl);
  if (!decodeURIComponent(test.pathname).endsWith('_test')) {
    throw new Error('La base de pruebas debe tener un nombre terminado en _test.');
  }
  if (devUrl) {
    const dev = new URL(devUrl);
    const normalizeHost = (host: string) =>
      ['localhost', '127.0.0.1', '[::1]'].includes(host) ? 'loopback' : host;
    if (
      normalizeHost(test.hostname) === normalizeHost(dev.hostname) &&
      (test.port || '5432') === (dev.port || '5432') &&
      decodeURIComponent(test.pathname) === decodeURIComponent(dev.pathname)
    ) {
      throw new Error('La base de pruebas debe ser distinta de la base de desarrollo.');
    }
  }
  return testUrl;
}
