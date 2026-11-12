import { DatabaseService } from '../apps/api/dist/database/database.service.js';
import { parseEnvironment } from '../apps/api/dist/config/environment.js';
import { CertificadosService } from '../apps/api/dist/modules/certificados/certificados.service.js';

const [certificateId, userId, phase] = process.argv.slice(2);
if (
  !process.send ||
  !certificateId ||
  !userId ||
  !['antes-commit', 'despues-commit'].includes(phase)
) {
  throw new Error('Trabajador de prueba: se requiere IPC y argumentos validos.');
}
const environment = parseEnvironment({
  NODE_ENV: 'test',
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  WEB_ORIGIN: 'http://localhost:5173',
  JWT_SECRET: 'testingkeyabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH',
  CERTIFICATES_DIR: process.env.CERTIFICATES_DIR,
});
const database = new DatabaseService(environment);
const originalTransaction = database.transaction.bind(database);
const pause = () =>
  new Promise(() => {
    process.send({ phase });
  });
database.transaction = async (fn, options) => {
  const result = await originalTransaction(async (tx) => {
    const value = await fn(tx);
    if (phase === 'antes-commit') await pause();
    return value;
  }, options);
  if (phase === 'despues-commit') await pause();
  return result;
};
const actor = {
  userId,
  sessionId: '00000000-0000-4000-8000-000000000001',
  rol: 'ESTUDIANTE',
  correo: 'ejemplo@demo.invalid',
};
try {
  await new CertificadosService(database, environment).recuperar(certificateId, actor);
  throw new Error('La operacion termino sin alcanzar el punto de interrupcion.');
} finally {
  await database.onModuleDestroy();
}
