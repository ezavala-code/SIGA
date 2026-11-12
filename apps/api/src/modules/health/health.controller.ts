import { Controller, Get, Header, Inject, ServiceUnavailableException } from '@nestjs/common';
import type { HealthResponse } from '@siga/contracts';
import { DatabaseService } from '../../database/database.service.js';
import { Public } from '../auth/auth.metadata.js';

@Controller('health')
@Public()
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  @Get('live')
  @Header('Cache-Control', 'no-store')
  live() {
    return { status: 'ok' as const };
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  async ready(): Promise<HealthResponse> {
    const available = await this.database.isAvailable();
    const result: HealthResponse = {
      status: available ? 'ok' : 'unavailable',
      checks: { database: available ? 'up' : 'down' },
      timestamp: new Date().toISOString(),
    };
    if (!available) throw new ServiceUnavailableException(result);
    return result;
  }
}
