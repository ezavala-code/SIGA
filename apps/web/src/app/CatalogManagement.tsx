import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthProfile, CatalogoAsignatura, PlanCourse } from '@siga/contracts';
import {
  createAsignatura,
  createPlan,
  createPlanVersion,
  createPrograma,
  getAsignaturas,
  getPlan,
  getPlanes,
  getProgramas,
  updateAsignatura,
  updatePlan,
  updatePlanCourses,
  updatePrograma,
} from '../services/catalogos';

type CatalogTab = 'programas' | 'asignaturas' | 'planes';
const catalogTabs: CatalogTab[] = ['programas', 'asignaturas', 'planes'];

function FieldError({ message }: { message: string }) {
  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  );
}

function OptionPages({
  page,
  total,
  change,
  label,
}: {
  page: number;
  total: number;
  change: (page: number) => void;
  label: string;
}) {
  return (
    <nav aria-label={`Opciones de ${label}`}>
      <button type="button" disabled={page <= 1} onClick={() => change(page - 1)}>
        Anterior
      </button>
      <span>
        {' '}
        Página {page} de {Math.max(1, Math.ceil(total / 100))} · {total} resultados{' '}
      </span>
      <button type="button" disabled={page * 100 >= total} onClick={() => change(page + 1)}>
        Siguiente
      </button>
    </nav>
  );
}

