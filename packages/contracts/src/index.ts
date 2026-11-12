/** Contrato público de disponibilidad; nunca incluir credenciales o detalles del servidor. */
export interface HealthResponse {
  status: 'ok' | 'unavailable';
  checks: { database: 'up' | 'down' };
  timestamp: string;
}

export type Rol = 'ADMINISTRADOR' | 'DOCENTE' | 'ESTUDIANTE';

export interface PublicUser {
  id: string;
  correo: string;
  rol: Rol;
  activo: boolean;
}

export interface AuthProfile {
  id: string;
  correo: string;
  rol: Rol;
  persona: null | { id: string; nombre: string; matricula?: string; numeroEmpleado?: string };
  csrfToken: string;
}

export interface CatalogoPrograma {
  id: string;
  clave: string;
  nombre: string;
  activo: boolean;
}

export interface CatalogoAsignatura {
  id: string;
  clave: string;
  nombre: string;
  activo: boolean;
}

export interface CatalogPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PlanCourse {
  asignaturaId: string;
  creditos: string;
  semestreSugerido: number;
  prerrequisitos: string[];
  asignatura: CatalogoAsignatura;
}

export interface PlanEstudioDetalle {
  id: string;
  programaId: string;
  version: number;
  nombre: string;
  activo: boolean;
  revision: number;
  contenidoEditable: boolean;
  historial: { estudiantes: number; grupos: number; inscripciones: number };
  programa: CatalogoPrograma;
  asignaturas: PlanCourse[];
}

export interface PlanEstudioResumen extends Omit<
  PlanEstudioDetalle,
  'asignaturas' | 'historial' | 'contenidoEditable'
> {
  _count: { asignaturas: number; estudiantes: number };
}

export type EstadoEstudiante = 'ACTIVO' | 'INACTIVO' | 'EGRESADO';

export interface PersonaEstudiante {
  id: string;
  matricula: string;
  nombre: string;
  planId: string;
  fechaIngreso: string;
  estado: EstadoEstudiante;
  correo: string;
  accesoActivo: boolean;
  plan: {
    id: string;
    nombre: string;
    version: number;
    programa: { id: string; clave: string; nombre: string };
  };
  historial: { inscripciones: number; certificados: number };
}

export interface PersonaDocente {
  id: string;
  numeroEmpleado: string;
  nombre: string;
  departamento: string;
  activo: boolean;
  correo: string;
  accesoActivo: boolean;
  gruposAsignados: number;
}

export type EstadoPeriodo = 'PLANIFICADO' | 'ABIERTO' | 'CERRADO';

export interface PoliticaAcademicaResumen {
  id: string;
  version: string;
  descripcion: string;
  esPropuesta: boolean;
}

export interface PeriodoAcademico {
  id: string;
  clave: string;
  nombre: string;
  inicio: string;
  fin: string;
  inscripcionInicio: string;
  inscripcionFin: string;
  estado: EstadoPeriodo;
  permiteCancelacionEstudiante?: boolean | null;
  politicaId: string;
  politica: Pick<PoliticaAcademicaResumen, 'id' | 'version' | 'descripcion' | 'esPropuesta'>;
  grupos: number;
}

export interface OfertaGrupo {
  id: string;
  clave: string;
  planId: string;
  asignaturaId: string;
  periodoId: string;
  politicaId: string;
  docenteId: string;
  cupo: number;
  activo: boolean;
  ocupacion: number;
  periodo: Pick<
    PeriodoAcademico,
    'id' | 'clave' | 'nombre' | 'inicio' | 'fin' | 'inscripcionInicio' | 'inscripcionFin' | 'estado'
  >;
  plan: {
    id: string;
    nombre: string;
    version: number;
    activo: boolean;
    programa: { clave: string; nombre: string };
  };
  asignatura: Pick<CatalogoAsignatura, 'id' | 'clave' | 'nombre' | 'activo'>;
  docente: Pick<PersonaDocente, 'id' | 'numeroEmpleado' | 'nombre' | 'activo'>;
}

export interface MatriculaOfertaGrupo {
  grupoId: string;
  clave: string;
  cupo: number;
  ocupacion: number;
  creditos: string;
  plan: Pick<PlanEstudioDetalle, 'id' | 'nombre' | 'version' | 'activo'> & {
    programa: Pick<CatalogoPrograma, 'clave' | 'nombre'>;
  };
  asignatura: Pick<CatalogoAsignatura, 'id' | 'clave' | 'nombre' | 'activo'>;
  periodo: {
    id: string;
    clave: string;
    nombre: string;
    inicio: string;
    fin: string;
    inscripcionInicio: string;
    inscripcionFin: string;
    estado: EstadoPeriodo;
  };
  docente: { id: string; nombre: string; activo: boolean };
  puedeInscribirse: boolean;
  motivo: string | null;
  enListaEspera?: boolean;
  tieneCupoReservado?: boolean;
}

