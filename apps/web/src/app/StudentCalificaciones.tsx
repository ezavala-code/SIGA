import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AuthProfile } from '@siga/contracts';
import { Link, Navigate } from 'react-router-dom';
import { getMisCalificaciones, getMiProgreso } from '../services/calificaciones';

function notaVisible(value: string | null) {
  if (value === null) return 'Pendiente';
  return Number(value).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function resultadoLabel(resultado: string) {
  switch (resultado) {
    case 'APROBADA':
      return 'Aprobada';
    case 'REPROBADA':
      return 'Reprobada';
    case 'CANCELADA':
      return 'Cancelada';
    default:
      return 'Pendiente';
  }
}

export function StudentCalificaciones({ session }: { session: AuthProfile | null }) {
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 20;
  const grades = useQuery({
    queryKey: ['calificaciones', 'propias'],
    queryFn: ({ signal }) => getMisCalificaciones(signal),
    enabled: session?.rol === 'ESTUDIANTE',
  });
  const progress = useQuery({
    queryKey: ['progreso', 'propio'],
    queryFn: ({ signal }) => getMiProgreso(signal),
    enabled: session?.rol === 'ESTUDIANTE',
  });

  if (!session) return <Navigate to="/acceso" replace />;
  if (session.rol !== 'ESTUDIANTE') return <Navigate to="/" replace />;

  const normalizedHistorySearch = historySearch.trim().toLowerCase();
  const filteredHistory = (grades.data?.items ?? []).filter((item) => {
    if (!normalizedHistorySearch) return true;
    const text =
      `${item.asignatura.clave} ${item.asignatura.nombre} ${item.periodo.nombre} ${item.grupo.clave} ${item.grupo.docente} ${resultadoLabel(item.resultado)}`.toLowerCase();
    return text.includes(normalizedHistorySearch);
  });
  const historyPages = Math.max(1, Math.ceil(filteredHistory.length / historyPageSize));
  const currentHistoryPage = Math.min(historyPage, historyPages);
  const pagedHistory = filteredHistory.slice(
    (currentHistoryPage - 1) * historyPageSize,
    currentHistoryPage * historyPageSize,
  );

  return (
    <section className="catalog-page academic-page" aria-labelledby="academic-title">
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">SIGA / ESTUDIANTE</p>
          <h1 id="academic-title">Calificaciones y avance</h1>
          <p>Consulta tus resultados, promedios por periodo y créditos acreditados.</p>
        </div>
        <Link className="outline-button" to="/estudiante">
          Volver a mi espacio
        </Link>
      </div>

      {grades.isPending || progress.isPending ? (
        <p role="status">Cargando tu historial académico…</p>
      ) : grades.isError || progress.isError ? (
        <p className="form-error" role="alert">
          {grades.error?.message ?? progress.error?.message ?? 'No se pudo cargar el historial.'}
        </p>
      ) : (
        <>
          {(grades.data.politicaPropuesta || progress.data.politicaPropuesta) && (
            <p className="academic-policy-note">
              Los cálculos reflejan la política académica asociada a cada periodo, marcada como
              propuesta; esta consulta no implica su aprobación institucional.
            </p>
          )}
          <div className="academic-summary-grid">
            <article className="academic-stat">
              <span>Promedio general</span>
              <strong>{grades.data.promedioGeneral ?? 'Sin calificaciones'}</strong>
              <small>
                Ponderado por créditos; los intentos se interpretan según la política vigente.
              </small>
            </article>
            <article className="academic-stat">
              <span>Créditos aprobados</span>
              <strong>
                {progress.data.creditosAprobados} / {progress.data.creditosTotales}
              </strong>
              <small>
                {progress.data.asignaturasAprobadas} de {progress.data.asignaturasTotales}{' '}
                asignaturas del plan v{progress.data.plan.version}
              </small>
            </article>
            <article className="academic-stat">
              <span>Avance del plan</span>
              <strong>
                {progress.data.avancePorcentaje === null
                  ? 'Sin créditos en el plan'
                  : `${progress.data.avancePorcentaje}%`}
              </strong>
              <small>{progress.data.plan.nombre}</small>
            </article>
          </div>

          <section className="matricula-section academic-periods" aria-labelledby="period-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">PROMEDIOS</p>
                <h2 id="period-title">Por periodo</h2>
              </div>
            </div>
            {grades.data.periodos.length === 0 ? (
              <p className="empty-state">Aún no tienes periodos en tu historial.</p>
            ) : (
              <ul className="academic-period-list">
                {grades.data.periodos.map((period) => (
                  <li key={period.id}>
                    <span>
                      <strong>{period.nombre}</strong>
                      <small>{period.intentosCalificados} calificaciones finales</small>
                    </span>
                    <strong>{period.promedio ?? 'Sin calificaciones'}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="matricula-section" aria-labelledby="history-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">HISTORIAL PERSONAL</p>
                <h2 id="history-title">Asignaturas cursadas</h2>
              </div>
              {grades.data.items.length > 0 && (
                <label className="catalog-search">
                  Buscar asignatura, clave o periodo
                  <input
                    type="search"
                    value={historySearch}
                    onChange={(event) => {
                      setHistorySearch(event.target.value);
                      setHistoryPage(1);
                    }}
                  />
                </label>
              )}
            </div>
            {grades.data.items.length === 0 ? (
              <p className="empty-state">Todavía no tienes inscripciones en tu historial.</p>
            ) : filteredHistory.length === 0 ? (
              <p className="empty-state">No se encontraron asignaturas en tu historial.</p>
            ) : (
              <>
                <ul className="matricula-list">
                  {pagedHistory.map((item) => (
                    <li className="matricula-card" key={item.inscripcionId}>
                      <div className="matricula-card-heading">
                        <div>
                          <span className="catalog-code">{item.asignatura.clave}</span>
                          <h3>{item.asignatura.nombre}</h3>
                          <p>
                            {item.periodo.nombre} · Grupo {item.grupo.clave} ·{' '}
                            {item.creditosSnapshot} créditos
                          </p>
                        </div>
                        <span
                          className={`enrollment-status status-${item.resultado.toLowerCase()}`}
                        >
                          {resultadoLabel(item.resultado)}
                        </span>
                      </div>
                      <p className="matricula-teacher">
                        Nota final: {notaVisible(item.notaFinal)} · Docente: {item.grupo.docente}
                      </p>
                      <p className="academic-policy-note compact-note">
                        Política {item.periodo.politica.version}
                        {item.periodo.politica.esPropuesta ? ' · propuesta' : ''} · mínima
                        aprobatoria {notaVisible(item.periodo.politica.minimaAprobatoria)}
                      </p>
                    </li>
                  ))}
                </ul>
                {filteredHistory.length > historyPageSize && (
                  <div className="catalog-pagination" aria-label="Paginación de historial">
                    <button
                      type="button"
                      className="outline-button"
                      disabled={currentHistoryPage <= 1}
                      onClick={() => setHistoryPage(currentHistoryPage - 1)}
                    >
                      Anterior
                    </button>
                    <span>
                      Página {currentHistoryPage} de {historyPages} · {filteredHistory.length}{' '}
                      registros
                    </span>
                    <button
                      type="button"
                      className="outline-button"
                      disabled={currentHistoryPage >= historyPages}
                      onClick={() => setHistoryPage(currentHistoryPage + 1)}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </section>
  );
}
