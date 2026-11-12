import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AuthProfile,
  EstadoEstudiante,
  PersonaDocente,
  PersonaEstudiante,
} from '@siga/contracts';
import { getPlanes } from '../services/catalogos';
import { PagedSelect } from './PagedSelect';
import {
  createDocente,
  createEstudiante,
  estadosEstudiante,
  getDocentes,
  getEstudiantes,
  updateDocente,
  updateEstudiante,
} from '../services/personas';

type Tab = 'estudiantes' | 'docentes';
const personTabs: Tab[] = ['estudiantes', 'docentes'];
type EstudianteForm = {
  id: string;
  correo: string;
  matricula: string;
  nombre: string;
  planId: string;
  fechaIngreso: string;
  estado: EstadoEstudiante;
};
type DocenteForm = {
  id: string;
  correo: string;
  numeroEmpleado: string;
  nombre: string;
  departamento: string;
  activo: boolean;
};

const emptyStudent = (): EstudianteForm => ({
  id: '',
  correo: '',
  matricula: '',
  nombre: '',
  planId: '',
  fechaIngreso: new Date().toISOString().slice(0, 10),
  estado: 'ACTIVO',
});
const emptyTeacher = (): DocenteForm => ({
  id: '',
  correo: '',
  numeroEmpleado: '',
  nombre: '',
  departamento: '',
  activo: true,
});

function FieldError({ message }: { message: string }) {
  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  );
}

