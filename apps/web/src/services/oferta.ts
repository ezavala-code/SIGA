import { privateFetch } from './privateFetch';
import type {
  CatalogPage,
  OfertaGrupo,
  PeriodoAcademico,
  PoliticaAcademicaResumen,
} from '@siga/contracts';

const API = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await privateFetch(`${API}${path}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
  });
  if (!response.ok) {
    let message = 'No se pudo guardar el cambio.';
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (typeof body.message === 'string') message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(' ');
    } catch {
      // Mantener un mensaje legible si el servidor devuelve una respuesta vacía.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

function query(q: string, page: number, pageSize: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (q.trim()) params.set('q', q.trim());
  return `?${params}`;
}

function mutation(method: string, csrfToken: string, body?: unknown): RequestInit {
  return {
    method,
    headers: {
      'X-CSRF-Token': csrfToken,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

export function getPeriodos(q = '', page = 1, pageSize = 10, signal?: AbortSignal) {
  return request<CatalogPage<PeriodoAcademico>>(`/periodos${query(q, page, pageSize)}`, { signal });
}

export function getPoliticas(signal?: AbortSignal) {
  return request<PoliticaAcademicaResumen[]>('/periodos/politicas', { signal });
}

export function createPeriodo(
  csrfToken: string,
  data: Omit<PeriodoAcademico, 'id' | 'politica' | 'grupos'>,
) {
  return request<PeriodoAcademico>('/periodos', mutation('POST', csrfToken, data));
}

export function updatePeriodo(
  csrfToken: string,
  id: string,
  data: Partial<Omit<PeriodoAcademico, 'id' | 'politica' | 'grupos'>>,
) {
  return request<PeriodoAcademico>(`/periodos/${id}`, mutation('PATCH', csrfToken, data));
}

export function getGrupos(q = '', page = 1, pageSize = 10, signal?: AbortSignal) {
  return request<CatalogPage<OfertaGrupo>>(`/grupos${query(q, page, pageSize)}`, { signal });
}

export function createGrupo(
  csrfToken: string,
  data: Pick<OfertaGrupo, 'clave' | 'planId' | 'asignaturaId' | 'periodoId' | 'docenteId' | 'cupo'>,
) {
  return request<OfertaGrupo>('/grupos', mutation('POST', csrfToken, { ...data, activo: true }));
}

export function updateGrupo(
  csrfToken: string,
  id: string,
  data: Partial<
    Pick<
      OfertaGrupo,
      'clave' | 'planId' | 'asignaturaId' | 'periodoId' | 'docenteId' | 'cupo' | 'activo'
    >
  >,
) {
  return request<OfertaGrupo>(`/grupos/${id}`, mutation('PATCH', csrfToken, data));
}

export function getMisGrupos(q: string, page: number, signal?: AbortSignal) {
  return request<CatalogPage<OfertaGrupo>>(`/docentes/me/grupos${query(q, page, 20)}`, { signal });
}
