import { privateFetch } from './privateFetch';
import type { CatalogPage, InscripcionEstudiante, MatriculaOfertaGrupo } from '@siga/contracts';

const API = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await privateFetch(`${API}${path}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
  });
  if (!response.ok) {
    let message = 'No se pudo completar la solicitud de matrícula.';
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (typeof body.message === 'string') message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(' ');
    } catch {
      // Conservar un mensaje seguro si el servidor no devuelve JSON.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function getOfertaMatricula(page: number, signal?: AbortSignal) {
  return request<CatalogPage<MatriculaOfertaGrupo>>(`/matriculas/oferta?page=${page}&pageSize=20`, {
    signal,
  });
}

export function getMisInscripciones(page: number, signal?: AbortSignal) {
  return request<CatalogPage<InscripcionEstudiante>>(`/matriculas/me?page=${page}&pageSize=20`, {
    signal,
  });
}

export function inscribirse(csrfToken: string, grupoId: string) {
  return request<InscripcionEstudiante>('/matriculas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify({ grupoId }),
  });
}
