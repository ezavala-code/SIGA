import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createServer, type Server } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Pool } from 'pg';
import { createApp } from '../src/app.js';
import { parseEnvironment, requireTestDatabaseUrl } from '../src/config/environment.js';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
const databaseUrl = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);
const environment = parseEnvironment({
  NODE_ENV: 'test',
  DATABASE_URL: databaseUrl,
  WEB_ORIGIN: 'http://localhost:5173',
  JWT_SECRET: 'testonlyabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH',
});

describe('API y PostgreSQL real', () => {
  let app: INestApplication;
  beforeAll(async () => {
    // Fallar si PostgreSQL no está disponible; jamás saltar la prueba o sustituirlo por mocks.
    const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 2000 });
    try {
      const result = await pool.query<{ database: string }>(
        'SELECT current_database() AS database',
      );
      expect(result.rows[0]?.database).toBe('siga_test');
    } finally {
      await pool.end();
    }
    app = await createApp(environment, true);
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });

  it('GET /health consulta PostgreSQL y no expone conexión ni versión', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body).toEqual({
      status: 'ok',
      checks: { database: 'up' },
      timestamp: expect.any(String),
    });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
  it('GET /health/live permite comprobar el proceso', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200, { status: 'ok' });
  });
  it('restringe CORS al origen configurado y devuelve 404 para rutas inexistentes', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'https://ajeno.example')
      .expect(200);
    expect(response.headers['access-control-allow-origin']).not.toBe('https://ajeno.example');
    await request(app.getHttpServer()).get('/estudiantes').expect(404);
  });
});

describe('Falla de conexión controlada', () => {
  let app: INestApplication;
  let silentServer: Server;
  const sockets = new Set<import('node:net').Socket>();
  beforeAll(async () => {
    // Puerto TCP propio que no habla PostgreSQL: prueba real de timeout sin tocar la BD del usuario.
    silentServer = createServer((socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    });
    await new Promise<void>((resolve) => silentServer.listen(0, '127.0.0.1', resolve));
    const address = silentServer.address();
    if (!address || typeof address === 'string') throw new Error('No se obtuvo puerto de prueba.');
    const url = new URL(databaseUrl);
    url.hostname = '127.0.0.1';
    url.port = String(address.port);
    app = await createApp({ ...environment, DATABASE_URL: url.toString() }, true);
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    for (const socket of sockets) socket.destroy();
    if (silentServer) await new Promise<void>((resolve) => silentServer.close(() => resolve()));
  });
  it('readiness responde 503 y liveness sigue funcionando', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(503);
    expect(response.body).toEqual({
      status: 'unavailable',
      checks: { database: 'down' },
      timestamp: expect.any(String),
    });
    await request(app.getHttpServer()).get('/health/live').expect(200);
  });
});
