import { useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthProfile } from '@siga/contracts';
import { getUsers } from '../services/auth';
import { getGrupos, getPeriodos } from '../services/oferta';
import { getCalificacionesGrupo } from '../services/calificaciones';
import {
  actualizarHorarios,
  configurarCancelacion,
  actualizarPerfil,
  capturarNotaParcial,
  completarRecuperacion,
  crearEvaluacion,
  crearSesion,
  generarRecuperacion,
  getAlertas,
  getEvaluacionesGrupo,
  getHorariosGrupo,
  getIndicadores,
  getMapa,
  getMiAsistencia,
  getMiHorario,
  getMisEvaluaciones,
  getNotificaciones,
  getSesionesGrupo,
  guardarAsistencia,
  marcarLeida,
  type Horario,
} from '../services/ampliacion';

const dias = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const minutes = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
function ErrorNotice({ error }: { error: Error | null }) {
  return error ? (
    <p className="form-error" role="alert">
      {error.message}
    </p>
  ) : null;
}
function Loading({ message = 'Cargando información…' }: { message?: string }) {
  return <p role="status">{message}</p>;
}
function SectionTitle({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <header className="catalog-heading">
      <div>
        <p className="eyebrow">{label}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <Link className="outline-button" to="/">
        Ir al portal
      </Link>
    </header>
  );
}
function RequireRole({
  session,
  role,
  children,
}: {
  session: AuthProfile | null;
  role: AuthProfile['rol'];
  children: React.ReactNode;
}) {
  if (!session) return <Navigate to="/acceso" replace />;
  return session.rol === role ? <>{children}</> : <Navigate to="/" replace />;
}

