import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(target)) {
  const current = readFileSync(target, 'utf8');
  const additions = [];
  if (!/^JWT_SECRET=/m.test(current)) {
    additions.push(
      `JWT_SECRET=${randomBytes(48).toString('base64url')}`,
      'JWT_TTL_SECONDS=1800',
      'COOKIE_SECURE=false',
    );
  }
  if (!/^POSTGRES_APP_USER=/m.test(current)) additions.push('POSTGRES_APP_USER=siga_app');
  if (!/^POSTGRES_APP_PASSWORD=/m.test(current)) {
    additions.push(`POSTGRES_APP_PASSWORD=${randomBytes(32).toString('hex')}`);
  }
  if (additions.length) {
    appendFileSync(target, `\n${additions.join('\n')}\n`);
    console.log('Se añadieron al .env local los valores aleatorios que faltaban.');
  } else {
    console.log('.env ya existe; se conserva sin cambios.');
  }
} else {
  const template = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
  const devPassword = randomBytes(24).toString('hex');
  const testPassword = randomBytes(24).toString('hex');
  const appPassword = randomBytes(32).toString('hex');
  let content = template
    .split('\n')
    .map((line) => {
      const password = line.startsWith('TEST_') ? testPassword : devPassword;
      return line
        .replaceAll('GENERAR_CON_NPM_RUN_SETUP', password)
        .replaceAll('GENERAR_APP_DB_PASSWORD', appPassword)
        .replaceAll('GENERAR_JWT_SECRET', randomBytes(48).toString('base64url'));
    })
    .join('\n');
  if (process.argv.includes('--native')) {
    content = content
      .replace('@127.0.0.1:5432/', '@127.0.0.1:55432/')
      .replace('@127.0.0.1:5433/', '@127.0.0.1:55433/');
  }
  writeFileSync(target, content, { flag: 'wx', mode: 0o600 });
  console.log('.env local creado con credenciales distintas para desarrollo y pruebas.');
}