export type EstadoInscripcion = 'PENDIENTE' | 'CALIFICADA' | 'CANCELADA';

export interface InscripcionEstudiante {
  id: string;
  estado: EstadoInscripcion;
  notaFinal: string | null;
  creditosSnapshot: string;
  creadoEn: string;
  puedeCancelarse?: boolean;
  grupo: {
    id: string;
    clave: string;
    asignatura: Pick<CatalogoAsignatura, 'id' | 'clave' | 'nombre'>;
    periodo: { id: string; clave: string; nombre: string; inicio: string };
    docente: { id: string; nombre: string };
  };
}

export type MetodoPromedioIntentos = 'TODOS' | 'ULTIMO' | 'MEJOR';

export interface CalificacionGrupoItem {
  inscripcionId: string;
  version: number;
  estado: EstadoInscripcion;
  notaFinal: string | null;
  creditos: string;
  estudiante: { id: string; matricula: string; nombre: string };
}

export interface CalificacionesGrupo {
  grupo: {
    id: string;
    clave: string;
    asignatura: Pick<CatalogoAsignatura, 'id' | 'clave' | 'nombre'>;
    periodo: { id: string; clave: string; nombre: string };
    politica: {
      version: string;
      escalaMinima: string;
      escalaMaxima: string;
      minimaAprobatoria: string;
      decimales: number;
      intentosPromedio: MetodoPromedioIntentos;
      esPropuesta: boolean;
    };
  };
  items: CalificacionGrupoItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CalificacionHistorialItem {
  inscripcionId: string;
  estado: EstadoInscripcion;
  resultado: 'PENDIENTE' | 'APROBADA' | 'REPROBADA' | 'CANCELADA';
  notaFinal: string | null;
  creditosSnapshot: string;
  creadoEn: string;
  version: number;
  grupo: { clave: string; docente: string };
  asignatura: Pick<CatalogoAsignatura, 'id' | 'clave' | 'nombre'>;
  periodo: {
    id: string;
    clave: string;
    nombre: string;
    inicio: string;
    fin: string;
    politica: {
      version: string;
      minimaAprobatoria: string;
      intentosPromedio: MetodoPromedioIntentos;
      esPropuesta: boolean;
    };
  };
}

export interface CalificacionesEstudiante {
  items: CalificacionHistorialItem[];
  promedioGeneral: string | null;
  periodos: Array<{
    id: string;
    clave: string;
    nombre: string;
    promedio: string | null;
    intentosCalificados: number;
  }>;
  politicaPropuesta: boolean;
}

export interface ProgresoEstudiante {
  plan: {
    id: string;
    nombre: string;
    version: number;
    programa: { clave: string; nombre: string };
  };
  creditosTotales: string;
  creditosAprobados: string;
  avancePorcentaje: string | null;
  asignaturasAprobadas: number;
  asignaturasTotales: number;
  sinCreditosEnPlan: boolean;
  politicaPropuesta: boolean;
}

export type EstadoCertificado = 'PENDIENTE' | 'EMITIDO' | 'REVOCADO' | 'FALLIDO';

export interface CertificadoResumen {
  id: string;
  tipo: 'ESTUDIOS' | 'CONCLUSION';
  codigo: string;
  estado: EstadoCertificado;
  solicitadoEn: string;
  emitidoEn: string | null;
  revocadoEn: string | null;
  motivoRevocacion: string | null;
  reemplazaId: string | null;
  reemplazo: { id: string; codigo: string } | null;
}

export interface VerificacionCertificado {
  estado: 'VIGENTE' | 'REVOCADO' | 'INEXISTENTE';
  codigo?: string;
  tipo?: 'ESTUDIOS' | 'CONCLUSION';
  fechaEmision?: string;
  programa?: string;
  nombre?: string;
}

export interface ReporteGrupo {
  id: string;
  clave: string;
  activo: boolean;
  cupo: number;
  periodo: {
    id: string;
    clave: string;
    nombre: string;
    inicio: string;
    fin: string;
    estado: EstadoPeriodo;
  };
  programa: Pick<CatalogoPrograma, 'clave' | 'nombre'>;
  plan: { nombre: string; version: number };
  asignatura: Pick<CatalogoAsignatura, 'clave' | 'nombre'>;
  docente: Pick<PersonaDocente, 'nombre' | 'numeroEmpleado'>;
  inscripciones: number;
}

export interface AuditoriaResumen {
  id: string;
  accion: string;
  recurso: string;
  recursoId: string;
  motivo: string | null;
  anterior: unknown;
  posterior: unknown;
  creadoEn: string;
  actor: { correo: string; rol: Rol } | null;
}
