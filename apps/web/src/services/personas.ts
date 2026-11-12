import { privateFetch } from './privateFetch';
import type {
  CatalogPage,
  EstadoEstudiante,
  PersonaDocente,
  PersonaEstudiante,
} from '@siga/contracts';

const API = '/api/personas';

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
      // Mantener un mensaje legible cuando el servidor devuelva un cuerpo vacío.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

function query(q: string, page: number, pageSize: number, incluirInactivos: boolean) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (q.trim()) params.set('q', q.trim());
  if (incluirInactivos) params.set('incluirInactivos', 'true');
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

export function getEstudiantes(
  q = '',
  page = 1,
  pageSize = 10,
  signal?: AbortSignal,
  incluirInactivos = false,
) {
  return request<CatalogPage<PersonaEstudiante>>(
    `/estudiantes${query(q, page, pageSize, incluirInactivos)}`,
    { signal },
  );
}

export function createEstudiante(
  csrfToken: string,
  data: Pick<PersonaEstudiante, 'correo' | 'matricula' | 'nombre' | 'planId' | 'fechaIngreso'>,
) {
  return request<PersonaEstudiante>('/estudiantes', mutation('POST', csrfToken, data));
}

export function updateEstudiante(
  csrfToken: string,
  id: string,
  data: Partial<
    Pick<
      PersonaEstudiante,
      'correo' | 'matricula' | 'nombre' | 'planId' | 'fechaIngreso' | 'estado'
    >
  >,
) {
  return request<PersonaEstudiante>(`/estudiantes/${id}`, mutation('PATCH', csrfToken, data));
}

export function getDocentes(
  q = '',
  page = 1,
  pageSize = 10,
  signal?: AbortSignal,
  incluirInactivos = false,
) {
  return request<CatalogPage<PersonaDocente>>(
    `/docentes${query(q, page, pageSize, incluirInactivos)}`,
    { signal },
  );
}

export function createDocente(
  csrfToken: string,
  data: Pick<PersonaDocente, 'correo' | 'numeroEmpleado' | 'nombre' | 'departamento'>,
) {
  return request<PersonaDocente>('/docentes', mutation('POST', csrfToken, data));
}

export function updateDocente(
  csrfToken: string,
  id: string,
  data: Partial<
    Pick<PersonaDocente, 'correo' | 'numeroEmpleado' | 'nombre' | 'departamento' | 'activo'>
  >,
) {
  return request<PersonaDocente>(`/docentes/${id}`, mutation('PATCH', csrfToken, data));
}

export const estadosEstudiante: EstadoEstudiante[] = ['ACTIVO', 'INACTIVO', 'EGRESADO'];
