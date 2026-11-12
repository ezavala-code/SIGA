import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthProfile, OfertaGrupo, PeriodoAcademico } from '@siga/contracts';
import { getPlan, getPlanes } from '../services/catalogos';
import { getDocentes } from '../services/personas';
import { PagedSelect } from './PagedSelect';
import { mexicoCityInput, mexicoCityInstant } from './mexicoCityTime';
import {
  createGrupo,
  createPeriodo,
  getGrupos,
  getMisGrupos,
  getPeriodos,
  getPoliticas,
  updateGrupo,
  updatePeriodo,
} from '../services/oferta';

type Tab = 'periodos' | 'grupos';
const offerTabs: Tab[] = ['periodos', 'grupos'];
type PeriodDraft = {
  id: string;
  clave: string;
  nombre: string;
  inicio: string;
  fin: string;
  inscripcionInicio: string;
  inscripcionFin: string;
  originalInscripcionInicio?: string;
  originalInscripcionFin?: string;
  estado: PeriodoAcademico['estado'];
  politicaId: string;
};
type GroupDraft = {
  id: string;
  clave: string;
  planId: string;
  asignaturaId: string;
  periodoId: string;
  docenteId: string;
  cupo: string;
};

const emptyPeriod = (politicaId = ''): PeriodDraft => {
  const today = mexicoCityInput(new Date()).slice(0, 10);
  const start = `${today}T08:00`;
  const end = `${today}T09:00`;
  return {
    id: '',
    clave: '',
    nombre: '',
    inicio: today,
    fin: today,
    inscripcionInicio: start,
    inscripcionFin: end,
    estado: 'PLANIFICADO',
    politicaId,
  };
};
const emptyGroup = (periodoId = '', planId = '', docenteId = ''): GroupDraft => ({
  id: '',
  clave: '',
  planId,
  asignaturaId: '',
  periodoId,
  docenteId,
  cupo: '20',
});

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
          className="small-button"
          disabled={page <= 1}
          onClick={() => change(page - 1)}
        >
          Anterior
        </button>
        <button
          type="button"
          className="small-button"
          disabled={page >= pages}
          onClick={() => change(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

function periodLabel(period: Pick<PeriodoAcademico, 'clave' | 'nombre'>) {
  return `${period.clave} · ${period.nombre}`;
}

function GroupCard({
  group,
  onEdit,
  onToggle,
  busy,
  gradeHref,
}: {
  group: OfertaGrupo;
  onEdit?: () => void;
  onToggle?: () => void;
  busy?: boolean;
  gradeHref?: string;
}) {
  return (
    <li className="offer-card">
      <div className="offer-card-main">
        <div className="offer-card-title">
          <strong>{group.clave}</strong>
          <span className={`catalog-state ${group.activo ? 'is-active' : ''}`}>
            {group.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <span>
          {group.asignatura.clave} · {group.asignatura.nombre}
        </span>
        <span>
          {group.plan.programa.nombre} · {group.plan.nombre} v{group.plan.version}
        </span>
        <span>
          {periodLabel(group.periodo)} · {group.periodo.estado}
        </span>
        <span>
          Docente: {group.docente.nombre} · Ocupación: {group.ocupacion}/{group.cupo}
        </span>
      </div>
      {(onEdit || onToggle || gradeHref) && (
        <div className="offer-card-actions">
          {gradeHref && (
            <Link className="small-button" to={gradeHref}>
              Calificar
            </Link>
          )}
          {onEdit && (
            <button className="small-button" type="button" onClick={onEdit}>
              Editar
            </button>
          )}
          {onToggle && (
            <button className="small-button" type="button" disabled={busy} onClick={onToggle}>
              {group.activo ? 'Desactivar' : 'Reactivar'}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export function OfertaManagement({ session }: { session: AuthProfile | null }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('periodos');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [periodDraft, setPeriodDraft] = useState<PeriodDraft | null>(null);
  const [groupDraft, setGroupDraft] = useState<GroupDraft | null>(null);
  const [editedGroup, setEditedGroup] = useState<OfertaGrupo | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const csrf = session?.csrfToken ?? '';
  const periods = useQuery({
    queryKey: ['oferta', 'periodos', search, page],
    queryFn: ({ signal }) => getPeriodos(search, page, 10, signal),
    enabled: session?.rol === 'ADMINISTRADOR',
  });
  const groups = useQuery({
    queryKey: ['oferta', 'grupos', search, page],
    queryFn: ({ signal }) => getGrupos(search, page, 10, signal),
    enabled: session?.rol === 'ADMINISTRADOR',
  });
  const policyOptions = useQuery({
    queryKey: ['oferta', 'politicas'],
    queryFn: ({ signal }) => getPoliticas(signal),
    enabled: session?.rol === 'ADMINISTRADOR',
  });
  const selectedPlanId = groupDraft?.planId ?? '';
  const selectedPlan = useQuery({
    queryKey: ['catalogos', 'plan', selectedPlanId],
    queryFn: ({ signal }) => getPlan(selectedPlanId, signal),
    enabled: Boolean(selectedPlanId) && session?.rol === 'ADMINISTRADOR',
  });

  if (!session) return <Navigate to="/acceso" replace />;
  if (session.rol !== 'ADMINISTRADOR') return <Navigate to="/" replace />;

  async function perform(action: () => Promise<unknown>, success: string) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await action();
      setNotice(success);
      setPeriodDraft(null);
      setGroupDraft(null);
      await queryClient.invalidateQueries({ queryKey: ['oferta'] });
      await queryClient.invalidateQueries({ queryKey: ['catalogos'] });
      await queryClient.invalidateQueries({ queryKey: ['personas'] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el cambio.');
    } finally {
      setBusy(false);
    }
  }

  function startPeriod(period?: PeriodoAcademico) {
    setError('');
    setNotice('');
    setGroupDraft(null);
    setPeriodDraft(
      period
        ? {
            id: period.id,
            clave: period.clave,
            nombre: period.nombre,
            inicio: period.inicio,
            fin: period.fin,
            inscripcionInicio: mexicoCityInput(period.inscripcionInicio),
            inscripcionFin: mexicoCityInput(period.inscripcionFin),
            originalInscripcionInicio: period.inscripcionInicio,
            originalInscripcionFin: period.inscripcionFin,
            estado: period.estado,
            politicaId: period.politicaId,
          }
        : emptyPeriod(policyOptions.data?.[0]?.id),
    );
  }

  function startGroup(group?: OfertaGrupo) {
    setEditedGroup(group ?? null);
    setError('');
    setNotice('');
    setPeriodDraft(null);
    setGroupDraft(
      group
        ? {
            id: group.id,
            clave: group.clave,
            planId: group.planId,
            asignaturaId: group.asignaturaId,
            periodoId: group.periodoId,
            docenteId: group.docenteId,
            cupo: String(group.cupo),
          }
        : emptyGroup(),
    );
  }

  async function savePeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!periodDraft) return;
    let inscripcionInicio: string;
    let inscripcionFin: string;
    try {
      inscripcionInicio = mexicoCityInstant(
        periodDraft.inscripcionInicio,
        periodDraft.originalInscripcionInicio,
      );
      inscripcionFin = mexicoCityInstant(
        periodDraft.inscripcionFin,
        periodDraft.originalInscripcionFin,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La fecha de inscripción no es válida.');
      return;
    }
    const payload = {
      clave: periodDraft.clave,
      nombre: periodDraft.nombre,
      inicio: periodDraft.inicio,
      fin: periodDraft.fin,
      inscripcionInicio,
      inscripcionFin,
      estado: periodDraft.estado,
      politicaId: periodDraft.politicaId,
    };
    await perform(
      () =>
        periodDraft.id
          ? updatePeriodo(csrf, periodDraft.id, payload)
          : createPeriodo(csrf, payload),
      periodDraft.id ? 'Periodo actualizado.' : 'Periodo creado.',
    );
  }

  async function saveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupDraft) return;
    const payload = {
      clave: groupDraft.clave,
      planId: groupDraft.planId,
      asignaturaId: groupDraft.asignaturaId,
      periodoId: groupDraft.periodoId,
      docenteId: groupDraft.docenteId,
      cupo: Number(groupDraft.cupo),
    };
    await perform(
      () =>
        groupDraft.id ? updateGrupo(csrf, groupDraft.id, payload) : createGrupo(csrf, payload),
      groupDraft.id ? 'Grupo actualizado.' : 'Grupo creado.',
    );
  }

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function navigateTabs(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = offerTabs.indexOf(tab);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? offerTabs.length - 1
          : event.key === 'ArrowRight'
            ? (index + 1) % offerTabs.length
            : (index - 1 + offerTabs.length) % offerTabs.length;
    const next = offerTabs[nextIndex]!;
    setTab(next);
    setPage(1);
    event.currentTarget.querySelector<HTMLButtonElement>(`#offer-tab-${next}`)?.focus();
  }

  return (
    <section className="catalog-page" aria-labelledby="offer-title">
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">SIGA / OFERTA ACADÉMICA</p>
          <h1 id="offer-title">Periodos y grupos</h1>
          <p>Configura fechas, ventanas de inscripción, cupos y asignaciones docentes.</p>
        </div>
        <Link className="outline-button" to="/administracion">
          Volver a administración
        </Link>
      </div>
      <div
        className="catalog-tabs"
        role="tablist"
        aria-label="Administración de oferta"
        onKeyDown={navigateTabs}
      >
        <button
          id="offer-tab-periodos"
          type="button"
          role="tab"
          aria-selected={tab === 'periodos'}
          aria-controls="offer-panel-periodos"
          tabIndex={tab === 'periodos' ? 0 : -1}
          className={`catalog-tab ${tab === 'periodos' ? 'is-current' : ''}`}
          onClick={() => {
            setTab('periodos');
            setPage(1);
          }}
        >
          Periodos
        </button>
        <button
          id="offer-tab-grupos"
          type="button"
          role="tab"
          aria-selected={tab === 'grupos'}
          aria-controls="offer-panel-grupos"
          tabIndex={tab === 'grupos' ? 0 : -1}
          className={`catalog-tab ${tab === 'grupos' ? 'is-current' : ''}`}
          onClick={() => {
            setTab('grupos');
            setPage(1);
          }}
        >
          Grupos
        </button>
      </div>
      {notice && (
        <p className="form-success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="catalog-toolbar">
        <label htmlFor="offer-search">Buscar {tab === 'periodos' ? 'periodos' : 'grupos'}</label>
        <input
          id="offer-search"
          type="search"
          value={search}
          onChange={(event) => changeSearch(event.target.value)}
        />
        <button
          className="primary-link"
          type="button"
          onClick={() => (tab === 'periodos' ? startPeriod() : startGroup())}
        >
          Nuevo {tab === 'periodos' ? 'periodo' : 'grupo'}
        </button>
      </div>

      {tab === 'periodos' ? (
        <div
          className="offer-layout"
          id="offer-panel-periodos"
          role="tabpanel"
          aria-labelledby="offer-tab-periodos"
        >
          <div className="catalog-panel">
            <h2>Periodos registrados</h2>
            {periods.isPending ? (
              <p role="status">Cargando periodos…</p>
            ) : periods.isError ? (
              <p role="alert">No se pudieron cargar los periodos.</p>
            ) : (
              <ul className="catalog-list">
                {periods.data.items.map((period) => (
                  <li key={period.id} className="offer-card">
                    <div className="offer-card-main">
                      <div className="offer-card-title">
                        <strong>
                          {period.clave} · {period.nombre}
                        </strong>
                        <span
                          className={`catalog-state ${period.estado === 'ABIERTO' ? 'is-active' : ''}`}
                        >
                          {period.estado}
                        </span>
                      </div>
                      <span>
                        Periodo: {period.inicio} a {period.fin}
                      </span>
                      <span>
                        Inscripción: {new Date(period.inscripcionInicio).toLocaleString()} a{' '}
                        {new Date(period.inscripcionFin).toLocaleString()}
                      </span>
                      <span>
                        Política {period.politica.version} ·{' '}
                        {period.politica.esPropuesta
                          ? 'propuesta pendiente de aprobación'
                          : 'configurada'}{' '}
                        · {period.grupos} grupos
                      </span>
                    </div>
                    <button
                      className="small-button"
                      type="button"
                      onClick={() => startPeriod(period)}
                    >
                      Editar
                    </button>
                  </li>
                ))}
                {!periods.data.items.length && <li>No hay periodos que coincidan.</li>}
              </ul>
            )}
            {periods.data && (
              <PageControls
                page={page}
                pageSize={periods.data.pageSize}
                total={periods.data.total}
                change={setPage}
              />
            )}
          </div>
          {periodDraft && (
            <form
              className="catalog-panel catalog-form"
              onSubmit={(event) => void savePeriod(event)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setPeriodDraft(null);
                }
              }}
            >
              <h2>{periodDraft.id ? 'Editar periodo' : 'Nuevo periodo'}</h2>
              <label htmlFor="period-key">Clave</label>
              <input
                id="period-key"
                required
                maxLength={40}
                value={periodDraft.clave}
                onChange={(e) => setPeriodDraft({ ...periodDraft, clave: e.target.value })}
              />
              <label htmlFor="period-name">Nombre</label>
              <input
                id="period-name"
                required
                maxLength={160}
                value={periodDraft.nombre}
                onChange={(e) => setPeriodDraft({ ...periodDraft, nombre: e.target.value })}
              />
              <div className="offer-fields">
                <label>
                  Inicio del periodo
                  <input
                    type="date"
                    required
                    value={periodDraft.inicio}
                    onChange={(e) => setPeriodDraft({ ...periodDraft, inicio: e.target.value })}
                  />
                </label>
                <label>
                  Fin del periodo
                  <input
                    type="date"
                    required
                    value={periodDraft.fin}
                    onChange={(e) => setPeriodDraft({ ...periodDraft, fin: e.target.value })}
                  />
                </label>
                <label>
                  Inicio de inscripción (hora de Ciudad de México)
                  <input
                    type="datetime-local"
                    required
                    value={periodDraft.inscripcionInicio}
                    onChange={(e) =>
                      setPeriodDraft({ ...periodDraft, inscripcionInicio: e.target.value })
                    }
                  />
                </label>
                <label>
                  Fin de inscripción (hora de Ciudad de México)
                  <input
                    type="datetime-local"
                    required
                    value={periodDraft.inscripcionFin}
                    onChange={(e) =>
                      setPeriodDraft({ ...periodDraft, inscripcionFin: e.target.value })
                    }
                  />
                </label>
              </div>
              <label htmlFor="period-status">Estado</label>
              <select
                id="period-status"
                value={periodDraft.estado}
                onChange={(e) =>
                  setPeriodDraft({
                    ...periodDraft,
                    estado: e.target.value as PeriodDraft['estado'],
                  })
                }
              >
                <option value="PLANIFICADO">Planificado</option>
                <option value="ABIERTO">Abierto</option>
                <option value="CERRADO">Cerrado</option>
              </select>
              <label htmlFor="period-policy">Política académica</label>
              <select
                id="period-policy"
                required
                value={periodDraft.politicaId}
                onChange={(e) => setPeriodDraft({ ...periodDraft, politicaId: e.target.value })}
              >
                <option value="">Selecciona una política</option>
                {policyOptions.data?.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.version}
                    {policy.esPropuesta ? ' · propuesta' : ''}
                  </option>
                ))}
              </select>
              {policyOptions.data?.find((item) => item.id === periodDraft.politicaId)
                ?.esPropuesta && (
                <p className="offer-note">
                  Esta política sigue marcada como propuesta. La configuración no implica aprobación
                  de reglas académicas.
                </p>
              )}
              {policyOptions.isError && <p role="alert">No se pudieron cargar las políticas.</p>}
              <div className="offer-form-actions">
                <button className="primary-link" disabled={busy || policyOptions.isPending}>
                  {busy ? 'Guardando…' : 'Guardar periodo'}
                </button>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => setPeriodDraft(null)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div
          className="offer-layout"
          id="offer-panel-grupos"
          role="tabpanel"
          aria-labelledby="offer-tab-grupos"
        >
          <div className="catalog-panel">
            <h2>Grupos registrados</h2>
            {groups.isPending ? (
              <p role="status">Cargando grupos…</p>
            ) : groups.isError ? (
              <p role="alert">No se pudieron cargar los grupos.</p>
            ) : (
              <ul className="catalog-list">
                {groups.data.items.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onEdit={() => startGroup(group)}
                    busy={busy}
                    onToggle={() =>
                      void perform(
                        () => updateGrupo(csrf, group.id, { activo: !group.activo }),
                        group.activo
                          ? 'Grupo desactivado; su historial se conserva.'
                          : 'Grupo reactivado.',
                      )
                    }
                  />
                ))}
                {!groups.data.items.length && <li>No hay grupos que coincidan.</li>}
              </ul>
            )}
            {groups.data && (
              <PageControls
                page={page}
                pageSize={groups.data.pageSize}
                total={groups.data.total}
                change={setPage}
              />
            )}
          </div>
          {groupDraft && (
            <form
              className="catalog-panel catalog-form"
              onSubmit={(event) => void saveGroup(event)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setGroupDraft(null);
                }
              }}
            >
              <h2>{groupDraft.id ? 'Editar grupo' : 'Nuevo grupo'}</h2>
              <label htmlFor="group-key">Clave del grupo</label>
              <input
                id="group-key"
                required
                maxLength={40}
                value={groupDraft.clave}
                onChange={(e) => setGroupDraft({ ...groupDraft, clave: e.target.value })}
              />
              <PagedSelect
                id="group-plan"
                label="Plan de estudio"
                value={groupDraft.planId}
                onChange={(planId) => setGroupDraft({ ...groupDraft, planId, asignaturaId: '' })}
                fetchPage={getPlanes}
                queryKey={['catalogos', 'selector-planes']}
                optionLabel={(plan) => `${plan.programa.clave} · ${plan.nombre} v${plan.version}`}
                include={(plan) => plan.activo || plan.id === groupDraft.planId}
                fallback={
                  editedGroup
                    ? {
                        id: editedGroup.planId,
                        label: `${editedGroup.plan.programa.clave} · ${editedGroup.plan.nombre} v${editedGroup.plan.version}`,
                      }
                    : null
                }
              />
              <label htmlFor="group-subject">Asignatura del plan</label>
              <select
                id="group-subject"
                required
                value={groupDraft.asignaturaId}
                disabled={
                  (selectedPlan.isPending &&
                    !(editedGroup && groupDraft.asignaturaId === editedGroup.asignaturaId)) ||
                  !groupDraft.planId
                }
                onChange={(e) => setGroupDraft({ ...groupDraft, asignaturaId: e.target.value })}
              >
                <option value="">Selecciona una asignatura</option>
                {editedGroup &&
                  groupDraft.asignaturaId === editedGroup.asignaturaId &&
                  !selectedPlan.data?.asignaturas.some(
                    (course) =>
                      course.asignaturaId === editedGroup.asignaturaId &&
                      (course.asignatura.activo || course.asignaturaId === groupDraft.asignaturaId),
                  ) && (
                    <option value={editedGroup.asignaturaId}>
                      {editedGroup.asignatura.clave} · {editedGroup.asignatura.nombre}
                    </option>
                  )}
                {selectedPlan.data?.asignaturas
                  .filter(
                    (course) =>
                      course.asignatura.activo || course.asignaturaId === groupDraft.asignaturaId,
                  )
                  .map((course) => (
                    <option key={course.asignaturaId} value={course.asignaturaId}>
                      {course.asignatura.clave} · {course.asignatura.nombre}
                    </option>
                  ))}
              </select>
              <PagedSelect
                id="group-period"
                label="Periodo"
                value={groupDraft.periodoId}
                onChange={(periodoId) => setGroupDraft({ ...groupDraft, periodoId })}
                fetchPage={getPeriodos}
                queryKey={['oferta', 'selector-periodos']}
                optionLabel={(period) => `${period.clave} · ${period.nombre} · ${period.estado}`}
                include={(period) =>
                  Boolean(groupDraft.id) ||
                  period.estado !== 'CERRADO' ||
                  period.id === groupDraft.periodoId
                }
                fallback={
                  editedGroup
                    ? {
                        id: editedGroup.periodoId,
                        label: `${editedGroup.periodo.clave} · ${editedGroup.periodo.nombre} · ${editedGroup.periodo.estado}`,
                      }
                    : null
                }
              />
              <PagedSelect
                id="group-teacher"
                label="Docente activo"
                value={groupDraft.docenteId}
                onChange={(docenteId) => setGroupDraft({ ...groupDraft, docenteId })}
                fetchPage={getDocentes}
                queryKey={['personas', 'selector-docentes']}
                optionLabel={(teacher) =>
                  `${teacher.numeroEmpleado} · ${teacher.nombre}${teacher.activo ? '' : ' · inactivo (histórico)'}`
                }
                include={(teacher) => teacher.activo || teacher.id === groupDraft.docenteId}
                fallback={
                  editedGroup
                    ? {
                        id: editedGroup.docenteId,
                        label: `${editedGroup.docente.numeroEmpleado} · ${editedGroup.docente.nombre}${editedGroup.docente.activo ? '' : ' · inactivo (histórico)'}`,
                      }
                    : null
                }
              />
              <label htmlFor="group-capacity">Cupo</label>
              <input
                id="group-capacity"
                type="number"
                required
                min="1"
                step="1"
                value={groupDraft.cupo}
                onChange={(e) => setGroupDraft({ ...groupDraft, cupo: e.target.value })}
              />
              <p className="offer-note">
                El cupo no puede quedar por debajo de la ocupación activa. Al desactivar un grupo se
                conserva el historial de inscripciones.
              </p>
              <div className="offer-form-actions">
                <button className="primary-link" disabled={busy || selectedPlan.isPending}>
                  {busy ? 'Guardando…' : 'Guardar grupo'}
                </button>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => setGroupDraft(null)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

export function TeacherGroups({ session }: { session: AuthProfile | null }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const groups = useQuery({
    queryKey: ['oferta', 'mis-grupos', search, page],
    queryFn: ({ signal }) => getMisGrupos(search, page, signal),
    enabled: session?.rol === 'DOCENTE',
  });
  if (!session) return <Navigate to="/acceso" replace />;
  if (session.rol !== 'DOCENTE') return <Navigate to="/" replace />;
  return (
    <section className="catalog-page" aria-labelledby="teacher-groups-title">
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">SIGA / DOCENTE</p>
          <h1 id="teacher-groups-title">Mis grupos</h1>
          <p>Oferta asignada a tu perfil docente.</p>
        </div>
        <Link className="outline-button" to="/docente">
          Volver a mi espacio
        </Link>
      </div>
      <div className="catalog-panel">
        <h2>Grupos asignados</h2>
        <label>
          Buscar grupo, asignatura o periodo
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        {groups.isPending ? (
          <p role="status">Cargando tus grupos…</p>
        ) : groups.isError ? (
          <p role="alert">No se pudieron consultar tus grupos.</p>
        ) : (
          <>
            <ul className="catalog-list">
              {groups.data.items.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  gradeHref={`/docente/grupos/${group.id}/calificaciones`}
                />
              ))}
              {!groups.data.items.length && (
                <li>
                  {search
                    ? 'No hay grupos que coincidan con la búsqueda.'
                    : 'No tienes grupos asignados.'}
                </li>
              )}
            </ul>
            <PageControls
              page={page}
              pageSize={groups.data.pageSize}
              total={groups.data.total}
              change={setPage}
            />
          </>
        )}
      </div>
    </section>
  );
}