function PageControls({
  page,
  pageSize,
  total,
  change,
}: {
  page: number;
  pageSize: number;
  total: number;
  change: (value: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="catalog-pagination" aria-label="Paginación">
      <span>
        {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} de {total}
      </span>
      <div>
        <button
          type="button"
          className="outline-button"
          disabled={page <= 1}
          onClick={() => change(page - 1)}
        >
          Anterior
        </button>
        <button
          type="button"
          className="outline-button"
          disabled={page >= pages}
          onClick={() => change(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

function studentLabel(state: EstadoEstudiante) {
  return state === 'ACTIVO' ? 'Activo' : state === 'INACTIVO' ? 'Inactivo' : 'Egresado';
}

export function PersonManagement({ session }: { session: AuthProfile | null }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('estudiantes');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [studentForm, setStudentForm] = useState<EstudianteForm>(emptyStudent);
  const [studentPlanFallback, setStudentPlanFallback] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [teacherForm, setTeacherForm] = useState<DocenteForm>(emptyTeacher);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const csrfToken = session?.csrfToken ?? '';
  const students = useQuery({
    queryKey: ['personas', 'estudiantes', search, page, includeInactive],
    queryFn: ({ signal }) => getEstudiantes(search, page, 10, signal, includeInactive),
    enabled: tab === 'estudiantes' && session?.rol === 'ADMINISTRADOR',
  });
  const teachers = useQuery({
    queryKey: ['personas', 'docentes', search, page, includeInactive],
    queryFn: ({ signal }) => getDocentes(search, page, 10, signal, includeInactive),
    enabled: tab === 'docentes' && session?.rol === 'ADMINISTRADOR',
  });
  const saveStudent = useMutation({
    mutationFn: () => {
      const { id, ...data } = studentForm;
      return id
        ? updateEstudiante(csrfToken, id, data)
        : createEstudiante(csrfToken, {
            correo: data.correo,
            matricula: data.matricula,
            nombre: data.nombre,
            planId: data.planId,
            fechaIngreso: data.fechaIngreso,
          });
    },
    onSuccess: async () => {
      setNotice(
        'Estudiante guardado. La cuenta no se activa ni recibe contraseña desde esta pantalla.',
      );
      setError('');
      setStudentForm(emptyStudent());
      await queryClient.invalidateQueries({ queryKey: ['personas', 'estudiantes'] });
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : 'No se pudo guardar.'),
  });
  const saveTeacher = useMutation({
    mutationFn: () => {
      const { id, ...data } = teacherForm;
      return id
        ? updateDocente(csrfToken, id, data)
        : createDocente(csrfToken, {
            correo: data.correo,
            numeroEmpleado: data.numeroEmpleado,
            nombre: data.nombre,
            departamento: data.departamento,
          });
    },
    onSuccess: async () => {
      setNotice(
        'Docente guardado. La cuenta no se activa ni recibe contraseña desde esta pantalla.',
      );
      setError('');
      setTeacherForm(emptyTeacher());
      await queryClient.invalidateQueries({ queryKey: ['personas', 'docentes'] });
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : 'No se pudo guardar.'),
  });

  if (!session) return <Navigate to="/acceso" replace />;
  if (session.rol !== 'ADMINISTRADOR') return <Navigate to="/" replace />;

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function startStudent(item?: PersonaEstudiante) {
    setNotice('');
    setError('');
    setStudentPlanFallback(
      item
        ? {
            id: item.planId,
            label: `${item.plan.programa.nombre} · ${item.plan.nombre} v${item.plan.version}`,
          }
        : null,
    );
    setStudentForm(
      item
        ? {
            id: item.id,
            correo: item.correo,
            matricula: item.matricula,
            nombre: item.nombre,
            planId: item.planId,
            fechaIngreso: item.fechaIngreso,
            estado: item.estado,
          }
        : emptyStudent(),
    );
  }

  function startTeacher(item?: PersonaDocente) {
    setNotice('');
    setError('');
    setTeacherForm(
      item
        ? {
            id: item.id,
            correo: item.correo,
            numeroEmpleado: item.numeroEmpleado,
            nombre: item.nombre,
            departamento: item.departamento,
            activo: item.activo,
          }
        : emptyTeacher(),
    );
  }

  function submitStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setError('');
    saveStudent.mutate();
  }

  function submitTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setError('');
    saveTeacher.mutate();
  }

  const studentItems = students.data?.items ?? [];
  const teacherItems = teachers.data?.items ?? [];

  function navigateTabs(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = personTabs.indexOf(tab);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? personTabs.length - 1
          : event.key === 'ArrowRight'
            ? (index + 1) % personTabs.length
            : (index - 1 + personTabs.length) % personTabs.length;
    const next = personTabs[nextIndex]!;
    setTab(next);
    setPage(1);
    setNotice('');
    setError('');
    event.currentTarget.querySelector<HTMLButtonElement>(`#person-tab-${next}`)?.focus();
  }

  return (
    <section className="catalog-page" aria-labelledby="person-title">
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN / E04-B</p>
          <h1 id="person-title">Estudiantes y docentes</h1>
          <p>Consulta y conserva los datos de las personas y su historial académico.</p>
        </div>
        <Link className="outline-button" to="/administracion">
          Volver a administración
        </Link>
      </div>

      <div className="profile-panel access-notice">
        <strong>Acceso por separado</strong>
        <p>
          Las cuentas nuevas quedan inactivas. Esta pantalla no crea ni muestra contraseñas; su
          provisión requiere un flujo seguro independiente. Las bajas revocan sesiones y conservan
          el historial.
        </p>
      </div>

      <div
        className="catalog-tabs"
        role="tablist"
        aria-label="Tipo de persona"
        onKeyDown={navigateTabs}
      >
        <button
          id="person-tab-estudiantes"
          type="button"
          role="tab"
          aria-selected={tab === 'estudiantes'}
          aria-controls="person-panel-estudiantes"
          tabIndex={tab === 'estudiantes' ? 0 : -1}
          className={tab === 'estudiantes' ? 'is-selected' : ''}
          onClick={() => {
            setTab('estudiantes');
            setPage(1);
            setNotice('');
            setError('');
          }}
        >
          Estudiantes
        </button>
        <button
          id="person-tab-docentes"
          type="button"
          role="tab"
          aria-selected={tab === 'docentes'}
          aria-controls="person-panel-docentes"
          tabIndex={tab === 'docentes' ? 0 : -1}
          className={tab === 'docentes' ? 'is-selected' : ''}
          onClick={() => {
            setTab('docentes');
            setPage(1);
            setNotice('');
            setError('');
          }}
        >
          Docentes
        </button>
      </div>

      {notice && (
        <p className="success-notice" role="status">
          {notice}
        </p>
      )}
      {error && <FieldError message={error} />}

      {tab === 'estudiantes' ? (
        <div
          className="person-layout"
          id="person-panel-estudiantes"
          role="tabpanel"
          aria-labelledby="person-tab-estudiantes"
        >
          <section className="profile-panel person-list" aria-labelledby="students-heading">
            <div className="person-panel-heading">
              <div>
                <h2 id="students-heading">Estudiantes registrados</h2>
                <p>Las matrículas y los planes conservan el historial de inscripciones.</p>
              </div>
              <button type="button" className="primary-link" onClick={() => startStudent()}>
                Nuevo estudiante
              </button>
            </div>
            <label className="search-field" htmlFor="student-search">
              Buscar estudiante
            </label>
            <input
              id="student-search"
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Nombre, matrícula o correo"
            />
            <label className="person-checkbox archived-toggle" htmlFor="student-archived">
              <input
                id="student-archived"
                type="checkbox"
                checked={includeInactive}
                onChange={(event) => {
                  setIncludeInactive(event.target.checked);
                  setPage(1);
                }}
              />
              Mostrar archivados
            </label>
            {students.isPending ? (
              <p>Cargando estudiantes…</p>
            ) : students.isError ? (
              <p role="alert">No se pudieron consultar los estudiantes.</p>
            ) : studentItems.length === 0 ? (
              <p>No hay estudiantes para mostrar.</p>
            ) : (
              <ul className="person-list-items">
                {studentItems.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.nombre}</strong>
                      <span>
                        {item.matricula} · {item.correo}
                      </span>
                      <span>
                        {item.plan.programa.nombre} · {item.plan.nombre} v{item.plan.version}
                      </span>
                      <span>
                        {studentLabel(item.estado)} ·{' '}
                        {item.accesoActivo ? 'Acceso activo' : 'Acceso inactivo'}
                        {' · '}
                        {item.historial.inscripciones} inscripciones
                      </span>
                    </div>
                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => startStudent(item)}
                    >
                      Editar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {students.data && (
              <PageControls
                page={students.data.page}
                pageSize={students.data.pageSize}
                total={students.data.total}
                change={setPage}
              />
            )}
          </section>

          <form
            className="profile-panel person-form"
            onSubmit={submitStudent}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && studentForm.id) {
                event.preventDefault();
                startStudent();
              }
            }}
          >
            <h2>{studentForm.id ? 'Editar estudiante' : 'Alta de estudiante'}</h2>
            <label htmlFor="student-name">Nombre completo</label>
            <input
              id="student-name"
              required
              maxLength={160}
              value={studentForm.nombre}
              onChange={(event) => setStudentForm({ ...studentForm, nombre: event.target.value })}
            />
            <label htmlFor="student-email">Correo</label>
            <input
              id="student-email"
              type="email"
              required
              maxLength={254}
              value={studentForm.correo}
              onChange={(event) => setStudentForm({ ...studentForm, correo: event.target.value })}
            />
            <label htmlFor="student-id">Matrícula</label>
            <input
              id="student-id"
              required
              maxLength={40}
              value={studentForm.matricula}
              onChange={(event) =>
                setStudentForm({ ...studentForm, matricula: event.target.value })
              }
            />
            <PagedSelect
              id="student-plan"
              label="Plan de estudio"
              value={studentForm.planId}
              onChange={(planId) => setStudentForm({ ...studentForm, planId })}
              fetchPage={getPlanes}
              queryKey={['catalogos', 'selector-planes']}
              optionLabel={(plan) => `${plan.programa.nombre} · ${plan.nombre} v${plan.version}`}
              include={(plan) => plan.activo || plan.id === studentForm.planId}
              fallback={studentPlanFallback}
            />
            <label htmlFor="student-entry">Fecha de ingreso</label>
            <input
              id="student-entry"
              type="date"
              required
              value={studentForm.fechaIngreso}
              onChange={(event) =>
                setStudentForm({ ...studentForm, fechaIngreso: event.target.value })
              }
            />
            {studentForm.id && (
              <>
                <label htmlFor="student-state">Estado académico</label>
                <select
                  id="student-state"
                  value={studentForm.estado}
                  onChange={(event) =>
                    setStudentForm({
                      ...studentForm,
                      estado: event.target.value as EstadoEstudiante,
                    })
                  }
                >
                  {estadosEstudiante.map((state) => (
                    <option key={state} value={state}>
                      {studentLabel(state)}
                    </option>
                  ))}
                </select>
              </>
            )}
            <div className="person-form-actions">
              {studentForm.id && (
                <button type="button" className="outline-button" onClick={() => startStudent()}>
                  Cancelar edición
                </button>
              )}
              <button type="submit" className="primary-link" disabled={saveStudent.isPending}>
                {saveStudent.isPending ? 'Guardando…' : 'Guardar estudiante'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div
          className="person-layout"
          id="person-panel-docentes"
          role="tabpanel"
          aria-labelledby="person-tab-docentes"
        >
          <section className="profile-panel person-list" aria-labelledby="teachers-heading">
            <div className="person-panel-heading">
              <div>
                <h2 id="teachers-heading">Docentes registrados</h2>
                <p>La baja conserva los grupos históricos y revoca las sesiones activas.</p>
              </div>
              <button type="button" className="primary-link" onClick={() => startTeacher()}>
                Nuevo docente
              </button>
            </div>
            <label className="search-field" htmlFor="teacher-search">
              Buscar docente
            </label>
            <input
              id="teacher-search"
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Nombre, empleado o correo"
            />
            <label className="person-checkbox archived-toggle" htmlFor="teacher-archived">
              <input
                id="teacher-archived"
                type="checkbox"
                checked={includeInactive}
                onChange={(event) => {
                  setIncludeInactive(event.target.checked);
                  setPage(1);
                }}
              />
              Mostrar archivados
            </label>
            {teachers.isPending ? (
              <p>Cargando docentes…</p>
            ) : teachers.isError ? (
              <p role="alert">No se pudieron consultar los docentes.</p>
            ) : teacherItems.length === 0 ? (
              <p>No hay docentes para mostrar.</p>
            ) : (
              <ul className="person-list-items">
                {teacherItems.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.nombre}</strong>
                      <span>
                        {item.numeroEmpleado} · {item.correo}
                      </span>
                      <span>{item.departamento}</span>
                      <span>
                        {item.activo ? 'Activo' : 'Inactivo'} ·{' '}
                        {item.accesoActivo ? 'Acceso activo' : 'Acceso inactivo'}
                        {' · '}
                        {item.gruposAsignados} grupos históricos
                      </span>
                    </div>
                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => startTeacher(item)}
                    >
                      Editar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {teachers.data && (
              <PageControls
                page={teachers.data.page}
                pageSize={teachers.data.pageSize}
                total={teachers.data.total}
                change={setPage}
              />
            )}
          </section>

          <form
            className="profile-panel person-form"
            onSubmit={submitTeacher}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && teacherForm.id) {
                event.preventDefault();
                startTeacher();
              }
            }}
          >
            <h2>{teacherForm.id ? 'Editar docente' : 'Alta de docente'}</h2>
            <label htmlFor="teacher-name">Nombre completo</label>
            <input
              id="teacher-name"
              required
              maxLength={160}
              value={teacherForm.nombre}
              onChange={(event) => setTeacherForm({ ...teacherForm, nombre: event.target.value })}
            />
            <label htmlFor="teacher-email">Correo</label>
            <input
              id="teacher-email"
              type="email"
              required
              maxLength={254}
              value={teacherForm.correo}
              onChange={(event) => setTeacherForm({ ...teacherForm, correo: event.target.value })}
            />
            <label htmlFor="teacher-number">Número de empleado</label>
            <input
              id="teacher-number"
              required
              maxLength={40}
              value={teacherForm.numeroEmpleado}
              onChange={(event) =>
                setTeacherForm({ ...teacherForm, numeroEmpleado: event.target.value })
              }
            />
            <label htmlFor="teacher-department">Departamento</label>
            <input
              id="teacher-department"
              required
              maxLength={160}
              value={teacherForm.departamento}
              onChange={(event) =>
                setTeacherForm({ ...teacherForm, departamento: event.target.value })
              }
            />
            {teacherForm.id && (
              <label className="person-checkbox" htmlFor="teacher-active">
                <input
                  id="teacher-active"
                  type="checkbox"
                  checked={teacherForm.activo}
                  onChange={(event) =>
                    setTeacherForm({ ...teacherForm, activo: event.target.checked })
                  }
                />
                Docente activo
              </label>
            )}
            <div className="person-form-actions">
              {teacherForm.id && (
                <button type="button" className="outline-button" onClick={() => startTeacher()}>
                  Cancelar edición
                </button>
              )}
              <button type="submit" className="primary-link" disabled={saveTeacher.isPending}>
                {saveTeacher.isPending ? 'Guardando…' : 'Guardar docente'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
