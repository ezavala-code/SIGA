import type { Environment } from './environment.js';

/** En desarrollo ambos alias de loopback llegan al mismo Vite. Producción conserva el origen exacto. */
export function allowedOrigin(origin: string, environment: Environment): boolean {
  if (origin === environment.WEB_ORIGIN) return true;
  if (environment.NODE_ENV === 'production' || !URL.canParse(origin)) return false;
  const received = new URL(origin);
  const configured = new URL(environment.WEB_ORIGIN);
  return (
    received.origin === origin &&
    received.protocol === configured.protocol &&
    received.port === configured.port &&
    ['localhost', '127.0.0.1'].includes(received.hostname) &&
    ['localhost', '127.0.0.1'].includes(configured.hostname)
  );
}
