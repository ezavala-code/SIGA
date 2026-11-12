import { privateFetch } from './privateFetch';
import type { AuthProfile, CatalogPage, PublicUser, Rol } from '@siga/contracts';

const API = '/api/auth';

export function rolePath(role: Rol) {
  return role === 'ADMINISTRADOR'
    ? '/administracion'
    : role === 'DOCENTE'
      ? '/docente'
      : '/estudiante';
}

export async function getSession(signal?: AbortSignal): Promise<AuthProfile | null> {
  const response = await fetch(`${API}/me`, {
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('No se pudo comprobar la sesión.');
  const profile = (await response.json()) as AuthProfile;
  if (
    !profile.id ||
    !['ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE'].includes(profile.rol) ||
    typeof profile.csrfToken !== 'string'
  )
    throw new Error('Respuesta de sesión inválida.');
  return profile;
}

export async function login(correo: string, password: string) {
  const response = await fetch(`${API}/login`, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, password }),
  });
  if (response.status === 429)
    throw new Error('Demasiados intentos. Intenta de nuevo en cinco minutos.');
  if (!response.ok) throw new Error('Correo o contraseña incorrectos, o cuenta inactiva.');
  return response.json() as Promise<{
    usuario: { id: string; correo: string; rol: Rol };
    csrfToken: string;
  }>;
}

export async function logout(csrfToken: string) {
  const response = await privateFetch(`${API}/logout`, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'X-CSRF-Token': csrfToken },
  });
  if (!response.ok) throw new Error('No se pudo cerrar la sesión.');
}

export async function getUsers(
  q: string,
  page: number,
  signal?: AbortSignal,
): Promise<CatalogPage<PublicUser>> {
  const params = new URLSearchParams({ q, page: String(page), pageSize: '20' });
  const response = await privateFetch(`${API}/usuarios?${params}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
  });
  if (!response.ok) throw new Error('No se pudieron consultar las cuentas.');
  return response.json() as Promise<CatalogPage<PublicUser>>;
}
