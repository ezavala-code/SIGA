import { privateFetch } from './privateFetch';
import type {
  AuditoriaResumen,
  CatalogPage,
  CertificadoResumen,
  ReporteGrupo,
  VerificacionCertificado,
} from '@siga/contracts';

const API = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const requestFetch = path.startsWith('/certificados/verificar/') ? fetch : privateFetch;
  const response = await requestFetch(`${API}${path}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
  });
  if (!response.ok) {
    let message = 'No se pudo completar la operación.';
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (typeof body.message === 'string') message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(' ');
    } catch {
      // Mantener un mensaje claro ante respuestas no JSON.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

function query(q = '', page = 1, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (q.trim()) params.set('q', q.trim());
  return `?${params}`;
}

export function getMisCertificados(signal?: AbortSignal) {
  return request<{ items: CertificadoResumen[] }>('/certificados/me', { signal });
}

export function emitirMiCertificado(csrfToken: string) {
  return request<CertificadoResumen>('/certificados', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
  });
}

export function emitirConclusion(csrfToken: string) {
  return request<CertificadoResumen>('/certificados/conclusion', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
  });
}

export function recuperarCertificado(csrfToken: string, id: string) {
  return request<CertificadoResumen>(`/certificados/${encodeURIComponent(id)}/recuperar`, {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
  });
}

export function reemitirCertificado(csrfToken: string, id: string) {
  return request<CertificadoResumen>(`/certificados/${encodeURIComponent(id)}/reemitir`, {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
  });
}

export function getVerificacionCertificado(codigo: string, signal?: AbortSignal) {
  return request<VerificacionCertificado>(`/certificados/verificar/${encodeURIComponent(codigo)}`, {
    signal,
  });
}

export interface CertificadoAdministrativo extends CertificadoResumen {
  estudiante: { id: string; nombre: string; matricula: string };
  programa: { clave: string; nombre: string };
}

export function getCertificadosAdministracion(
  q = '',
  page = 1,
  pageSize = 20,
  signal?: AbortSignal,
) {
  return request<CatalogPage<CertificadoAdministrativo>>(
    `/certificados${query(q, page, pageSize)}`,
    { signal },
  );
}

export function revocarCertificado(csrfToken: string, id: string, motivo: string) {
  return request<CertificadoResumen>(`/certificados/${encodeURIComponent(id)}/revocar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify({ motivo }),
  });
}

export function getReporteGrupos(q = '', page = 1, pageSize = 20, signal?: AbortSignal) {
  return request<CatalogPage<ReporteGrupo>>(`/reportes/grupos${query(q, page, pageSize)}`, {
    signal,
  });
}

export function getAuditoria(q = '', page = 1, pageSize = 50, signal?: AbortSignal) {
  return request<CatalogPage<AuditoriaResumen>>(`/reportes/auditoria${query(q, page, pageSize)}`, {
    signal,
  });
}
