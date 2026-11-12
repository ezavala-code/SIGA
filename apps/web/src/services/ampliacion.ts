import { privateFetch } from './privateFetch';

export type Horario = {
  id?: string;
  grupoId?: string;
  diaSemana: number;
  inicioMinuto: number;
  finMinuto: number;
  aula: string;
};
export type GrupoHorario = {
  grupoId: string;
  grupo: string;
  periodo: string;
  asignatura: string;
  horarios: Horario[];
};
export type MapaCurso = {
  id: string;
  clave: string;
  nombre: string;
  creditos: string;
  semestre: number;
  prerequisitosPendientes: string[];
  estado: 'APROBADA' | 'CURSANDO' | 'BLOQUEADA' | 'DISPONIBLE';
};
export type MapaPlan = {
  plan: { id: string; nombre: string; version: number; programa: string };
  asignaturas: MapaCurso[];
};
export type Evaluacion = {
  id: string;
  grupoId: string;
  nombre: string;
  ponderacion: string;
  notas: { inscripcionId: string; nota: string }[];
};
export type MisEvaluaciones = {
  inscripcionId: string;
  grupo: string;
  asignatura: string;
  notaFinal: string | null;
  evaluaciones: { nombre: string; ponderacion: string; nota: string | null }[];
};
export type Notificacion = {
  id: string;
  titulo: string;
  mensaje: string;
  leidaEn: string | null;
  creadoEn: string;
};
export type SesionClase = {
  id: string;
  fecha: string;
  tema: string;
  registros: { inscripcionId: string; presente: boolean }[];
};
export type AsistenciaEstudiante = {
  grupo: string;
  asignatura: string;
  total: number;
  presentes: number;
  porcentaje: number | null;
  sesiones: { fecha: string; tema: string; presente: boolean | null }[];
};
export type Indicadores = {
  resumen: {
    estudiantes: number;
    docentes: number;
    programas: number;
    periodosAbiertos: number;
    grupos: number;
    inscripciones: number;
  };
  porPrograma: { nombre: string; estudiantes: number }[];
  ocupacion: {
    id: string;
    grupo: string;
    programa: string;
    asignatura: string;
    cupo: number;
    inscritos: number;
  }[];
  asignaturasConCalificaciones: number;
};
export type Alerta = {
  estudianteId: string;
  matricula: string;
  nombre: string;
  programa: string;
  motivos: string[];
};
export type ListaEspera = {
  id: string;
  grupoId: string;
  estado: 'ESPERANDO' | 'OFRECIDO' | 'ATENDIDO' | 'CANCELADO';
  creadoEn: string;
  grupo: {
    clave: string;
    periodo: { nombre: string };
    planAsignatura: { asignatura: { nombre: string } };
  };
};

