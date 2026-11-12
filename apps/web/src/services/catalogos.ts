import { privateFetch } from './privateFetch';
import type {
  CatalogPage,
  CatalogoAsignatura,
  CatalogoPrograma,
  PlanEstudioDetalle,
  PlanEstudioResumen,
  PlanCourse,
} from '@siga/contracts';

const API = '/api/catalogos';

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
      // Mantener un mensaje legible si el servidor devuelve un cuerpo vacío.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

function options(csrfToken: string, method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: {
      'X-CSRF-Token': csrfToken,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

function pageQuery(q: string, page: number, pageSize: number, incluirInactivos: boolean) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (q.trim()) query.set('q', q.trim());
  if (incluirInactivos) query.set('incluirInactivos', 'true');
  return `?${query}`;
}

export function getProgramas(
  q = '',
  page = 1,
  pageSize = 100,
  signal?: AbortSignal,
  incluirInactivos = false,
) {
  return request<CatalogPage<CatalogoPrograma>>(
    `/programas${pageQuery(q, page, pageSize, incluirInactivos)}`,
    { signal },
  );
}

export function createPrograma(csrfToken: string, data: { clave: string; nombre: string }) {
  return request<CatalogoPrograma>('/programas', options(csrfToken, 'POST', data));
}

export function updatePrograma(
  csrfToken: string,
  id: string,
  data: { nombre?: string; activo?: boolean },
) {
  return request<CatalogoPrograma>(`/programas/${id}`, options(csrfToken, 'PATCH', data));
}

export function getAsignaturas(
  q = '',
  page = 1,
  pageSize = 100,
  signal?: AbortSignal,
  incluirInactivos = false,
) {
  return request<CatalogPage<CatalogoAsignatura>>(
    `/asignaturas${pageQuery(q, page, pageSize, incluirInactivos)}`,
    { signal },
  );
}

export function createAsignatura(csrfToken: string, data: { clave: string; nombre: string }) {
  return request<CatalogoAsignatura>('/asignaturas', options(csrfToken, 'POST', data));
}

export function updateAsignatura(
  csrfToken: string,
  id: string,
  data: { nombre?: string; activo?: boolean },
) {
  return request<CatalogoAsignatura>(`/asignaturas/${id}`, options(csrfToken, 'PATCH', data));
}

export function getPlanes(
  q = '',
  page = 1,
  pageSize = 100,
  signal?: AbortSignal,
  incluirInactivos = false,
) {
  return request<CatalogPage<PlanEstudioResumen>>(
    `/planes${pageQuery(q, page, pageSize, incluirInactivos)}`,
    { signal },
  );
}

export function getPlan(id: string, signal?: AbortSignal) {
  return request<PlanEstudioDetalle>(`/planes/${id}`, { signal });
}

export function createPlan(
  csrfToken: string,
  data: { programaId: string; version: number; nombre: string },
) {
  return request<PlanEstudioDetalle>('/planes', options(csrfToken, 'POST', data));
}

export function updatePlan(
  csrfToken: string,
  id: string,
  data: { nombre?: string; activo?: boolean },
) {
  return request<PlanEstudioDetalle>(`/planes/${id}`, options(csrfToken, 'PATCH', data));
}

export function createPlanVersion(csrfToken: string, id: string) {
  return request<PlanEstudioDetalle>(`/planes/${id}/nueva-version`, options(csrfToken, 'POST'));
}

export function updatePlanCourses(
  csrfToken: string,
  id: string,
  revision: number,
  asignaturas: PlanCourse[],
) {
  return request<PlanEstudioDetalle>(
    `/planes/${id}/contenido`,
    options(csrfToken, 'PUT', {
      revision,
      asignaturas: asignaturas.map(
        ({ asignaturaId, creditos, semestreSugerido, prerrequisitos }) => ({
          asignaturaId,
          creditos,
          semestreSugerido,
          prerrequisitos,
        }),
      ),
    }),
  );
}
