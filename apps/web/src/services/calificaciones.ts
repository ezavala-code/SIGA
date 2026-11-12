import { privateFetch } from './privateFetch';
import type {
  CalificacionGrupoItem,
  CalificacionesEstudiante,
  CalificacionesGrupo,
  ProgresoEstudiante,
} from '@siga/contracts';

const API = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await privateFetch(`${API}${path}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
  });
  if (!response.ok) {
    let message = 'No se pudo consultar la información académica.';
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (typeof body.message === 'string') message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(' ');
    } catch {
      // Mantener un mensaje claro ante respuestas que no sean JSON.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function getCalificacionesGrupo(
  grupoId: string,
  q = '',
  page = 1,
  pageSize = 100,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (q.trim()) params.set('q', q.trim());
  return request<CalificacionesGrupo>(
    `/docentes/me/grupos/${encodeURIComponent(grupoId)}/calificaciones?${params}`,
    { signal },
  );
}

export function guardarCalificacion(
  csrfToken: string,
  item: Pick<CalificacionGrupoItem, 'inscripcionId' | 'version'>,
  notaFinal: string,
  motivo?: string,
) {
  return request<{ inscripcionId: string; version: number; estado: string; notaFinal: string }>(
    `/calificaciones/${encodeURIComponent(item.inscripcionId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({
        notaFinal,
        version: item.version,
        ...(motivo === undefined ? {} : { motivo }),
      }),
    },
  );
}

export function getMisCalificaciones(signal?: AbortSignal) {
  return request<CalificacionesEstudiante>('/estudiantes/me/calificaciones', { signal });
}

export function getMiProgreso(signal?: AbortSignal) {
  return request<ProgresoEstudiante>('/estudiantes/me/progreso', { signal });
}