export async function ampliacion<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await privateFetch(`/api/${path}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
  });
  if (!response.ok) {
    let message = 'No se pudo completar la operación.';
    try {
      const data = (await response.json()) as { message?: string | string[] };
      if (typeof data.message === 'string') message = data.message;
      if (Array.isArray(data.message)) message = data.message.join(' ');
    } catch {
      /* Conservar mensaje genérico. */
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}
export function payload(
  csrfToken: string,
  method: 'PATCH' | 'POST' | 'PUT' | 'DELETE',
  data?: unknown,
): RequestInit {
  return {
    method,
    headers: {
      'X-CSRF-Token': csrfToken,
      ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  };
}
export const getMiHorario = (signal?: AbortSignal) =>
  ampliacion<GrupoHorario[]>('ampliacion/mi-horario', { signal });
export const getHorariosGrupo = (id: string, signal?: AbortSignal) =>
  ampliacion<Horario[]>(`ampliacion/grupos/${id}/horarios`, { signal });
export const actualizarHorarios = (token: string, id: string, horarios: Horario[]) =>
  ampliacion<Horario[]>(`ampliacion/grupos/${id}/horarios`, payload(token, 'PUT', { horarios }));
export const getMapa = (signal?: AbortSignal) =>
  ampliacion<MapaPlan>('ampliacion/mapa-curricular', { signal });
export const getEvaluacionesGrupo = (id: string, signal?: AbortSignal) =>
  ampliacion<Evaluacion[]>(`ampliacion/grupos/${id}/evaluaciones`, { signal });
export const crearEvaluacion = (token: string, id: string, nombre: string, ponderacion: number) =>
  ampliacion<Evaluacion>(
    `ampliacion/grupos/${id}/evaluaciones`,
    payload(token, 'POST', { nombre, ponderacion }),
  );
export const capturarNotaParcial = (
  token: string,
  id: string,
  inscripcionId: string,
  nota: string,
  motivo?: string,
) =>
  ampliacion<{ notaFinal: string | null }>(
    `ampliacion/evaluaciones/${id}/nota`,
    payload(token, 'PUT', { inscripcionId, nota, ...(motivo ? { motivo } : {}) }),
  );
export const getMisEvaluaciones = (signal?: AbortSignal) =>
  ampliacion<MisEvaluaciones[]>('ampliacion/mis-evaluaciones', { signal });
export const getNotificaciones = (signal?: AbortSignal) =>
  ampliacion<Notificacion[]>('ampliacion/notificaciones', { signal });
export const marcarLeida = (token: string, id: string) =>
  ampliacion<{ ok: boolean }>(`ampliacion/notificaciones/${id}/leida`, payload(token, 'PATCH'));
export const getSesionesGrupo = (id: string, signal?: AbortSignal) =>
  ampliacion<SesionClase[]>(`ampliacion/grupos/${id}/sesiones`, { signal });
export const crearSesion = (token: string, grupoId: string, fecha: string, tema: string) =>
  ampliacion<SesionClase>(
    `ampliacion/grupos/${grupoId}/sesiones`,
    payload(token, 'POST', { fecha, tema }),
  );
export const guardarAsistencia = (
  token: string,
  sesionId: string,
  inscripcionId: string,
  presente: boolean,
) =>
  ampliacion<{ presente: boolean }>(
    `ampliacion/sesiones/${sesionId}/asistencias`,
    payload(token, 'PUT', { inscripcionId, presente }),
  );
export const getMiAsistencia = (signal?: AbortSignal) =>
  ampliacion<AsistenciaEstudiante[]>('ampliacion/mi-asistencia', { signal });
export const getIndicadores = (signal?: AbortSignal) =>
  ampliacion<Indicadores>('ampliacion/indicadores', { signal });
export const getAlertas = (signal?: AbortSignal) =>
  ampliacion<Alerta[]>('ampliacion/alertas', { signal });
export const actualizarPerfil = (
  token: string,
  data: { nombre?: string; passwordActual?: string; passwordNueva?: string },
) => ampliacion<{ ok: boolean }>('ampliacion/perfil', payload(token, 'PATCH', data));
export const generarRecuperacion = (token: string, userId: string) =>
  ampliacion<{ token: string; expiraEn: string; aviso: string }>(
    `ampliacion/usuarios/${userId}/recuperacion`,
    payload(token, 'POST'),
  );
export const completarRecuperacion = (code: string, passwordNueva: string) =>
  ampliacion<{ ok: boolean }>(
    'ampliacion/recuperar-acceso',
    payload('', 'POST', { token: code, passwordNueva }),
  );
export const getMisListas = (signal?: AbortSignal) =>
  ampliacion<ListaEspera[]>('matriculas/lista-espera', { signal });
export const unirseLista = (token: string, grupoId: string) =>
  ampliacion<ListaEspera>('matriculas/lista-espera', payload(token, 'POST', { grupoId }));
export const salirLista = (token: string, id: string) =>
  ampliacion<{ ok: boolean }>(`matriculas/lista-espera/${id}`, payload(token, 'DELETE'));
export const cancelarMatricula = (token: string, id: string) =>
  ampliacion<{ ok: boolean }>(`matriculas/${id}`, payload(token, 'DELETE'));

export const configurarCancelacion = (token: string, periodoId: string, value: boolean) =>
  ampliacion<{ id: string; permiteCancelacionEstudiante: boolean }>(
    `ampliacion/periodos/${periodoId}/cancelacion`,
    payload(token, 'PATCH', { permiteCancelacionEstudiante: value }),
  );