export function CatalogManagement({ session }: { session: AuthProfile | null }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<CatalogTab>('programas');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [courseDraft, setCourseDraft] = useState<{
    planId: string;
    revision: number;
    asignaturas: PlanCourse[];
  } | null>(null);
  const [newSubjectId, setNewSubjectId] = useState('');
  const [programSearch, setProgramSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [programOptionsPage, setProgramOptionsPage] = useState(1);
  const [subjectOptionsPage, setSubjectOptionsPage] = useState(1);
  const [selectedProgram, setSelectedProgram] = useState<{
    id: string;
    clave: string;
    nombre: string;
  } | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<CatalogoAsignatura | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const csrfToken = session?.csrfToken ?? '';

  const programs = useQuery({
    queryKey: ['catalogos', 'programas', search, page, includeInactive],
    queryFn: ({ signal }) => getProgramas(search, page, 10, signal, includeInactive),
    enabled: session?.rol === 'ADMINISTRADOR',
  });
  const subjects = useQuery({
    queryKey: ['catalogos', 'asignaturas', search, page, includeInactive],
    queryFn: ({ signal }) => getAsignaturas(search, page, 10, signal, includeInactive),
    enabled: session?.rol === 'ADMINISTRADOR',
  });
  const programOptions = useQuery({
    queryKey: ['catalogos', 'programa-opciones', programSearch, programOptionsPage],
    queryFn: ({ signal }) => getProgramas(programSearch, programOptionsPage, 100, signal),
    enabled: session?.rol === 'ADMINISTRADOR',
  });
  const subjectOptions = useQuery({
    queryKey: ['catalogos', 'asignatura-opciones', subjectSearch, subjectOptionsPage],
    queryFn: ({ signal }) => getAsignaturas(subjectSearch, subjectOptionsPage, 100, signal),
    enabled: session?.rol === 'ADMINISTRADOR',
  });
  const plans = useQuery({
    queryKey: ['catalogos', 'planes', search, page, includeInactive],
    queryFn: ({ signal }) => getPlanes(search, page, 10, signal, includeInactive),
    enabled: session?.rol === 'ADMINISTRADOR',
  });
  const currentPlanId = selectedPlanId || plans.data?.items[0]?.id || '';
  const plan = useQuery({
    queryKey: ['catalogos', 'plan', currentPlanId],
    queryFn: ({ signal }) => getPlan(currentPlanId, signal),
    enabled: Boolean(currentPlanId) && session?.rol === 'ADMINISTRADOR',
  });
  const draftCourses =
    plan.data && courseDraft?.planId === plan.data.id && courseDraft.revision === plan.data.revision
      ? courseDraft.asignaturas
      : (plan.data?.asignaturas ?? []);

  if (!session) return <Navigate to="/acceso" replace />;
  if (session.rol !== 'ADMINISTRADOR') return <Navigate to="/" replace />;

  async function perform<T>(action: () => Promise<T>, success: string): Promise<T | undefined> {
    setError('');
    setNotice('');
    try {
      const result = await action();
      setNotice(success);
      await queryClient.invalidateQueries({ queryKey: ['catalogos'] });
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el cambio.');
      return undefined;
    }
  }

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  async function createProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const created = await perform(
      () =>
        createPrograma(csrfToken, {
          clave: String(data.get('clave')),
          nombre: String(data.get('nombre')),
        }),
      'Programa guardado.',
    );
    if (created) form.reset();
  }

  async function createSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const created = await perform(
      () =>
        createAsignatura(csrfToken, {
          clave: String(data.get('clave')),
          nombre: String(data.get('nombre')),
        }),
      'Asignatura guardada.',
    );
    if (created) form.reset();
  }

  async function createStudyPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const created = await perform(
      () =>
        createPlan(csrfToken, {
          programaId: String(data.get('programaId')),
          version: Number(data.get('version')),
          nombre: String(data.get('nombre')),
        }),
      'Plan creado.',
    );
    if (created) {
      setSelectedPlanId(created.id);
      setSelectedProgram(null);
      form.reset();
    }
  }

  function addSubject() {
    if (!newSubjectId || draftCourses.some((course) => course.asignaturaId === newSubjectId))
      return;
    const subject = selectedSubject?.id === newSubjectId ? selectedSubject : undefined;
    if (!subject) return;
    changeDraft((current) => [
      ...current,
      {
        asignaturaId: subject.id,
        creditos: '1.00',
        semestreSugerido: 1,
        prerrequisitos: [],
        asignatura: subject,
      },
    ]);
    setNewSubjectId('');
    setError('');
    setNotice('');
  }

  function changeDraft(update: (current: PlanCourse[]) => PlanCourse[]) {
    if (!plan.data) return;
    setCourseDraft({
      planId: plan.data.id,
      revision: plan.data.revision,
      asignaturas: update(draftCourses),
    });
  }

  async function savePlanContents() {
    if (!plan.data) return;
    await perform(async () => {
      const updated = await updatePlanCourses(
        csrfToken,
        plan.data!.id,
        plan.data!.revision,
        draftCourses,
      );
      queryClient.setQueryData(['catalogos', 'plan', updated.id], updated);
      return updated;
    }, 'Contenido del plan guardado.');
  }

  const currentPage =
    tab === 'programas' ? programs.data : tab === 'asignaturas' ? subjects.data : plans.data;
  const availableSubjects = (subjectOptions.data?.items ?? []).filter(
    (subject) =>
      subject.activo && !draftCourses.some((course) => course.asignaturaId === subject.id),
  );

  function navigateTabs(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = catalogTabs.indexOf(tab);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? catalogTabs.length - 1
          : event.key === 'ArrowRight'
            ? (index + 1) % catalogTabs.length
            : (index - 1 + catalogTabs.length) % catalogTabs.length;
    const next = catalogTabs[nextIndex]!;
    setTab(next);
    setPage(1);
    event.currentTarget.querySelector<HTMLButtonElement>(`#catalog-tab-${next}`)?.focus();
  }

  return (
    <section className="catalog-page" aria-labelledby="catalog-title">
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN ACADÉMICA / E04</p>
          <h1 id="catalog-title">Catálogos y planes</h1>
          <p>Organiza programas, asignaturas y sus relaciones curriculares.</p>
        </div>
        <Link className="outline-button" to="/administracion">
          Volver a administración
        </Link>
      </div>

      {notice && (
        <p className="form-success" role="status">
          {notice}
        </p>
      )}
      {error && <FieldError message={error} />}

      <div className="catalog-toolbar">
        <label htmlFor="catalog-search">
          Buscar en{' '}
          {tab === 'programas' ? 'programas' : tab === 'asignaturas' ? 'asignaturas' : 'planes'}
        </label>
        <input
          id="catalog-search"
          value={search}
          onChange={(event) => changeSearch(event.target.value)}
          maxLength={120}
          placeholder="Clave o nombre"
        />
        <label className="person-checkbox" htmlFor="catalog-archived">
          <input
            id="catalog-archived"
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => {
              setIncludeInactive(event.target.checked);
              setPage(1);
            }}
          />
          Mostrar archivados
        </label>
      </div>

      <div
        className="catalog-tabs"
        role="tablist"
        aria-label="Catálogos académicos"
        onKeyDown={navigateTabs}
      >
        {catalogTabs.map((item) => (
          <button
            key={item}
            id={`catalog-tab-${item}`}
            type="button"
            role="tab"
            aria-selected={tab === item}
            aria-controls={`catalog-panel-${item}`}
            tabIndex={tab === item ? 0 : -1}
            className={tab === item ? 'catalog-tab is-current' : 'catalog-tab'}
            onClick={() => {
              setTab(item);
              setPage(1);
            }}
          >
            {item === 'programas'
              ? 'Programas'
              : item === 'asignaturas'
                ? 'Asignaturas'
                : 'Planes de estudio'}
          </button>
        ))}
      </div>

      {tab === 'programas' && (
        <div
          className="catalog-columns"
          id="catalog-panel-programas"
          role="tabpanel"
          aria-labelledby="catalog-tab-programas"
        >
          <form
            className="catalog-panel catalog-form"
            onSubmit={(event) => void createProgram(event)}
          >
            <h2>Nuevo programa</h2>
            <label htmlFor="program-key">Clave</label>
            <input
              id="program-key"
              name="clave"
              required
              maxLength={40}
              pattern="[A-Za-z0-9][A-Za-z0-9._-]*"
            />
            <label htmlFor="program-name">Nombre</label>
            <input id="program-name" name="nombre" required maxLength={160} />
            <button className="primary-link" type="submit">
              Guardar programa
            </button>
          </form>
          <div className="catalog-panel">
            <h2>Programas registrados</h2>
            <CatalogLoading loading={programs.isPending} failed={programs.isError} />
            <ul className="catalog-list">
              {programs.data?.items.map((item) => (
                <li key={item.id}>
                  <div className="catalog-item-main">
                    <strong>{item.clave}</strong>
                    <span>{item.nombre}</span>
                  </div>
                  <div className="catalog-item-actions">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const data = new FormData(event.currentTarget);
                        void perform(
                          () =>
                            updatePrograma(session.csrfToken, item.id, {
                              nombre: String(data.get('nombre')),
                            }),
                          'Programa actualizado.',
                        );
                      }}
                    >
                      <label className="visually-hidden" htmlFor={`program-edit-${item.id}`}>
                        Editar {item.nombre}
                      </label>
                      <input
                        id={`program-edit-${item.id}`}
                        name="nombre"
                        defaultValue={item.nombre}
                        maxLength={160}
                        required
                      />
                      <button type="submit" className="small-button">
                        Guardar nombre
                      </button>
                    </form>
                    <button
                      type="button"
                      className="small-button"
                      onClick={() =>
                        void perform(
                          () =>
                            updatePrograma(session.csrfToken, item.id, { activo: !item.activo }),
                          item.activo ? 'Programa dado de baja.' : 'Programa reactivado.',
                        )
                      }
                    >
                      {item.activo ? 'Dar de baja' : 'Reactivar'}
                    </button>
                    <span className={item.activo ? 'catalog-state is-active' : 'catalog-state'}>
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'asignaturas' && (
        <div
          className="catalog-columns"
          id="catalog-panel-asignaturas"
          role="tabpanel"
          aria-labelledby="catalog-tab-asignaturas"
        >
          <form
            className="catalog-panel catalog-form"
            onSubmit={(event) => void createSubject(event)}
          >
            <h2>Nueva asignatura</h2>
            <label htmlFor="subject-key">Clave</label>
            <input
              id="subject-key"
              name="clave"
              required
              maxLength={40}
              pattern="[A-Za-z0-9][A-Za-z0-9._-]*"
            />
            <label htmlFor="subject-name">Nombre</label>
            <input id="subject-name" name="nombre" required maxLength={160} />
            <button className="primary-link" type="submit">
              Guardar asignatura
            </button>
          </form>
          <div className="catalog-panel">
            <h2>Asignaturas registradas</h2>
            <CatalogLoading loading={subjects.isPending} failed={subjects.isError} />
            <ul className="catalog-list">
              {subjects.data?.items.map((item) => (
                <li key={item.id}>
                  <div className="catalog-item-main">
                    <strong>{item.clave}</strong>
                    <span>{item.nombre}</span>
                  </div>
                  <div className="catalog-item-actions">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const data = new FormData(event.currentTarget);
                        void perform(
                          () =>
                            updateAsignatura(session.csrfToken, item.id, {
                              nombre: String(data.get('nombre')),
                            }),
                          'Asignatura actualizada.',
                        );
                      }}
                    >
                      <label className="visually-hidden" htmlFor={`subject-edit-${item.id}`}>
                        Editar {item.nombre}
                      </label>
                      <input
                        id={`subject-edit-${item.id}`}
                        name="nombre"
                        defaultValue={item.nombre}
                        maxLength={160}
                        required
                      />
                      <button type="submit" className="small-button">
                        Guardar nombre
                      </button>
                    </form>
                    <button
                      type="button"
                      className="small-button"
                      onClick={() =>
                        void perform(
                          () =>
                            updateAsignatura(session.csrfToken, item.id, { activo: !item.activo }),
                          item.activo ? 'Asignatura dada de baja.' : 'Asignatura reactivada.',
                        )
                      }
                    >
                      {item.activo ? 'Dar de baja' : 'Reactivar'}
                    </button>
                    <span className={item.activo ? 'catalog-state is-active' : 'catalog-state'}>
                      {item.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'planes' && (
        <div
          className="catalog-plan-layout"
          id="catalog-panel-planes"
          role="tabpanel"
          aria-labelledby="catalog-tab-planes"
        >
          <div className="catalog-panel">
            <h2>Planes registrados</h2>
            <CatalogLoading loading={plans.isPending} failed={plans.isError} />
            <ul className="catalog-list plan-list">
              {plans.data?.items.map((item) => (
                <li key={item.id} className={currentPlanId === item.id ? 'is-selected' : ''}>
                  <button
                    type="button"
                    className="plan-select"
                    onClick={() => setSelectedPlanId(item.id)}
                  >
                    <strong>
                      {item.programa.clave} · v{item.version}
                    </strong>
                    <span>{item.nombre}</span>
                    <small>
                      {item._count.asignaturas} asignaturas · {item._count.estudiantes} estudiantes
                    </small>
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="catalog-form catalog-new-plan"
              onSubmit={(event) => void createStudyPlan(event)}
            >
              <h3>Crear plan</h3>
              <label htmlFor="plan-program-search">Buscar programa por clave o nombre</label>
              <input
                id="plan-program-search"
                maxLength={120}
                value={programSearch}
                onChange={(event) => {
                  setProgramSearch(event.target.value);
                  setProgramOptionsPage(1);
                }}
              />
              {programOptions.isError && (
                <p role="alert">No se pudieron consultar los programas.</p>
              )}
              {programOptions.data && (
                <OptionPages
                  page={programOptionsPage}
                  total={programOptions.data.total}
                  change={setProgramOptionsPage}
                  label="programas"
                />
              )}
              <label htmlFor="plan-program">Programa activo</label>
              <select
                id="plan-program"
                name="programaId"
                required
                value={selectedProgram?.id ?? ''}
                onChange={(event) =>
                  setSelectedProgram(
                    programOptions.data?.items.find((item) => item.id === event.target.value) ??
                      null,
                  )
                }
              >
                <option value="" disabled>
                  Selecciona un programa
                </option>
                {selectedProgram &&
                  !programOptions.data?.items.some((item) => item.id === selectedProgram.id) && (
                    <option value={selectedProgram.id}>
                      {selectedProgram.clave} · {selectedProgram.nombre}
                    </option>
                  )}
                {programOptions.data?.items
                  .filter((item) => item.activo)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.clave} · {item.nombre}
                    </option>
                  ))}
              </select>
              <label htmlFor="plan-version">Versión</label>
              <input
                id="plan-version"
                name="version"
                type="number"
                min={1}
                max={9999}
                required
                defaultValue={1}
              />
              <label htmlFor="plan-name">Nombre del plan</label>
              <input id="plan-name" name="nombre" required maxLength={160} />
              <button className="primary-link" type="submit">
                Crear plan
              </button>
            </form>
          </div>

          {plan.data ? (
            <div className="catalog-panel plan-editor">
              <div className="plan-editor-heading">
                <div>
                  <p className="eyebrow">
                    {plan.data.programa.clave} / VERSIÓN {plan.data.version}
                  </p>
                  <h2>{plan.data.nombre}</h2>
                  <p>
                    Revisión {plan.data.revision} · {plan.data.asignaturas.length} asignaturas
                  </p>
                </div>
                <div className="catalog-item-actions">
                  <button
                    type="button"
                    className="small-button"
                    onClick={() =>
                      void perform(
                        async () => {
                          const updated = await updatePlan(session.csrfToken, plan.data!.id, {
                            activo: !plan.data!.activo,
                          });
                          queryClient.setQueryData(['catalogos', 'plan', updated.id], updated);
                          return updated;
                        },
                        plan.data.activo ? 'Plan dado de baja.' : 'Plan reactivado.',
                      )
                    }
                  >
                    {plan.data.activo ? 'Dar de baja' : 'Reactivar'}
                  </button>
                  <button
                    type="button"
                    className="small-button"
                    onClick={() =>
                      void perform(async () => {
                        const created = await createPlanVersion(session.csrfToken, plan.data!.id);
                        setSelectedPlanId(created.id);
                        queryClient.setQueryData(['catalogos', 'plan', created.id], created);
                        return created;
                      }, 'Nueva versión creada con el contenido del plan anterior.')
                    }
                  >
                    Crear nueva versión
                  </button>
                </div>
              </div>
              <p className="catalog-state">Estado: {plan.data.activo ? 'Activo' : 'Inactivo'}</p>
              {!plan.data.contenidoEditable && (
                <p className="form-error">
                  Este plan ya tiene estudiantes u oferta. Su contenido está protegido; crea una
                  nueva versión para editarlo.
                </p>
              )}
              {plan.data.asignaturas.length > 0 &&
                plan.data.asignaturas.some((course) => course.asignatura.activo === false) && (
                  <p className="form-error">
                    El plan conserva asignaturas que ya fueron dadas de baja; el historial se
                    mantiene.
                  </p>
                )}
              <label htmlFor="subject-option-search">Buscar asignatura por clave o nombre</label>
              <input
                id="subject-option-search"
                maxLength={120}
                value={subjectSearch}
                onChange={(event) => {
                  setSubjectSearch(event.target.value);
                  setSubjectOptionsPage(1);
                }}
              />
              {subjectOptions.isError && (
                <p role="alert">No se pudieron consultar las asignaturas.</p>
              )}
              {subjectOptions.data && (
                <OptionPages
                  page={subjectOptionsPage}
                  total={subjectOptions.data.total}
                  change={setSubjectOptionsPage}
                  label="asignaturas"
                />
              )}
              <label htmlFor="add-plan-subject">Agregar asignatura activa</label>
              <div className="plan-add-row">
                <select
                  id="add-plan-subject"
                  value={newSubjectId}
                  onChange={(event) => {
                    setNewSubjectId(event.target.value);
                    setSelectedSubject(
                      availableSubjects.find((item) => item.id === event.target.value) ?? null,
                    );
                  }}
                  disabled={!plan.data.contenidoEditable || !plan.data.activo}
                >
                  <option value="">Selecciona una asignatura</option>
                  {selectedSubject &&
                    newSubjectId &&
                    !availableSubjects.some((item) => item.id === selectedSubject.id) && (
                      <option value={selectedSubject.id}>
                        {selectedSubject.clave} · {selectedSubject.nombre}
                      </option>
                    )}
                  {availableSubjects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.clave} · {item.nombre}
                    </option>
                  ))}
                </select>
                <button
                  className="small-button"
                  type="button"
                  onClick={addSubject}
                  disabled={!newSubjectId}
                >
                  Agregar
                </button>
              </div>
              <div className="plan-course-list">
                {draftCourses.map((course) => (
                  <article className="plan-course" key={course.asignaturaId}>
                    <div className="plan-course-title">
                      <strong>
                        {course.asignatura.clave} · {course.asignatura.nombre}
                      </strong>
                      <button
                        className="text-button"
                        type="button"
                        disabled={!plan.data.contenidoEditable}
                        onClick={() =>
                          changeDraft((current) =>
                            current
                              .filter((item) => item.asignaturaId !== course.asignaturaId)
                              .map((item) => ({
                                ...item,
                                prerrequisitos: item.prerrequisitos.filter(
                                  (id) => id !== course.asignaturaId,
                                ),
                              })),
                          )
                        }
                      >
                        Quitar del borrador
                      </button>
                    </div>
                    <div className="plan-course-fields">
                      <label>
                        Créditos
                        <input
                          type="number"
                          min="0.01"
                          max="999999.99"
                          step="0.01"
                          value={course.creditos}
                          disabled={!plan.data.contenidoEditable}
                          onChange={(event) =>
                            changeDraft((current) =>
                              current.map((item) =>
                                item.asignaturaId === course.asignaturaId
                                  ? { ...item, creditos: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        Semestre sugerido
                        <input
                          type="number"
                          min={1}
                          max={30}
                          step={1}
                          value={course.semestreSugerido}
                          disabled={!plan.data.contenidoEditable}
                          onChange={(event) =>
                            changeDraft((current) =>
                              current.map((item) =>
                                item.asignaturaId === course.asignaturaId
                                  ? { ...item, semestreSugerido: Number(event.target.value) }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                    </div>
                    <label>
                      Prerrequisitos (puedes elegir varios)
                      <select
                        multiple
                        size={Math.min(5, Math.max(2, draftCourses.length - 1))}
                        value={course.prerrequisitos}
                        disabled={!plan.data.contenidoEditable}
                        onChange={(event) => {
                          const selected = Array.from(
                            event.currentTarget.selectedOptions,
                            (option) => option.value,
                          );
                          changeDraft((current) =>
                            current.map((item) =>
                              item.asignaturaId === course.asignaturaId
                                ? { ...item, prerrequisitos: selected }
                                : item,
                            ),
                          );
                        }}
                      >
                        {draftCourses
                          .filter((item) => item.asignaturaId !== course.asignaturaId)
                          .map((item) => (
                            <option key={item.asignaturaId} value={item.asignaturaId}>
                              {item.asignatura.clave} · {item.asignatura.nombre}
                            </option>
                          ))}
                      </select>
                    </label>
                  </article>
                ))}
                {!draftCourses.length && <p>Aún no hay asignaturas en este plan.</p>}
              </div>
              <button
                className="primary-link"
                type="button"
                onClick={() => void savePlanContents()}
                disabled={!plan.data.contenidoEditable || !plan.data.activo || plan.isFetching}
              >
                Guardar contenido del plan
              </button>
            </div>
          ) : (
            <div className="catalog-panel plan-editor">
              {plan.isPending && currentPlanId ? (
                <p>Cargando plan…</p>
              ) : (
                <p>Selecciona un plan o crea uno para comenzar.</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="catalog-pagination" aria-label="Paginación">
        <span>{currentPage ? `${currentPage.total} registros` : 'Cargando registros…'}</span>
        <div>
          <button
            type="button"
            className="small-button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
          >
            Anterior
          </button>
          <span>Página {page}</span>
          <button
            type="button"
            className="small-button"
            onClick={() => setPage((current) => current + 1)}
            disabled={!currentPage || page * currentPage.pageSize >= currentPage.total}
          >
            Siguiente
          </button>
        </div>
      </div>
    </section>
  );
}

function CatalogLoading({ loading, failed }: { loading: boolean; failed: boolean }) {
  if (loading) return <p role="status">Cargando catálogo…</p>;
  if (failed) return <p role="alert">No se pudo cargar el catálogo.</p>;
  return null;
}
