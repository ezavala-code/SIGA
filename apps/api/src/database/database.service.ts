import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { createDatabaseClient } from './client.js';
import { ENVIRONMENT, type Environment } from '../config/environment.js';
import type { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly client: ReturnType<typeof createDatabaseClient>;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@Inject(ENVIRONMENT) environment: Environment) {
    this.client = createDatabaseClient(environment.DATABASE_URL, () =>
      this.logger.warn('Conexión inactiva a la base de datos interrumpida.'),
    );
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }

  transaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options: {
      isolationLevel?: Prisma.TransactionIsolationLevel;
      maxWait?: number;
      timeout?: number;
    } = {},
  ): Promise<T> {
    return this.client.$transaction(fn, options);
  }
}
