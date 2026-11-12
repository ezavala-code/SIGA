import { ServiceUnavailableException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { HealthController } from './health.controller.js';
import { DatabaseService } from '../../database/database.service.js';

describe('Disponibilidad de la API', () => {
  const database = { isAvailable: jest.fn<() => Promise<boolean>>() };
  const controller = new HealthController(database as unknown as DatabaseService);
  it('la comprobación de proceso no depende de PostgreSQL', () => {
    expect(controller.live()).toEqual({ status: 'ok' });
    expect(database.isAvailable).not.toHaveBeenCalled();
  });
  it('informa disponibilidad tras consultar la base', async () => {
    database.isAvailable.mockResolvedValue(true);
    expect(await controller.ready()).toMatchObject({ status: 'ok', checks: { database: 'up' } });
  });
  it('devuelve 503 sin credenciales cuando la base no está disponible', async () => {
    database.isAvailable.mockResolvedValue(false);
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
    try {
      await controller.ready();
    } catch (error) {
      expect((error as ServiceUnavailableException).getResponse()).toMatchObject({
        status: 'unavailable',
        checks: { database: 'down' },
      });
    }
  });
});
