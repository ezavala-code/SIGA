import { describe, expect, it } from '@jest/globals';
import { parseEnvironment } from './environment.js';
import { allowedOrigin } from './origin.js';

const development = parseEnvironment({
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/siga_dev',
  JWT_SECRET: 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH',
  WEB_ORIGIN: 'http://localhost:5173',
});
const production = { ...development, NODE_ENV: 'production' as const };

describe('allowedOrigin', () => {
  it('permite el origen configurado y el alias local solo en desarrollo', () => {
    expect(allowedOrigin('http://localhost:5173', production)).toBe(true);
    expect(allowedOrigin('http://127.0.0.1:5173', development)).toBe(true);
    expect(allowedOrigin('http://127.0.0.1:5173', production)).toBe(false);
  });

  it.each([
    '',
    'no-es-url',
    'https://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://localhost:5173/ruta',
    'http://localhost.ejemplo:5173',
    'http://example.invalid:5173',
  ])('rechaza el origen no equivalente %s', (origin) => {
    expect(allowedOrigin(origin, development)).toBe(false);
  });
});
