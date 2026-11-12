import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { AuthProfile, Rol } from '@siga/contracts';
import { getHealth } from '../services/health';
import { getSession, getUsers, login, logout, rolePath } from '../services/auth';
import { advanceSessionGeneration, setUnauthorizedHandler } from '../services/privateFetch';
import { CatalogManagement } from './CatalogManagement';
import { PersonManagement } from './PersonManagement';
import { OfertaManagement, TeacherGroups } from './OfertaManagement';
import { StudentMatriculas } from './StudentMatriculas';
import { StudentCalificaciones } from './StudentCalificaciones';
import { TeacherCalificaciones } from './TeacherCalificaciones';
import { clearTeacherDrafts, hasTeacherDrafts } from './teacherDrafts';
import { CurriculumOverview } from './CurriculumOverview';
import {
  AdministracionHorarios,
  AdministracionCancelaciones,
  AdministracionIndicadores,
  AsistenciaEstudianteVista,
  EvaluacionesEstudiante,
  HorarioPersonal,
  MapaCurricularDinamico,
  NotificacionesVista,
  PerfilVista,
  RecuperacionAdministrativa,
  RecuperarAcceso,
  SeguimientoGrupo,
} from './AcademicExtensions';
import { getMiProgreso } from '../services/calificaciones';
import {
  PublicCertificateVerification,
  ReportsManagement,
  StudentCertificates,
} from './CertificadosManagement';

async function clearPrivateQueries(client: QueryClient) {
  advanceSessionGeneration();
  const predicate = (query: { queryKey: readonly unknown[] }) =>
    !['session', 'health', 'verificacion-certificado'].includes(String(query.queryKey[0]));
  await client.cancelQueries({ predicate });
  client.removeQueries({ predicate });
  clearTeacherDrafts();
}

function Availability() {
  const query = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => getHealth(signal),
    refetchInterval: 30000,
  });
  const ready = query.isSuccess && query.data.status === 'ok';
  const title = query.isPending
    ? 'Comprobando disponibilidad'
    : query.isError
      ? 'No se pudo conectar con el servicio'
      : ready
        ? 'El servicio está disponible'
        : 'Servicio temporalmente no disponible';
  const detail = query.isPending
    ? 'Un momento, estamos consultando el servicio.'
    : ready
      ? 'La conexión con el sistema se verificó correctamente.'
      : 'Intenta comprobar de nuevo en unos momentos.';

  return (
    <section className="availability" aria-labelledby="availability-title">
      <div className={`status-dot ${ready ? 'is-ready' : ''}`} aria-hidden="true" />
      <div className="status-copy" aria-live="polite" role="status">
        <h2 id="availability-title">{title}</h2>
        <p>{detail}</p>
      </div>
      <button
        type="button"
        className="refresh-button"
        onClick={() => void query.refetch()}
        disabled={query.isFetching}
      >
        {query.isFetching ? 'Comprobando…' : 'Volver a comprobar'} <span aria-hidden="true">↻</span>
      </button>
    </section>
  );
}

function Home({ session }: { session: AuthProfile | null }) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span /> SISTEMA INTEGRAL DE GESTIÓN ACADÉMICA
          </p>
          <h1>
            Tu trayectoria.
            <br />
            Un solo <em>espacio.</em>
          </h1>
          <p className="hero-description">
            Un espacio para estudiantes, docentes y administración. Gestiona la vida académica de
            distintos programas y planes de estudio desde SIGA.
          </p>
          <Link className="primary-link" to={session ? rolePath(session.rol) : '/acceso'}>
            {session ? 'Ir a mi espacio' : 'Acceder a SIGA'} <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <svg viewBox="0 0 440 330" fill="none">
            <circle cx="230" cy="160" r="132" stroke="#d4daf0" />
            <circle cx="230" cy="160" r="102" stroke="#d4daf0" strokeDasharray="3 9" />
            <path d="M42 263h326M84 283h300" stroke="#d4daf0" />
            <path
              d="M97 209l113 53 150-75-114-52z"
              fill="#cad5fb"
              stroke="#4454ad"
              strokeWidth="1.5"
            />
            <path
              d="M97 194l113 53 150-75-114-52z"
              fill="#f7f8ff"
              stroke="#4454ad"
              strokeWidth="1.5"
            />
            <path d="M97 194v15m113 38v15m150-90v15" stroke="#4454ad" strokeWidth="1.5" />
            <path d="m128 166 101 46 118-59-99-46z" fill="#4556bd" />
            <path d="M164 128v41q64 50 118-8v-39" fill="#e1e7ff" stroke="#4454ad" strokeWidth="2" />
            <path
              d="m126 112 102-49 103 49-103 52z"
              fill="#eef1ff"
              stroke="#4454ad"
              strokeWidth="2"
            />
            <path d="m228 112 78 3v70" stroke="#9883d9" strokeWidth="3" />
            <circle cx="306" cy="188" r="5" fill="#9883d9" />
            <circle cx="90" cy="86" r="7" fill="#9883d9" />
            <path d="M347 69v18m-9-9h18M77 161v12m-6-6h12" stroke="#4454ad" strokeWidth="2" />
          </svg>
          <span className="art-label">APRENDER. CRECER. CONECTAR.</span>
        </div>
      </section>

      <Availability />
    </>
  );
}

