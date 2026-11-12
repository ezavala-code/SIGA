import type { HealthResponse } from '@siga/contracts';

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/health', {
    signal,
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok && response.status !== 503)
    throw new Error('No fue posible consultar la disponibilidad.');
  const result = (await response.json()) as HealthResponse;
  if (
    !['ok', 'unavailable'].includes(result.status) ||
    !['up', 'down'].includes(result.checks?.database) ||
    typeof result.timestamp !== 'string'
  ) {
    throw new Error('El servicio devolvió una respuesta inesperada.');
  }
  return result;
}
