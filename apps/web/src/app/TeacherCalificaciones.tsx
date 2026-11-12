import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CalificacionGrupoItem, AuthProfile } from '@siga/contracts';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getCalificacionesGrupo, guardarCalificacion } from '../services/calificaciones';
import { pendingDrafts } from './teacherDrafts';

export function TeacherCalificaciones({ session }: { session: AuthProfile | null }) {
  const { grupoId = '' } = useParams();
  const queryClient = useQueryClient();
  const draftKey = `${session?.csrfToken ?? ''}:${grupoId}`;
  const saved = pendingDrafts.get(draftKey);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>(() => saved?.drafts ?? {});
  const [reasons, setReasons] = useState<Record<string, string>>(() => saved?.reasons ?? {});
  const [draftVersions, setDraftVersions] = useState<Record<string, number>>(
    () => saved?.versions ?? {},
  );
  const hasDrafts = Object.keys(drafts).length > 0 || Object.keys(reasons).length > 0;
  useEffect(() => {
    if (hasDrafts) pendingDrafts.set(draftKey, { drafts, reasons, versions: draftVersions });
    else pendingDrafts.delete(draftKey);
  }, [draftKey, drafts, reasons, draftVersions, hasDrafts]);
  const roster = useQuery({
    queryKey: ['calificaciones', 'grupo', grupoId, page, search],
    queryFn: ({ signal }) => getCalificacionesGrupo(grupoId, search, page, 100, signal),
    enabled: session?.rol === 'DOCENTE' && Boolean(grupoId),
  });
  const mutation = useMutation({
    mutationFn: ({
      item,
      notaFinal,
      motivo,
    }: {
      item: CalificacionGrupoItem;
      notaFinal: string;
      motivo?: string;
    }) => guardarCalificacion(session?.csrfToken ?? '', item, notaFinal, motivo),
    onSuccess: async (_, variables) => {
      const stored = pendingDrafts.get(draftKey);
      if (
        stored &&
        stored.drafts[variables.item.inscripcionId] === variables.notaFinal &&
        (stored.reasons[variables.item.inscripcionId]?.trim() || undefined) === variables.motivo
      ) {
        const drafts = { ...stored.drafts };
        const reasons = { ...stored.reasons };
        const versions = { ...stored.versions };
        delete drafts[variables.item.inscripcionId];
        delete reasons[variables.item.inscripcionId];
        delete versions[variables.item.inscripcionId];
        if (Object.keys(drafts).length || Object.keys(reasons).length) {
          pendingDrafts.set(draftKey, { drafts, reasons, versions });
        } else {
          pendingDrafts.delete(draftKey);
        }
      }
      setDrafts((current) => {
        if (current[variables.item.inscripcionId] !== variables.notaFinal) return current;
        const next = { ...current };
        delete next[variables.item.inscripcionId];
        return next;
      });
      setReasons((current) => {
        if ((current[variables.item.inscripcionId]?.trim() || undefined) !== variables.motivo)
          return current;
        const next = { ...current };
        delete next[variables.item.inscripcionId];
        return next;
      });
      setDraftVersions((current) => {
        if (current[variables.item.inscripcionId] !== variables.item.version) return current;
        const next = { ...current };
        delete next[variables.item.inscripcionId];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ['calificaciones', 'grupo', grupoId] });
    },
    onError: async () => {
      await queryClient.invalidateQueries({ queryKey: ['calificaciones', 'grupo', grupoId] });
    },
  });

  if (!session) return <Navigate to="/acceso" replace />;
  if (session.rol !== 'DOCENTE') return <Navigate to="/" replace />;

  function save(event: FormEvent<HTMLFormElement>, item: CalificacionGrupoItem) {
    event.preventDefault();
    const notaFinal = drafts[item.inscripcionId] ?? item.notaFinal ?? '';
    const motivo = reasons[item.inscripcionId]?.trim();
    mutation.mutate({
      item,
      notaFinal,
      ...(item.notaFinal !== null && motivo ? { motivo } : {}),
    });
  }

  const policy = roster.data?.grupo.politica;
  const step = policy?.decimales ? `0.${'0'.repeat(policy.decimales - 1)}1` : '1';

  return (
    <section className="catalog-page academic-page" aria-labelledby="teacher-grade-title">
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">SIGA / DOCENTE</p>
          <h1 id="teacher-grade-title">Captura de calificaciones</h1>
          {roster.data && (
            <p>
              {roster.data.grupo.asignatura.clave} · {roster.data.grupo.asignatura.nombre} · Grupo{' '}
              {roster.data.grupo.clave} · {roster.data.grupo.periodo.nombre}
            </p>
          )}
        </div>
        <div className="report-heading-actions">
          <Link
            className="outline-button"
            to={`/docente/grupos/${encodeURIComponent(grupoId)}/seguimiento`}
          >
            Evaluaciones y asistencia
          </Link>
          {roster.data && (
            <a
              className="outline-button"
              href={`/api/reportes/grupos/${encodeURIComponent(roster.data.grupo.id)}/historial.csv`}
            >
              Exportar historial CSV
            </a>
          )}
          <Link
            className="outline-button"
            to="/docente/grupos"
            onClick={(event) => {
              if (hasDrafts && !window.confirm('Hay cambios sin guardar. ¿Deseas salir?')) {
                event.preventDefault();
              }
            }}
          >
            Volver a mis grupos
          </Link>
        </div>
      </div>

      {roster.isPending ? (
        <p role="status">Cargando lista del grupo…</p>
      ) : roster.isError ? (
        <p className="form-error" role="alert">
          {roster.error.message}
        </p>
      ) : (
        <>
          {policy?.esPropuesta && (
            <p className="academic-policy-note">
              Política {policy.version} marcada como propuesta. Escala {policy.escalaMinima}–
              {policy.escalaMaxima}, {policy.decimales} decimales; mínima aprobatoria{' '}
              {policy.minimaAprobatoria}. La configuración no significa que la propuesta esté
              aprobada.
            </p>
          )}
          {mutation.isError && (
            <p className="form-error" role="alert">
              No se pudo guardar la calificación de {mutation.variables.item.estudiante.nombre}:{' '}
              {mutation.error.message} Los cambios se conservaron.
            </p>
          )}
          {mutation.isSuccess && (
            <p className="form-success" role="status">
              Calificación guardada y auditada.
            </p>
          )}
          <div className="catalog-toolbar grade-toolbar">
            <label htmlFor="grade-search">Buscar estudiante</label>
            <input
              id="grade-search"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            <span>{roster.data.total} inscripciones calificables</span>
          </div>
          {roster.data.items.length === 0 ? (
            <p className="empty-state">No hay estudiantes inscritos en este grupo.</p>
          ) : (
            <ul className="grade-list">
              {roster.data.items.map((item) => {
                const draft = drafts[item.inscripcionId] ?? item.notaFinal ?? '';
                const changed = item.notaFinal === null || draft !== item.notaFinal;
                const correction = item.notaFinal !== null && changed;
                const versionChanged =
                  draftVersions[item.inscripcionId] !== undefined &&
                  draftVersions[item.inscripcionId] !== item.version;
                return (
                  <li className="grade-card" key={item.inscripcionId}>
                    <div className="grade-student">
                      <span className="catalog-code">{item.estudiante.matricula}</span>
                      <strong>{item.estudiante.nombre}</strong>
                      <small>
                        {item.creditos} créditos ·{' '}
                        {item.estado === 'CALIFICADA' ? 'Calificada' : 'Pendiente'}
                      </small>
                    </div>
                    <form className="grade-form" onSubmit={(event) => save(event, item)}>
                      <label>
                        Nota final
                        <input
                          aria-label={`Nota final de ${item.estudiante.nombre}`}
                          type="number"
                          min={policy?.escalaMinima}
                          max={policy?.escalaMaxima}
                          step={step}
                          required
                          value={draft}
                          disabled={mutation.isPending}
                          onChange={(event) => {
                            setDraftVersions((current) => ({
                              ...current,
                              [item.inscripcionId]: current[item.inscripcionId] ?? item.version,
                            }));
                            setDrafts({ ...drafts, [item.inscripcionId]: event.target.value });
                          }}
                        />
                      </label>
                      {correction && (
                        <label>
                          Motivo de corrección
                          <input
                            aria-label={`Motivo de corrección para ${item.estudiante.nombre}`}
                            required
                            maxLength={500}
                            disabled={mutation.isPending}
                            value={reasons[item.inscripcionId] ?? ''}
                            onChange={(event) =>
                              setReasons({ ...reasons, [item.inscripcionId]: event.target.value })
                            }
                          />
                        </label>
                      )}
                      {versionChanged && (
                        <div role="alert">
                          <p>
                            La calificación cambió desde que comenzaste a editar. Valor actual:{' '}
                            {item.notaFinal ?? 'sin calificar'}. Tu borrador se conserva.
                          </p>
                          <div className="form-actions">
                            <button
                              type="button"
                              className="outline-button"
                              onClick={() =>
                                setDraftVersions((current) => ({
                                  ...current,
                                  [item.inscripcionId]: item.version,
                                }))
                              }
                            >
                              Revisé el valor actual
                            </button>
                            <button
                              type="button"
                              className="outline-button"
                              onClick={() => {
                                setDrafts((current) => {
                                  const next = { ...current };
                                  delete next[item.inscripcionId];
                                  return next;
                                });
                                setReasons((current) => {
                                  const next = { ...current };
                                  delete next[item.inscripcionId];
                                  return next;
                                });
                                setDraftVersions((current) => {
                                  const next = { ...current };
                                  delete next[item.inscripcionId];
                                  return next;
                                });
                              }}
                            >
                              Descartar borrador
                            </button>
                          </div>
                        </div>
                      )}
                      <button
                        className="small-button"
                        disabled={
                          mutation.isPending ||
                          versionChanged ||
                          !changed ||
                          (correction && !reasons[item.inscripcionId]?.trim())
                        }
                      >
                        {mutation.isPending &&
                        mutation.variables.item.inscripcionId === item.inscripcionId
                          ? 'Guardando…'
                          : correction
                            ? 'Corregir'
                            : 'Guardar nota'}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
          {roster.data.total > roster.data.pageSize && (
            <div className="catalog-pagination" aria-label="Paginación de estudiantes">
              <button
                className="outline-button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </button>
              <span>
                Página {page} de {Math.ceil(roster.data.total / roster.data.pageSize)}
              </span>
              <button
                className="outline-button"
                disabled={page * roster.data.pageSize >= roster.data.total}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