function Login({ session }: { session: AuthProfile | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (session) return <Navigate to={rolePath(session.rol)} replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login(correo, password);
      setPassword('');
      advanceSessionGeneration();
      await queryClient.cancelQueries({ queryKey: ['session'] });
      await clearPrivateQueries(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      navigate(rolePath(result.usuario.rol), { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page" aria-labelledby="auth-title">
      <div className="auth-intro">
        <p className="eyebrow">ACCESO A SIGA</p>
        <h1 id="auth-title">Bienvenido a tu espacio.</h1>
        <p>Usa la cuenta que te entregó la administración académica.</p>
      </div>
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <label htmlFor="correo">Correo electrónico</label>
        <input
          id="correo"
          type="email"
          autoComplete="username"
          required
          value={correo}
          onChange={(event) => setCorreo(event.target.value)}
          maxLength={254}
        />
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="primary-link" disabled={submitting}>
          {submitting ? 'Verificando…' : 'Iniciar sesión'}
        </button>
      </form>
      <p>
        <Link to="/recuperar-acceso">¿Necesitas recuperar tu contraseña?</Link>
      </p>
    </section>
  );
}

const areaLabels: Record<Rol, string> = {
  ESTUDIANTE: 'Espacio de estudiantes',
  DOCENTE: 'Espacio de docentes',
  ADMINISTRADOR: 'Administración académica',
};

type ProfileNavLink = { label: string; to: string };
type ProfileNavGroup = { label: string; links: ProfileNavLink[] };

const profileNavigation: Record<Rol, { start: ProfileNavLink; groups: ProfileNavGroup[] }> = {
  ESTUDIANTE: {
    start: { label: 'Inicio', to: '/estudiante' },
    groups: [
      {
        label: 'Trayectoria académica',
        links: [
          { label: 'Mapa curricular de mi plan', to: '/estudiante/trayectoria' },
          { label: 'Calificaciones y avance', to: '/estudiante/calificaciones' },
          { label: 'Evaluaciones parciales', to: '/estudiante/evaluaciones' },
          { label: 'Asistencia a clases', to: '/estudiante/asistencia' },
          { label: 'Mi horario', to: '/estudiante/horario' },
        ],
      },
      {
        label: 'Trámites escolares',
        links: [
          { label: 'Matrícula e historial', to: '/estudiante/matriculas' },
          { label: 'Constancias de estudios', to: '/estudiante/certificados' },
        ],
      },
      {
        label: 'Mi cuenta',
        links: [
          { label: 'Actualizar mi perfil', to: '/cuenta' },
          { label: 'Notificaciones', to: '/notificaciones' },
        ],
      },
    ],
  },
  DOCENTE: {
    start: { label: 'Inicio', to: '/docente' },
    groups: [
      {
        label: 'Docencia',
        links: [
          { label: 'Grupos, calificaciones y CSV', to: '/docente/grupos' },
          { label: 'Mi horario', to: '/docente/horario' },
        ],
      },
      {
        label: 'Mi cuenta',
        links: [
          { label: 'Actualizar mi perfil', to: '/cuenta' },
          { label: 'Notificaciones', to: '/notificaciones' },
        ],
      },
    ],
  },
  ADMINISTRADOR: {
    start: { label: 'Inicio', to: '/administracion' },
    groups: [
      {
        label: 'Configuración académica',
        links: [{ label: 'Catálogos y planes', to: '/administracion/catalogos' }],
      },
      {
        label: 'Personas y accesos',
        links: [{ label: 'Estudiantes y docentes', to: '/administracion/personas' }],
      },
      {
        label: 'Oferta académica',
        links: [
          { label: 'Periodos y grupos', to: '/administracion/oferta' },
          { label: 'Horarios de grupos', to: '/administracion/horarios' },
          { label: 'Política de cancelaciones', to: '/administracion/cancelaciones' },
        ],
      },
      {
        label: 'Seguimiento',
        links: [
          { label: 'Reportes y auditoría', to: '/administracion/reportes' },
          { label: 'Indicadores y alertas', to: '/administracion/indicadores' },
        ],
      },
      {
        label: 'Mi cuenta',
        links: [
          { label: 'Actualizar mi perfil', to: '/cuenta' },
          { label: 'Notificaciones', to: '/notificaciones' },
          { label: 'Recuperar cuentas', to: '/administracion/recuperacion' },
        ],
      },
    ],
  },
};

function ProfileSidebar({
  role,
  session,
  collapsed,
  onToggle,
}: {
  role: Rol;
  session: AuthProfile;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(profileNavigation[role].groups.map((group) => [group.label, true])),
  );
  const [logoutError, setLogoutError] = useState('');
  const navigation = profileNavigation[role];

  async function endSession() {
    if (
      hasTeacherDrafts() &&
      !window.confirm('Hay calificaciones sin guardar. ¿Deseas cerrar sesión y descartarlas?')
    )
      return;
    setLogoutError('');
    try {
      await logout(session.csrfToken);
      advanceSessionGeneration();
      await queryClient.cancelQueries({ queryKey: ['session'] });
      await clearPrivateQueries(queryClient);
      queryClient.setQueryData(['session'], null);
      navigate('/acceso', { replace: true });
    } catch (cause) {
      setLogoutError(cause instanceof Error ? cause.message : 'No se pudo cerrar la sesión.');
    }
  }

  function isActive(to: string) {
    const [pathname, anchor] = to.split('#');
    return (
      location.pathname === pathname &&
      (anchor ? location.hash === `#${anchor}` : location.hash.length === 0)
    );
  }

  function confirmNavigation(event: { preventDefault: () => void }, to: string) {
    const [targetPathname] = to.split('#');
    if (
      targetPathname &&
      targetPathname !== location.pathname &&
      hasTeacherDrafts() &&
      !window.confirm('Hay cambios sin guardar. ¿Deseas salir?')
    ) {
      event.preventDefault();
    }
  }

  return (
    <aside
      className={`profile-sidebar ${collapsed ? 'is-collapsed' : ''}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !collapsed) {
          event.preventDefault();
          onToggle();
          event.currentTarget.querySelector<HTMLButtonElement>('.profile-sidebar-toggle')?.focus();
        }
      }}
    >
      <div className="profile-sidebar-heading">
        <div className="profile-sidebar-identity" aria-hidden={collapsed}>
          <span className="profile-role-mark" aria-hidden="true">
            {role === 'ESTUDIANTE' ? 'AL' : role === 'DOCENTE' ? 'DO' : 'AD'}
          </span>
          <span>
            <strong>{areaLabels[role]}</strong>
            <small>{session.persona?.nombre ?? session.correo}</small>
          </span>
        </div>
        <button
          className="profile-sidebar-toggle"
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          <span aria-hidden="true">{collapsed ? '›' : '‹'}</span>
        </button>
      </div>

      <nav className="profile-sidebar-nav" aria-label={`Funciones de ${areaLabels[role]}`}>
        <Link
          className={`profile-nav-link profile-nav-start ${isActive(navigation.start.to) ? 'is-active' : ''}`}
          to={navigation.start.to}
          onClick={(event) => confirmNavigation(event, navigation.start.to)}
          aria-current={isActive(navigation.start.to) ? 'page' : undefined}
          aria-label={collapsed ? navigation.start.label : undefined}
          title={collapsed ? navigation.start.label : undefined}
        >
          <span className="profile-nav-icon" aria-hidden="true">
            ⌂
          </span>
          <span className="profile-nav-label">{navigation.start.label}</span>
        </Link>

        {navigation.groups.map((group) => {
          const expanded = openGroups[group.label] ?? false;
          const active = group.links.some((link) => isActive(link.to));
          const panelId = `profile-nav-${role.toLowerCase()}-${group.label
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/gi, '-')}`;
          return (
            <section
              className={`profile-nav-group ${active ? 'has-active-link' : ''}`}
              key={group.label}
            >
              <button
                className="profile-nav-group-toggle"
                type="button"
                onClick={() =>
                  setOpenGroups((previous) => ({ ...previous, [group.label]: !expanded }))
                }
                aria-expanded={expanded && !collapsed}
                aria-controls={panelId}
                aria-label={collapsed ? group.label : undefined}
                title={collapsed ? group.label : undefined}
              >
                <span className="profile-nav-icon" aria-hidden="true">
                  {group.label === 'Mi cuenta'
                    ? '◉'
                    : group.label === 'Trayectoria académica'
                      ? '▤'
                      : '▣'}
                </span>
                <span className="profile-nav-label">{group.label}</span>
                <span className="profile-nav-chevron" aria-hidden="true">
                  {expanded && !collapsed ? '⌄' : '›'}
                </span>
              </button>
              <div className="profile-nav-children" id={panelId} hidden={!expanded || collapsed}>
                {group.links.map((link) => (
                  <Link
                    className={`profile-nav-child ${isActive(link.to) ? 'is-active' : ''}`}
                    key={`${group.label}-${link.label}`}
                    to={link.to}
                    onClick={(event) => confirmNavigation(event, link.to)}
                    aria-current={isActive(link.to) ? 'page' : undefined}
                  >
                    <span className="profile-nav-child-dot" aria-hidden="true" />
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </nav>

      <div className="profile-sidebar-footer">
        {logoutError && (
          <p className="profile-sidebar-error" role="alert">
            {logoutError}
          </p>
        )}
        <button
          className="profile-logout"
          type="button"
          onClick={() => void endSession()}
          aria-label={collapsed ? 'Cerrar sesión' : undefined}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <span className="profile-nav-icon" aria-hidden="true">
            ↪
          </span>
          <span className="profile-nav-label">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

function ProfilePage({ session, role }: { session: AuthProfile | null; role: Rol }) {
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const users = useQuery({
    queryKey: ['admin-users', userSearch, userPage],
    queryFn: ({ signal }) => getUsers(userSearch, userPage, signal),
    enabled: role === 'ADMINISTRADOR' && session?.rol === 'ADMINISTRADOR',
  });
  if (!session) return <Navigate to="/acceso" replace />;
  if (session.rol !== role) return <Navigate to={rolePath(session.rol)} replace />;

  return (
    <section className="profile-page" aria-labelledby="profile-title">
      <p className="eyebrow">SIGA / {role}</p>
      <div className="profile-header">
        <div>
          <h1 id="profile-title">{areaLabels[role]}</h1>
          <p>Sesión de {session.persona?.nombre ?? session.correo}</p>
        </div>
      </div>
      <div className="profile-panel" id="mi-cuenta">
        <h2>Mi cuenta</h2>
        <p>{session.correo}</p>
        {session.persona && (
          <p>
            {'matricula' in session.persona
              ? `Matrícula: ${session.persona.matricula}`
              : `Empleado: ${session.persona.numeroEmpleado}`}
          </p>
        )}
      </div>
      {role === 'ADMINISTRADOR' && (
        <>
          <div className="profile-panel">
            <h2>Cuentas activas</h2>
            <label>
              Buscar cuenta por correo
              <input
                value={userSearch}
                onChange={(event) => {
                  setUserSearch(event.target.value);
                  setUserPage(1);
                }}
              />
            </label>
            {users.isPending ? (
              <p>Cargando cuentas…</p>
            ) : users.isError ? (
              <p role="alert">No se pudieron consultar las cuentas.</p>
            ) : (
              <>
                <ul className="user-list">
                  {users.data.items.map((user) => (
                    <li key={user.id}>
                      <span>{user.correo}</span>
                      <span>
                        {user.rol} · {user.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </li>
                  ))}
                  {!users.data.items.length && <li>No se encontraron cuentas activas.</li>}
                </ul>
                <div className="catalog-pagination" aria-label="Paginación de cuentas">
                  <span>
                    {users.data.total} cuentas · Página {userPage}
                  </span>
                  <div>
                    <button
                      type="button"
                      className="small-button"
                      disabled={userPage <= 1}
                      onClick={() => setUserPage(userPage - 1)}
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      className="small-button"
                      disabled={userPage * users.data.pageSize >= users.data.total}
                      onClick={() => setUserPage(userPage + 1)}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
      {role === 'DOCENTE' && (
        <div className="profile-panel">
          <h2>Mis grupos</h2>
          <p>Consulta tus grupos asignados y captura sus calificaciones.</p>
          <Link className="primary-link" to="/docente/grupos">
            Consultar mis grupos y calificar →
          </Link>
        </div>
      )}
      {role === 'ESTUDIANTE' && (
        <>
          <div className="profile-panel">
            <h2>Matrícula</h2>
            <p>Consulta los grupos abiertos para tu plan y revisa tus inscripciones.</p>
            <Link className="primary-link" to="/estudiante/matriculas">
              Abrir mi matrícula →
            </Link>
          </div>
          <div className="profile-panel">
            <h2>Calificaciones y avance</h2>
            <p>Consulta tus notas finales, promedios y créditos aprobados.</p>
            <Link className="primary-link" to="/estudiante/calificaciones">
              Consultar mi historial →
            </Link>
          </div>
          <div className="profile-panel">
            <h2>Constancias de estudios</h2>
            <p>Emite y descarga tu constancia verificable con las calificaciones finales.</p>
            <Link className="primary-link" to="/estudiante/certificados">
              Consultar mis constancias →
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

function StudentTrajectory({ session }: { session: AuthProfile | null }) {
  const progress = useQuery({
    queryKey: ['progreso', 'propio'],
    queryFn: ({ signal }) => getMiProgreso(signal),
    enabled: session?.rol === 'ESTUDIANTE',
  });
  if (!session) return <Navigate to="/acceso" replace />;
  if (session.rol !== 'ESTUDIANTE') return <Navigate to={rolePath(session.rol)} replace />;
  if (progress.isPending) return <p role="status">Cargando tu plan de estudios…</p>;
  if (progress.isError)
    return (
      <p className="form-error" role="alert">
        {progress.error.message}
      </p>
    );

  const hasIcoF19Map = progress.data.plan.programa.clave === 'ICO-F19';

  return (
    <section className="student-trajectory-page" aria-labelledby="student-trajectory-title">
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">SIGA / ESTUDIANTE</p>
          <h1 id="student-trajectory-title">Trayectoria académica</h1>
          <p>
            {progress.data.plan.programa.nombre} · {progress.data.plan.nombre} · versión{' '}
            {progress.data.plan.version}
          </p>
        </div>
        {hasIcoF19Map && (
          <Link className="outline-button" to="/estudiante/calificaciones">
            Ver mi avance
          </Link>
        )}
      </div>
      <MapaCurricularDinamico />
      {hasIcoF19Map && (
        <details className="profile-panel">
          <summary>Consultar mapa de referencia ICO-F19 (material complementario)</summary>
          <CurriculumOverview />
        </details>
      )}
    </section>
  );
}

export function App() {
  const location = useLocation();
  const queryClient = useQueryClient();
  useEffect(() => {
    setUnauthorizedHandler(() => {
      advanceSessionGeneration();
      const predicate = (query: { queryKey: readonly unknown[] }) =>
        !['session', 'health', 'verificacion-certificado'].includes(String(query.queryKey[0]));
      void queryClient.cancelQueries();
      queryClient.removeQueries({ predicate });
      clearTeacherDrafts();
      queryClient.setQueryData(['session'], null);
    });
    return () => setUnauthorizedHandler(undefined);
  }, [queryClient]);
  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (hasTeacherDrafts()) event.preventDefault();
    }
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 1000px)').matches,
  );
  const session = useQuery({
    queryKey: ['session'],
    queryFn: async ({ signal }) => {
      const next = await getSession(signal);
      if (signal.aborted) throw new DOMException('Consulta cancelada', 'AbortError');
      const previous = queryClient.getQueryData<AuthProfile | null>(['session']);
      if (previous && (previous.id !== next?.id || previous.csrfToken !== next.csrfToken)) {
        await clearPrivateQueries(queryClient);
      }
      return next;
    },
    retry: false,
    refetchInterval: 60000,
  });
  const current = session.data ?? null;
  const routeRole: Rol | null =
    location.pathname === '/estudiante' || location.pathname.startsWith('/estudiante/')
      ? 'ESTUDIANTE'
      : location.pathname === '/docente' || location.pathname.startsWith('/docente/')
        ? 'DOCENTE'
        : location.pathname === '/administracion' ||
            location.pathname.startsWith('/administracion/')
          ? 'ADMINISTRADOR'
          : null;
  const activeRole = current?.rol === routeRole ? current.rol : null;
  return (
    <div
      className={`site-shell ${activeRole ? 'site-shell-profile' : ''} ${sidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}
    >
      <a className="skip-link" href="#contenido">
        Ir al contenido
      </a>
      <header className="site-header">
        <Link
          to="/"
          className="brand"
          aria-label="SIGA, inicio"
          onClick={(event) => {
            if (
              location.pathname !== '/' &&
              hasTeacherDrafts() &&
              !window.confirm('Hay cambios sin guardar. ¿Deseas salir?')
            ) {
              event.preventDefault();
            }
          }}
        >
          <img src="/favicon.svg" alt="" width="42" height="42" />
          <span>
            <strong>SIGA</strong>
            <small>GESTIÓN ACADÉMICA</small>
          </span>
        </Link>
        <div className="header-actions">
          {session.isPending ? (
            <span className="header-session">Comprobando acceso…</span>
          ) : (
            <Link
              className="header-session"
              to={current ? rolePath(current.rol) : '/acceso'}
              onClick={(event) => {
                const target = current ? rolePath(current.rol) : '/acceso';
                if (
                  location.pathname !== target &&
                  hasTeacherDrafts() &&
                  !window.confirm('Hay cambios sin guardar. ¿Deseas salir?')
                ) {
                  event.preventDefault();
                }
              }}
            >
              {current ? 'Mi espacio' : 'Acceso'}
            </Link>
          )}
        </div>
      </header>
      <main
        id="contenido"
        className={
          activeRole ? `profile-main ${sidebarCollapsed ? 'is-sidebar-collapsed' : ''}` : undefined
        }
      >
        {activeRole && current && (
          <ProfileSidebar
            role={activeRole}
            session={current}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)}
          />
        )}
        <div className={activeRole ? 'profile-route-content' : undefined}>
          <Routes>
            <Route path="/" element={<Home session={current} />} />
            <Route path="/verificar/:codigo" element={<PublicCertificateVerification />} />
            <Route path="/recuperar-acceso" element={<RecuperarAcceso />} />
            <Route path="/cuenta" element={<PerfilVista session={current} />} />
            <Route path="/notificaciones" element={<NotificacionesVista session={current} />} />
            <Route
              path="/estudiante/horario"
              element={
                current?.rol === 'ESTUDIANTE' ? (
                  <HorarioPersonal session={current} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/estudiante/evaluaciones"
              element={<EvaluacionesEstudiante session={current} />}
            />
            <Route
              path="/estudiante/asistencia"
              element={<AsistenciaEstudianteVista session={current} />}
            />
            <Route
              path="/docente/horario"
              element={
                current?.rol === 'DOCENTE' ? (
                  <HorarioPersonal session={current} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/docente/grupos/:grupoId/seguimiento"
              element={<SeguimientoGrupo session={current} />}
            />
            <Route
              path="/administracion/horarios"
              element={<AdministracionHorarios session={current} />}
            />
            <Route
              path="/administracion/cancelaciones"
              element={<AdministracionCancelaciones session={current} />}
            />
            <Route
              path="/administracion/indicadores"
              element={<AdministracionIndicadores session={current} />}
            />
            <Route
              path="/administracion/recuperacion"
              element={<RecuperacionAdministrativa session={current} />}
            />
            <Route
              path="/acceso"
              element={
                session.isPending ? (
                  <p className="route-loading">Comprobando acceso…</p>
                ) : (
                  <Login session={current} />
                )
              }
            />
            <Route
              path="/estudiante"
              element={
                session.isPending ? (
                  <p className="route-loading">Comprobando acceso…</p>
                ) : (
                  <ProfilePage session={current} role="ESTUDIANTE" />
                )
              }
            />
            <Route
              path="/estudiante/matriculas"
              element={
                session.isPending ? (
                  <p className="route-loading">Comprobando acceso…</p>
                ) : (
                  <StudentMatriculas session={current} />
                )
              }
            />
            <Route
              path="/estudiante/calificaciones"
              element={
                session.isPending ? (
                  <p className="route-loading">Comprobando acceso…</p>
                ) : (
                  <StudentCalificaciones session={current} />
                )
              }
            />
            <Route
              path="/estudiante/trayectoria"
              element={
                session.isPending ? (
                  <p className="route-loading">Comprobando acceso…</p>
                ) : (
                  <StudentTrajectory session={current} />
                )
              }
            />
            <Route
              path="/estudiante/certificados"
              element={
                session.isPending ? (
                  <p className="route-loading">Comprobando acceso…</p>
                ) : (
                  <StudentCertificates session={current} />
                )
              }
            />
            <Route
              path="/docente"
              element={
                session.isPending ? (
                  <p className="route-loading">Comprobando acceso…</p>
                ) : (
                  <ProfilePage session={current} role="DOCENTE" />
                )
              }
            />
            <Route
              path="/administracion"
              element={
                session.isPending ? (
                  <p className="route-loading">Comprobando acceso…</p>
                ) : (
                  <ProfilePage session={current} role="ADMINISTRADOR" />
                )
              }
            />
            <Route
              path="/administracion/catalogos"
              element={
                session.isPending ? (
                  <p className="route-loading">Comprobando acceso…</p>
                ) : (
                  <CatalogManagement session={current} />
                )
              }
            />
            <Route
              path="/administracion/personas"
              element={
                session.isPending ? (
                  <p className="route-loading">Comprobando acceso…</p>
                ) : (
                  <PersonManagement session={current} />
                )
              }
            />
            <Route
              path="/administracion/oferta"
              element={
                session.isPending ? (
                  <p className="route-loading">Comprobando acceso…</p>
                ) : (
                  <OfertaManagement session={current} />
                )
              }
            />
            <Route
              path="/administracion/reportes"
              element={
                session.isPending ? (
                  <p className="route-loading">Comprobando acceso…</p>
                ) : (
                  <ReportsManagement session={current} />
                )
              }
            />
            <Route
              path="/docente/grupos"
              element={
                session.isPending ? (
                  <p className="route-loading">Comprobando acceso…</p>
                ) : (
                  <TeacherGroups session={current} />
                )
              }
            />
            <Route
              path="/docente/grupos/:grupoId/calificaciones"
              element={
                session.isPending ? (
                  <p className="route-loading">Comprobando acceso…</p>
                ) : (
                  <TeacherCalificaciones
                    key={`${current?.csrfToken ?? ''}:${location.pathname}`}
                    session={current}
                  />
                )
              }
            />
            <Route
              path="*"
              element={
                <section className="not-found">
                  <p className="eyebrow">PÁGINA NO ENCONTRADA</p>
                  <h1>Volvamos al inicio.</h1>
                  <p>La dirección que buscas no está disponible.</p>
                  <Link to="/" className="primary-link">
                    Ir al portal →
                  </Link>
                </section>
              }
            />
          </Routes>
        </div>
      </main>
      <footer>
        <span>
          SIGA <span className="footer-dot">·</span> Sistema Integral de Gestión Académica
        </span>
        <span>
          <span className="footer-dot">·</span> Gestión académica
        </span>
      </footer>
    </div>
  );
}
