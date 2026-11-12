import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/** Una sola conexión administrada por Prisma/adapter-pg; el adaptador cierra su pool. */
export function createDatabaseClient(connectionString: string, onPoolError?: () => void) {
  const schema = URL.canParse(connectionString)
    ? (new URL(connectionString).searchParams.get('schema') ?? undefined)
    : undefined;
  if (schema !== undefined && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
    throw new Error('El esquema de PostgreSQL configurado no es válido.');
  }
  const adapter = new PrismaPg(
    {
      connectionString,
      ...(schema === undefined ? {} : { options: `-c search_path=${schema}` }),
      max: 5,
      connectionTimeoutMillis: 2000,
      query_timeout: 10000,
      statement_timeout: 10000,
      idleTimeoutMillis: 10000,
      application_name: 'siga-api',
    },
    {
      ...(schema === undefined ? {} : { schema }),
      onPoolError,
      onConnectionError: onPoolError,
    },
  );
  return new PrismaClient({ adapter, log: [] });
}
