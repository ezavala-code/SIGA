import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createApp } from './app.js';
import { parseEnvironment } from './config/environment.js';

async function bootstrap() {
  config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
  const environment = parseEnvironment(process.env);
  const app = await createApp(environment);
  await app.listen(environment.PORT, environment.API_HOST);
}

bootstrap().catch(() => {
  console.error('La API no pudo iniciar. Revisa .env, el puerto y la configuración documentada.');
  process.exitCode = 1;
});
