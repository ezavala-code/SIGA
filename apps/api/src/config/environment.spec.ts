import { parseEnvironment, requireTestDatabaseUrl } from './environment.js';
import { allowedOrigin } from './origin.js';

const valid = {
  DATABASE_URL: 'postgresql://user:secret@localhost:5432/siga_dev',
  WEB_ORIGIN: 'http://localhost:5173',
  JWT_SECRET: 'testonlyabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH',
};
describe('Configuración segura', () => {
  it('acepta PostgreSQL y aplica puerto y host local predeterminados', () => {
    expect(parseEnvironment(valid)).toMatchObject({ PORT: 3000, API_HOST: '127.0.0.1' });
  });
  it('mantiene prerrequisitos configurables y exigidos de forma predeterminada', () => {
    expect(parseEnvironment(valid).EXIGIR_PRERREQUISITOS).toBe(true);
    expect(
      parseEnvironment({ ...valid, EXIGIR_PRERREQUISITOS: 'false' }).EXIGIR_PRERREQUISITOS,
    ).toBe(false);
    expect(() => parseEnvironment({ ...valid, EXIGIR_PRERREQUISITOS: 'yes' })).toThrow(
      'EXIGIR_PRERREQUISITOS',
    );
  });
  it.each(['0', '65536', 'no-es-puerto'])('rechaza puerto inválido %s', (PORT) => {
    expect(() => parseEnvironment({ ...valid, PORT })).toThrow('PORT');
  });
  it('rechaza variables ausentes sin revelar credenciales', () => {
    expect(() => parseEnvironment({ DATABASE_URL: 'secreto-privado' })).toThrow('DATABASE_URL');
    expect(() => parseEnvironment({ DATABASE_URL: 'secreto-privado' })).not.toThrow(
      'secreto-privado',
    );
  });
  it('rechaza motores distintos y orígenes con rutas', () => {
    expect(() => parseEnvironment({ ...valid, DATABASE_URL: 'https://example.com/db' })).toThrow();
    expect(() =>
      parseEnvironment({ ...valid, WEB_ORIGIN: 'http://localhost:5173/ruta' }),
    ).toThrow();
  });
  it('no permite usar desarrollo como base de pruebas', () => {
    expect(() => requireTestDatabaseUrl(valid.DATABASE_URL)).toThrow('_test');
    expect(() => requireTestDatabaseUrl()).toThrow('TEST_DATABASE_URL');
  });
  it('rechaza la misma base incluso con alias local y credenciales distintas', () => {
    expect(() =>
      requireTestDatabaseUrl(
        'postgresql://test@localhost/siga_test',
        'postgresql://dev@127.0.0.1:5432/siga_test',
      ),
    ).toThrow('distinta');
  });
  it('acepta una base de pruebas aislada', () => {
    const url = 'postgresql://test:secret@127.0.0.1:5433/siga_test';
    expect(requireTestDatabaseUrl(url, valid.DATABASE_URL)).toBe(url);
  });
  it('admite alias local del portal solo en desarrollo y con el mismo puerto', () => {
    const dev = parseEnvironment(valid);
    expect(allowedOrigin('http://127.0.0.1:5173', dev)).toBe(true);
    expect(allowedOrigin('http://127.0.0.1:5174', dev)).toBe(false);
    expect(allowedOrigin('https://ajeno.example', dev)).toBe(false);
    expect(allowedOrigin('http://127.0.0.1:5173', { ...dev, NODE_ENV: 'production' })).toBe(false);
  });
});