export function HorarioPersonal({ session }: { session: AuthProfile | null }) {
  const query = useQuery({
    queryKey: ['ampliacion', 'mi-horario'],
    queryFn: ({ signal }) => getMiHorario(signal),
    enabled: !!session && session.rol !== 'ADMINISTRADOR',
  });
  return (
    <section className="catalog-page academic-page">
      <SectionTitle
        label="SIGA / AGENDA"
        title="Mi horario de clases"
        description="Consulta los horarios asignados y las aulas de tus grupos activos."
      />
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorNotice error={query.error} />
      ) : query.data.length === 0 ? (
        <p className="profile-panel">Todavía no hay grupos programados.</p>
      ) : (
        <div className="profile-panel">
          <table className="extension-table">
            <thead>
              <tr>
                <th>Día</th>
                <th>Horario</th>
                <th>Asignatura y grupo</th>
                <th>Aula</th>
                <th>Periodo</th>
              </tr>
            </thead>
            <tbody>
              {query.data
                .flatMap((g) => g.horarios.map((h) => ({ ...h, g })))
                .sort((a, b) => a.diaSemana - b.diaSemana || a.inicioMinuto - b.inicioMinuto)
                .map((h, idx) => (
                  <tr key={`${h.g.grupoId}:${h.diaSemana}:${h.inicioMinuto}:${idx}`}>
                    <td>{dias[h.diaSemana]}</td>
                    <td>
                      {minutes(h.inicioMinuto)}–{minutes(h.finMinuto)}
                    </td>
                    <td>
                      {h.g.asignatura} · {h.g.grupo}
                    </td>
                    <td>{h.aula}</td>
                    <td>{h.g.periodo}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {query.data.every((g) => g.horarios.length === 0) && (
            <p>No se han asignado franjas horarias a tus grupos.</p>
          )}
        </div>
      )}
    </section>
  );
}

export function MapaCurricularDinamico() {
  const query = useQuery({
    queryKey: ['ampliacion', 'mapa'],
    queryFn: ({ signal }) => getMapa(signal),
  });
  const [filtro, setFiltro] = useState('TODAS');
  const curso = useMemo(
    () => query.data?.asignaturas.filter((i) => filtro === 'TODAS' || i.estado === filtro) ?? [],
    [query.data, filtro],
  );
  if (query.isPending) return <Loading message="Consultando tu mapa curricular…" />;
  if (query.isError) return <ErrorNotice error={query.error} />;
  const subjects = query.data.asignaturas;
  const semestres = [...new Set(curso.map((s) => s.semestre))].sort((a, b) => a - b);
  return (
    <section className="profile-panel">
      <h2>Mapa inteligente de {query.data.plan.nombre}</h2>
      <p>
        Datos vinculados a tu plan y calificaciones registradas. Las materias bloqueadas indican
        prerrequisitos pendientes.
      </p>
      <div className="extension-kpis">
        {(['APROBADA', 'CURSANDO', 'DISPONIBLE', 'BLOQUEADA'] as const).map((estado) => (
          <div className="extension-kpi" key={estado}>
            <strong>{subjects.filter((c) => c.estado === estado).length}</strong>
            <span>{estado.toLowerCase()}</span>
          </div>
        ))}
      </div>
      <label>
        Filtrar asignaturas{' '}
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="TODAS">Todas</option>
          <option value="APROBADA">Aprobadas</option>
          <option value="CURSANDO">Cursando</option>
          <option value="DISPONIBLE">Disponibles</option>
          <option value="BLOQUEADA">Bloqueadas</option>
        </select>
      </label>
      {semestres.length ? (
        <div className="extension-semesters">
          {semestres.map((semestre) => (
            <article className="extension-semester" key={semestre}>
              <h3>Semestre {semestre}</h3>
              <ul>
                {curso
                  .filter((c) => c.semestre === semestre)
                  .map((c) => (
                    <li key={c.id}>
                      <strong>{c.clave}</strong> {c.nombre}
                      <span
                        className={`extension-status extension-status-${c.estado.toLowerCase()}`}
                      >
                        {c.estado}
                      </span>
                      <small>
                        {c.creditos} créditos
                        {c.prerequisitosPendientes.length
                          ? ` · ${c.prerequisitosPendientes.length} requisitos sin acreditar`
                          : ''}
                      </small>
                    </li>
                  ))}
              </ul>
            </article>
          ))}
        </div>
      ) : (
        <p>No hay materias con este filtro.</p>
      )}
    </section>
  );
}

export function EvaluacionesEstudiante({ session }: { session: AuthProfile | null }) {
  const q = useQuery({
    queryKey: ['ampliacion', 'mis-evaluaciones'],
    queryFn: ({ signal }) => getMisEvaluaciones(signal),
    enabled: session?.rol === 'ESTUDIANTE',
  });
  return (
    <RequireRole session={session} role="ESTUDIANTE">
      <section className="catalog-page academic-page">
        <SectionTitle
          label="SIGA / ESTUDIANTE"
          title="Mis evaluaciones"
          description="Parciales y componentes de la nota final con sus ponderaciones."
        />
        {q.isPending ? (
          <Loading />
        ) : q.isError ? (
          <ErrorNotice error={q.error} />
        ) : q.data.length ? (
          <div className="extension-semesters">
            {q.data.map((g) => (
              <article className="profile-panel" key={g.inscripcionId}>
                <h2>
                  {g.asignatura} · {g.grupo}
                </h2>
                <p>
                  Nota final: <strong>{g.notaFinal ?? 'Pendiente'}</strong>
                </p>
                {g.evaluaciones.length ? (
                  <table className="extension-table">
                    <thead>
                      <tr>
                        <th>Evaluación</th>
                        <th>Peso</th>
                        <th>Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.evaluaciones.map((e, idx) => (
                        <tr key={idx}>
                          <td>{e.nombre}</td>
                          <td>{e.ponderacion}%</td>
                          <td>{e.nota ?? 'Pendiente'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>
                    El docente todavía no ha configurado evaluaciones parciales para este grupo.
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="profile-panel">Sin evaluaciones registradas.</p>
        )}
      </section>
    </RequireRole>
  );
}

export function AsistenciaEstudianteVista({ session }: { session: AuthProfile | null }) {
  const q = useQuery({
    queryKey: ['ampliacion', 'mi-asistencia'],
    queryFn: ({ signal }) => getMiAsistencia(signal),
    enabled: session?.rol === 'ESTUDIANTE',
  });
  return (
    <RequireRole session={session} role="ESTUDIANTE">
      <section className="catalog-page academic-page">
        <SectionTitle
          label="SIGA / ESTUDIANTE"
          title="Registro de asistencia"
          description="Consulta tu asistencia por grupo, según las sesiones registradas por el docente."
        />
        {q.isPending ? (
          <Loading />
        ) : q.isError ? (
          <ErrorNotice error={q.error} />
        ) : q.data.length ? (
          <div className="extension-semesters">
            {q.data.map((g, idx) => (
              <article className="profile-panel" key={idx}>
                <h2>
                  {g.asignatura} · {g.grupo}
                </h2>
                <p>
                  <strong>{g.porcentaje === null ? 'Sin sesiones' : `${g.porcentaje}%`}</strong> ·{' '}
                  {g.presentes}/{g.total} asistencias
                </p>
                <ul>
                  {g.sesiones.map((s, n) => (
                    <li key={n}>
                      {s.fecha} · {s.tema} ·{' '}
                      {s.presente === null ? 'Sin registrar' : s.presente ? 'Presente' : 'Ausente'}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : (
          <p className="profile-panel">No hay datos de asistencia.</p>
        )}
      </section>
    </RequireRole>
  );
}

export function NotificacionesVista({ session }: { session: AuthProfile | null }) {
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ['ampliacion', 'notificaciones'],
    queryFn: ({ signal }) => getNotificaciones(signal),
    enabled: !!session,
  });
  const mark = useMutation({
    mutationFn: (id: string) => marcarLeida(session!.csrfToken, id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['ampliacion', 'notificaciones'] }),
  });
  if (!session) return <Navigate to="/acceso" replace />;
  return (
    <section className="catalog-page academic-page">
      <SectionTitle
        label="SIGA / COMUNICACIONES"
        title="Notificaciones"
        description="Avisos relacionados con inscripciones, calificaciones y disponibilidad de grupos."
      />
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorNotice error={q.error} />
      ) : q.data.length ? (
        <ul className="extension-notifications">
          {q.data.map((item) => (
            <li key={item.id} className={`profile-panel ${item.leidaEn ? 'extension-read' : ''}`}>
              <div>
                <h2>{item.titulo}</h2>
                <time>{new Date(item.creadoEn).toLocaleString('es-MX')}</time>
                <p>{item.mensaje}</p>
              </div>
              {!item.leidaEn && (
                <button
                  className="small-button"
                  disabled={mark.isPending}
                  onClick={() => mark.mutate(item.id)}
                >
                  Marcar como leída
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="profile-panel">No tienes notificaciones.</p>
      )}
      <ErrorNotice error={mark.error} />
    </section>
  );
}

export function PerfilVista({ session }: { session: AuthProfile | null }) {
  const client = useQueryClient();
  const [nombre, setNombre] = useState(session?.persona?.nombre ?? '');
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const save = useMutation({
    mutationFn: (data: { nombre?: string; passwordActual?: string; passwordNueva?: string }) =>
      actualizarPerfil(session!.csrfToken, data),
    onSuccess: async () => {
      setPasswordActual('');
      setPasswordNueva('');
      await client.invalidateQueries({ queryKey: ['session'] });
    },
  });
  if (!session) return <Navigate to="/acceso" replace />;
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    save.mutate({
      ...(session!.rol !== 'ADMINISTRADOR' && nombre.trim() !== session!.persona?.nombre
        ? { nombre: nombre.trim() }
        : {}),
      ...(passwordNueva ? { passwordNueva, passwordActual } : {}),
    });
  }
  return (
    <section className="catalog-page academic-page">
      <SectionTitle
        label="SIGA / MI CUENTA"
        title="Datos personales y seguridad"
        description="Actualiza tus datos permitidos y cambia tu contraseña con verificación de la actual."
      />
      <form className="profile-panel extension-form" onSubmit={submit}>
        <p>
          Correo: <strong>{session.correo}</strong> · Rol: {session.rol}
        </p>
        {session.rol !== 'ADMINISTRADOR' && (
          <label>
            Nombre visible
            <input
              required
              minLength={3}
              maxLength={160}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>
        )}
        <label>
          Contraseña actual
          <input
            type="password"
            autoComplete="current-password"
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
          />
        </label>
        <label>
          Contraseña nueva (mínimo 12 caracteres)
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
          />
        </label>
        <button
          className="primary-link"
          disabled={
            save.isPending ||
            (!passwordNueva &&
              (session.rol === 'ADMINISTRADOR' || nombre.trim() === session.persona?.nombre))
          }
        >
          Guardar cambios
        </button>
        <ErrorNotice error={save.error} />
        {save.isSuccess && (
          <p className="form-success" role="status">
            Perfil actualizado.
          </p>
        )}
      </form>
    </section>
  );
}

export function RecuperarAcceso() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const mutation = useMutation({ mutationFn: () => completarRecuperacion(token, password) });
  return (
    <section className="catalog-page academic-page">
      <SectionTitle
        label="SIGA / SEGURIDAD"
        title="Recuperar mi acceso"
        description="Solicita un código de recuperación al administrador. El código dura 30 minutos y sirve una sola vez."
      />
      <form
        className="profile-panel extension-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <label>
          Código de recuperación
          <input
            value={token}
            required
            pattern="[a-f0-9]{64}"
            maxLength={64}
            onChange={(e) => setToken(e.target.value.trim())}
            autoComplete="off"
          />
        </label>
        <label>
          Nueva contraseña (mínimo 12 caracteres)
          <input
            type="password"
            minLength={12}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <button className="primary-link" disabled={mutation.isPending}>
          Cambiar contraseña
        </button>
        <ErrorNotice error={mutation.error} />
        {mutation.isSuccess && (
          <p className="form-success" role="status">
            Contraseña actualizada. <Link to="/acceso">Iniciar sesión</Link>
          </p>
        )}
      </form>
    </section>
  );
}

export function AdministracionIndicadores({ session }: { session: AuthProfile | null }) {
  const q = useQuery({
    queryKey: ['ampliacion', 'indicadores'],
    queryFn: ({ signal }) => getIndicadores(signal),
    enabled: session?.rol === 'ADMINISTRADOR',
  });
  const alerts = useQuery({
    queryKey: ['ampliacion', 'alertas'],
    queryFn: ({ signal }) => getAlertas(signal),
    enabled: session?.rol === 'ADMINISTRADOR',
  });
  return (
    <RequireRole session={session} role="ADMINISTRADOR">
      <section className="catalog-page academic-page">
        <SectionTitle
          label="SIGA / ADMINISTRACIÓN"
          title="Indicadores y alertas académicas"
          description="Análisis descriptivo de la actividad académica y señales para acompañamiento estudiantil."
        />
        {q.isPending ? (
          <Loading />
        ) : q.isError ? (
          <ErrorNotice error={q.error} />
        ) : (
          <>
            <section className="extension-kpis" aria-label="Indicadores de la universidad">
              {Object.entries(q.data.resumen).map(([name, value]) => (
                <div className="extension-kpi" key={name}>
                  <strong>{value}</strong>
                  <span>
                    {(
                      {
                        periodosAbiertos: 'periodos abiertos',
                        inscripciones: 'inscripciones vigentes',
                      } as Record<string, string>
                    )[name] ?? name}
                  </span>
                </div>
              ))}
            </section>
            <section className="profile-panel">
              <h2>Estudiantes por programa</h2>
              <ul>
                {q.data.porPrograma.map((p) => (
                  <li key={p.nombre}>
                    {p.nombre}: <strong>{p.estudiantes}</strong>
                  </li>
                ))}
              </ul>
            </section>
            <section className="profile-panel">
              <h2>Ocupación de grupos recientes</h2>
              <div className="extension-table-scroll">
                <table className="extension-table">
                  <thead>
                    <tr>
                      <th>Grupo</th>
                      <th>Programa</th>
                      <th>Materia</th>
                      <th>Inscritos / cupo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.ocupacion.map((g) => (
                      <tr key={g.id}>
                        <td>{g.grupo}</td>
                        <td>{g.programa}</td>
                        <td>{g.asignatura}</td>
                        <td>
                          {g.inscritos}/{g.cupo}
                          <progress
                            value={g.inscritos}
                            max={g.cupo}
                            aria-label={`Ocupación de ${g.grupo}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
        <section className="profile-panel">
          <h2>Alertas de seguimiento</h2>
          <p>
            Criterios orientativos (no son sanciones): al menos dos reprobaciones o promedio
            inferior a 7 con tres notas o más. Requieren revisión humana.
          </p>
          {alerts.isPending ? (
            <Loading />
          ) : alerts.isError ? (
            <ErrorNotice error={alerts.error} />
          ) : alerts.data.length ? (
            <table className="extension-table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Programa</th>
                  <th>Motivos</th>
                </tr>
              </thead>
              <tbody>
                {alerts.data.map((a) => (
                  <tr key={a.estudianteId}>
                    <td>
                      {a.matricula} · {a.nombre}
                    </td>
                    <td>{a.programa}</td>
                    <td>{a.motivos.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No se detectaron alertas con los criterios actuales.</p>
          )}
        </section>
      </section>
    </RequireRole>
  );
}

export function AdministracionHorarios({ session }: { session: AuthProfile | null }) {
  const client = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState('');
  const [edits, setEdits] = useState<Record<string, Horario[]>>({});
  const [dia, setDia] = useState(1);
  const [inicio, setInicio] = useState('08:00');
  const [fin, setFin] = useState('09:00');
  const [aula, setAula] = useState('');
  const groups = useQuery({
    queryKey: ['ampliacion', 'grupos-admin', q, page],
    queryFn: ({ signal }) => getGrupos(q, page, 30, signal),
    enabled: session?.rol === 'ADMINISTRADOR',
  });
  const existing = useQuery({
    queryKey: ['ampliacion', 'horario-grupo', selected],
    queryFn: ({ signal }) => getHorariosGrupo(selected, signal),
    enabled: !!selected,
  });
  const horarios = edits[selected] ?? existing.data ?? [];
  const setHorarios = (next: Horario[] | ((current: Horario[]) => Horario[])) =>
    setEdits((previous) => ({
      ...previous,
      [selected]:
        typeof next === 'function' ? next(previous[selected] ?? existing.data ?? []) : next,
    }));
  const save = useMutation({
    mutationFn: () => actualizarHorarios(session!.csrfToken, selected, horarios),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['ampliacion', 'horario-grupo', selected] });
      setEdits((previous) => {
        const next = { ...previous };
        delete next[selected];
        return next;
      });
    },
  });
  return (
    <RequireRole session={session} role="ADMINISTRADOR">
      <section className="catalog-page academic-page">
        <SectionTitle
          label="SIGA / OFERTA"
          title="Programación de horarios"
          description="Configura las clases semanales por grupo. Se validan cruces de docente, aula y estudiantes ya inscritos."
        />
        <section className="profile-panel extension-form">
          <label>
            Buscar grupo
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
                setSelected('');
              }}
              placeholder="Clave o asignatura"
            />
          </label>
          {groups.isPending ? (
            <Loading />
          ) : groups.isError ? (
            <ErrorNotice error={groups.error} />
          ) : (
            <>
              <label>
                Seleccionar grupo
                <select
                  value={selected}
                  onChange={(e) => {
                    setSelected(e.target.value);
                  }}
                >
                  <option value="">Selecciona uno…</option>
                  {groups.data.items.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.clave} · {g.asignatura.nombre} · {g.periodo.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <div className="catalog-pagination">
                <button
                  className="small-button"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </button>
                <span>
                  Página {page} de {Math.max(1, Math.ceil(groups.data.total / 30))}
                </span>
                <button
                  className="small-button"
                  disabled={page * 30 >= groups.data.total}
                  onClick={() => setPage(page + 1)}
                >
                  Siguiente
                </button>
              </div>
            </>
          )}
        </section>
        {selected && (
          <section className="profile-panel">
            <h2>Franjas horarias</h2>
            {existing.isPending ? (
              <Loading />
            ) : existing.isError ? (
              <ErrorNotice error={existing.error} />
            ) : (
              <>
                <ul className="extension-notifications">
                  {horarios.map((h, idx) => (
                    <li key={idx}>
                      {dias[h.diaSemana]} · {minutes(h.inicioMinuto)}–{minutes(h.finMinuto)} · Aula{' '}
                      {h.aula}{' '}
                      <button
                        className="small-button"
                        onClick={() => setHorarios(horarios.filter((_, i) => i !== idx))}
                      >
                        Eliminar
                      </button>
                    </li>
                  ))}
                </ul>
                <form
                  className="extension-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (toMinutes(fin) <= toMinutes(inicio)) return;
                    setHorarios((h) => [
                      ...h,
                      {
                        diaSemana: dia,
                        inicioMinuto: toMinutes(inicio),
                        finMinuto: toMinutes(fin),
                        aula: aula.trim(),
                      },
                    ]);
                    setAula('');
                  }}
                >
                  <div className="extension-form-row">
                    <label>
                      Día
                      <select value={dia} onChange={(e) => setDia(Number(e.target.value))}>
                        {dias.slice(1).map((d, i) => (
                          <option value={i + 1} key={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Inicio
                      <input
                        type="time"
                        required
                        value={inicio}
                        onChange={(e) => setInicio(e.target.value)}
                      />
                    </label>
                    <label>
                      Fin
                      <input
                        type="time"
                        required
                        value={fin}
                        min={inicio}
                        onChange={(e) => setFin(e.target.value)}
                      />
                    </label>
                    <label>
                      Aula
                      <input
                        required
                        maxLength={80}
                        value={aula}
                        onChange={(e) => setAula(e.target.value)}
                      />
                    </label>
                  </div>
                  <button className="small-button">Añadir franja</button>
                </form>
                <button
                  className="primary-link"
                  disabled={save.isPending}
                  onClick={() => save.mutate()}
                >
                  Guardar horario del grupo
                </button>
                <ErrorNotice error={save.error} />
                {save.isSuccess && (
                  <p role="status" className="form-success">
                    Horario guardado.
                  </p>
                )}
              </>
            )}
          </section>
        )}
      </section>
    </RequireRole>
  );
}

export function RecuperacionAdministrativa({ session }: { session: AuthProfile | null }) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState('');
  const users = useQuery({
    queryKey: ['ampliacion', 'usuarios', q],
    queryFn: ({ signal }) => getUsers(q, 1, signal),
    enabled: session?.rol === 'ADMINISTRADOR',
  });
  const generate = useMutation({
    mutationFn: () => generarRecuperacion(session!.csrfToken, selected),
  });
  return (
    <RequireRole session={session} role="ADMINISTRADOR">
      <section className="catalog-page academic-page">
        <SectionTitle
          label="SIGA / SEGURIDAD"
          title="Recuperación asistida"
          description="Genera códigos individuales de un solo uso para cuentas activas; entrega el código por un canal privado tras verificar la identidad."
        />
        <section className="profile-panel extension-form">
          <label>
            Buscar usuario por correo
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSelected('');
                generate.reset();
              }}
            />
          </label>
          {users.isPending ? (
            <Loading />
          ) : users.isError ? (
            <ErrorNotice error={users.error} />
          ) : (
            <label>
              Cuenta activa
              <select
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  generate.reset();
                }}
              >
                <option value="">Seleccionar cuenta…</option>
                {users.data.items
                  .filter((u) => u.activo)
                  .map((user) => (
                    <option value={user.id} key={user.id}>
                      {user.correo} ({user.rol})
                    </option>
                  ))}
              </select>
            </label>
          )}
          <button
            className="primary-link"
            disabled={!selected || generate.isPending}
            onClick={() => generate.mutate()}
          >
            Crear código de recuperación
          </button>
          <ErrorNotice error={generate.error} />
          {generate.isSuccess && (
            <div role="status">
              <p>
                Código de un solo uso (válido hasta{' '}
                {new Date(generate.data.expiraEn).toLocaleString('es-MX')}):
              </p>
              <code className="extension-secret">{generate.data.token}</code>
              <p>{generate.data.aviso}</p>
            </div>
          )}
        </section>
      </section>
    </RequireRole>
  );
}

export function SeguimientoGrupo({ session }: { session: AuthProfile | null }) {
  const { grupoId = '' } = useParams();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [nombre, setNombre] = useState('');
  const [peso, setPeso] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [tema, setTema] = useState('');
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [sesionId, setSesionId] = useState('');
  const roster = useQuery({
    queryKey: ['ampliacion', 'roster', grupoId, page],
    queryFn: ({ signal }) => getCalificacionesGrupo(grupoId, '', page, 100, signal),
    enabled: session?.rol === 'DOCENTE' && !!grupoId,
  });
  const evaluations = useQuery({
    queryKey: ['ampliacion', 'evaluaciones', grupoId],
    queryFn: ({ signal }) => getEvaluacionesGrupo(grupoId, signal),
    enabled: session?.rol === 'DOCENTE' && !!grupoId,
  });
  const sessions = useQuery({
    queryKey: ['ampliacion', 'sesiones', grupoId],
    queryFn: ({ signal }) => getSesionesGrupo(grupoId, signal),
    enabled: session?.rol === 'DOCENTE' && !!grupoId,
  });
  const createEval = useMutation({
    mutationFn: () => crearEvaluacion(session!.csrfToken, grupoId, nombre, Number(peso)),
    onSuccess: async () => {
      setNombre('');
      setPeso('');
      await client.invalidateQueries({ queryKey: ['ampliacion', 'evaluaciones', grupoId] });
    },
  });
  const saveGrade = useMutation({
    mutationFn: ({
      evaluationId,
      inscripcionId,
      nota,
      motivo,
    }: {
      evaluationId: string;
      inscripcionId: string;
      nota: string;
      motivo?: string;
    }) => capturarNotaParcial(session!.csrfToken, evaluationId, inscripcionId, nota, motivo),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['ampliacion', 'evaluaciones', grupoId] }),
        client.invalidateQueries({ queryKey: ['ampliacion', 'roster', grupoId] }),
      ]);
    },
  });
  const createClass = useMutation({
    mutationFn: () => crearSesion(session!.csrfToken, grupoId, fecha, tema),
    onSuccess: async () => {
      setTema('');
      await client.invalidateQueries({ queryKey: ['ampliacion', 'sesiones', grupoId] });
    },
  });
  const saveAttendance = useMutation({
    mutationFn: ({ inscripcionId, presente }: { inscripcionId: string; presente: boolean }) =>
      guardarAsistencia(session!.csrfToken, sesionId, inscripcionId, presente),
    onSuccess: () => client.invalidateQueries({ queryKey: ['ampliacion', 'sesiones', grupoId] }),
  });
  const currentSession = sessions.data?.find((s) => s.id === sesionId);
  return (
    <RequireRole session={session} role="DOCENTE">
      <section className="catalog-page academic-page">
        <SectionTitle
          label="SIGA / DOCENTE"
          title="Evaluaciones y asistencia"
          description="Registra parciales ponderados y sesiones de clase; los resultados calculan automáticamente la nota final al completar el 100%."
        />
        <Link className="outline-button" to={`/docente/grupos/${grupoId}/calificaciones`}>
          Ir a notas finales
        </Link>
        <section className="profile-panel">
          <h2>Configurar evaluaciones parciales</h2>
          {evaluations.isPending ? (
            <Loading />
          ) : evaluations.isError ? (
            <ErrorNotice error={evaluations.error} />
          ) : (
            <>
              <ul>
                {evaluations.data.map((e) => (
                  <li key={e.id}>
                    {e.nombre} · {e.ponderacion}%
                  </li>
                ))}
              </ul>
              <p>
                Ponderación acumulada:{' '}
                <strong>
                  {evaluations.data.reduce((sum, e) => sum + Number(e.ponderacion), 0).toFixed(2)}%
                </strong>
                . La configuración no puede superar el 100%.
              </p>
              <form
                className="extension-form-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  createEval.mutate();
                }}
              >
                <label>
                  Evaluación
                  <input
                    required
                    maxLength={120}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Parcial 1"
                  />
                </label>
                <label>
                  Ponderación (%)
                  <input
                    required
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={peso}
                    onChange={(e) => setPeso(e.target.value)}
                  />
                </label>
                <button className="small-button" disabled={createEval.isPending}>
                  Agregar evaluación
                </button>
              </form>
              <ErrorNotice error={createEval.error} />
            </>
          )}
        </section>
        <section className="profile-panel">
          <h2>Capturar notas parciales</h2>
          {roster.isPending ? (
            <Loading />
          ) : roster.isError ? (
            <ErrorNotice error={roster.error} />
          ) : evaluations.isPending ? (
            <Loading />
          ) : (
            <>
              {roster.data.items.length === 0 && <p>Sin estudiantes para calificar.</p>}
              {evaluations.data?.length === 0 && <p>Configura primero las evaluaciones.</p>}
              {roster.data.items.map((item) => (
                <div className="extension-grade-student" key={item.inscripcionId}>
                  <h3>
                    {item.estudiante.matricula} · {item.estudiante.nombre}
                  </h3>
                  <p>Nota final: {item.notaFinal ?? 'Pendiente'}</p>
                  {evaluations.data?.map((ev) => {
                    const id = `${ev.id}:${item.inscripcionId}`;
                    const previous = ev.notas.find((n) => n.inscripcionId === item.inscripcionId);
                    return (
                      <form
                        key={ev.id}
                        className="extension-form-row"
                        onSubmit={(e) => {
                          e.preventDefault();
                          saveGrade.mutate({
                            evaluationId: ev.id,
                            inscripcionId: item.inscripcionId,
                            nota: notas[id] ?? previous?.nota ?? '',
                            motivo: motivos[id] || undefined,
                          });
                        }}
                      >
                        <label>
                          {ev.nombre} ({ev.ponderacion}%)
                          <input
                            type="number"
                            step="0.001"
                            min={roster.data.grupo.politica.escalaMinima}
                            max={roster.data.grupo.politica.escalaMaxima}
                            required
                            value={notas[id] ?? previous?.nota ?? ''}
                            onChange={(e) => setNotas((s) => ({ ...s, [id]: e.target.value }))}
                          />
                        </label>
                        {previous && (
                          <label>
                            Motivo para corregir
                            <input
                              value={motivos[id] ?? ''}
                              minLength={5}
                              maxLength={500}
                              placeholder="Requerido al corregir"
                              onChange={(e) => setMotivos((s) => ({ ...s, [id]: e.target.value }))}
                            />
                          </label>
                        )}
                        <button
                          className="small-button"
                          disabled={
                            saveGrade.isPending ||
                            (!!previous && !((motivos[id]?.trim().length ?? 0) >= 5))
                          }
                        >
                          Guardar parcial
                        </button>
                      </form>
                    );
                  })}
                </div>
              ))}
              <div className="catalog-pagination">
                <button
                  disabled={page <= 1}
                  className="small-button"
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </button>
                <span>
                  Página {page} · {roster.data.total} estudiantes
                </span>
                <button
                  className="small-button"
                  disabled={page * 100 >= roster.data.total}
                  onClick={() => setPage(page + 1)}
                >
                  Siguiente
                </button>
              </div>
            </>
          )}
          <ErrorNotice error={saveGrade.error} />
          {saveGrade.isSuccess && (
            <p role="status" className="form-success">
              Nota guardada.
            </p>
          )}
        </section>
        <section className="profile-panel">
          <h2>Control de asistencia</h2>
          <form
            className="extension-form-row"
            onSubmit={(e) => {
              e.preventDefault();
              createClass.mutate();
            }}
          >
            <label>
              Fecha
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </label>
            <label>
              Tema
              <input
                required
                maxLength={160}
                value={tema}
                onChange={(e) => setTema(e.target.value)}
              />
            </label>
            <button className="small-button" disabled={createClass.isPending}>
              Crear sesión
            </button>
          </form>
          <ErrorNotice error={createClass.error} />
          {sessions.isPending ? (
            <Loading />
          ) : sessions.isError ? (
            <ErrorNotice error={sessions.error} />
          ) : (
            <>
              <label>
                Sesión a gestionar
                <select value={sesionId} onChange={(e) => setSesionId(e.target.value)}>
                  <option value="">Seleccionar sesión…</option>
                  {sessions.data.map((s) => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.fecha).toISOString().slice(0, 10)} · {s.tema}
                    </option>
                  ))}
                </select>
              </label>
              {currentSession && (
                <div className="extension-attendance-list">
                  {roster.data?.items.map((person) => {
                    const saved = currentSession.registros.find(
                      (r) => r.inscripcionId === person.inscripcionId,
                    );
                    return (
                      <div key={person.inscripcionId}>
                        <span>{person.estudiante.nombre}</span>
                        <span>
                          {saved ? (saved.presente ? 'Presente' : 'Ausente') : 'Sin registrar'}
                        </span>
                        <button
                          className="small-button"
                          disabled={saveAttendance.isPending}
                          onClick={() =>
                            saveAttendance.mutate({
                              inscripcionId: person.inscripcionId,
                              presente: true,
                            })
                          }
                        >
                          Presente
                        </button>
                        <button
                          className="small-button"
                          disabled={saveAttendance.isPending}
                          onClick={() =>
                            saveAttendance.mutate({
                              inscripcionId: person.inscripcionId,
                              presente: false,
                            })
                          }
                        >
                          Ausente
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
          <ErrorNotice error={saveAttendance.error} />
        </section>
      </section>
    </RequireRole>
  );
}

export function AdministracionCancelaciones({ session }: { session: AuthProfile | null }) {
  const client = useQueryClient();
  const [periodoId, setPeriodoId] = useState('');
  const periodos = useQuery({
    queryKey: ['ampliacion', 'periodos'],
    queryFn: ({ signal }) => getPeriodos('', 1, 100, signal),
    enabled: session?.rol === 'ADMINISTRADOR',
  });
  const current = periodos.data?.items.find((p) => p.id === periodoId);
  const [permitir, setPermitir] = useState(false);
  const save = useMutation({
    mutationFn: () => configurarCancelacion(session!.csrfToken, periodoId, permitir),
    onSuccess: () => client.invalidateQueries({ queryKey: ['ampliacion', 'periodos'] }),
  });
  return (
    <RequireRole session={session} role="ADMINISTRADOR">
      <section className="catalog-page academic-page">
        <SectionTitle
          label="SIGA / POLÍTICAS"
          title="Cancelación de matrículas"
          description="Autoriza o desautoriza las bajas voluntarias durante la ventana de inscripción. Las notas calificadas no pueden cancelarse."
        />
        <div className="profile-panel extension-form">
          <p>
            La política general de calificaciones no se modifica: se configura una excepción para
            cada periodo.
          </p>
          {periodos.isPending ? (
            <Loading />
          ) : periodos.isError ? (
            <ErrorNotice error={periodos.error} />
          ) : (
            <>
              <label>
                Periodo
                <select
                  value={periodoId}
                  onChange={(e) => {
                    setPeriodoId(e.target.value);
                    const p = periodos.data.items.find((i) => i.id === e.target.value);
                    setPermitir(p?.permiteCancelacionEstudiante ?? false);
                  }}
                >
                  <option value="">Selecciona el periodo…</option>
                  {periodos.data.items.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.clave} · {p.nombre}
                    </option>
                  ))}
                </select>
              </label>
              {current && (
                <>
                  <label className="extension-check">
                    <input
                      type="checkbox"
                      checked={permitir}
                      onChange={(e) => setPermitir(e.target.checked)}
                    />{' '}
                    Permitir que estudiantes cancelen matrículas pendientes
                  </label>
                  <p>
                    Estado: {current.estado}. Las bajas siguen bloqueadas fuera de la ventana de
                    inscripción.
                  </p>
                  <button
                    className="primary-link"
                    disabled={save.isPending}
                    onClick={() => save.mutate()}
                  >
                    Guardar política del periodo
                  </button>
                </>
              )}
            </>
          )}
          <ErrorNotice error={save.error} />
          {save.isSuccess && (
            <p className="form-success" role="status">
              Configuración guardada.
            </p>
          )}
        </div>
      </section>
    </RequireRole>
  );
}
