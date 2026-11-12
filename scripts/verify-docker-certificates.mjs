import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const statePath = resolve(root, '.local/e08-docker-persistence.json');
const baseUrl = 'http://localhost:8080/api';

if (!existsSync(statePath)) {
  throw new Error('Falta la referencia local de la constancia histórica E08.');
}
const state = JSON.parse(readFileSync(statePath, 'utf8'));
if (typeof state.codigo !== 'string' || !/^[\da-f]{32}$/i.test(state.codigo)) {
  throw new Error('La referencia local de la constancia no tiene un código válido.');
}

const response = await fetch(
  `${baseUrl}/certificados/verificar/${encodeURIComponent(state.codigo)}`,
);
if (!response.ok) throw new Error(`Falló la verificación pública (${response.status}).`);
const result = await response.json();
if (result.estado !== 'REVOCADO') {
  throw new Error('La constancia histórica debe estar revocada después del archivado demo.');
}
if ('matricula' in result || 'calificaciones' in result || 'correo' in result) {
  throw new Error('La verificación pública expuso datos que deben permanecer privados.');
}

console.log(
  JSON.stringify({
    apiDocker: 'correcta',
    constanciaHistorica: 'revocada',
    respuestaPublicaMinima: true,
    referenciaLocalValida: true,
  }),
);
