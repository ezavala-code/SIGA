import { useState, type KeyboardEvent } from 'react';
import { nucleoClass, nucleoDePeriodo, periodosIcoF19, planIcoF19 } from '../data/ico-f19';

type VistaCurricular = 'obligatorias' | 'optativas';

export function CurriculumOverview() {
  const [vista, setVista] = useState<VistaCurricular>('obligatorias');

  function navigateTabs(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 'obligatorias'
        : event.key === 'End'
          ? 'optativas'
          : vista === 'obligatorias'
            ? 'optativas'
            : 'obligatorias';
    setVista(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`#curriculum-tab-${next}`)?.focus();
  }

  return (
    <section className="curriculum-section" id="mapa-curricular" aria-labelledby="curriculum-title">
      <div className="curriculum-heading">
        <div>
          <p className="eyebrow">PLAN DE ESTUDIOS · GENERACIÓN {planIcoF19.generacion}</p>
          <h2 id="curriculum-title">{planIcoF19.nombre}</h2>
          <p>
            Mapa curricular {planIcoF19.clave}: {planIcoF19.asignaturasObligatorias} unidades de
            aprendizaje obligatorias, {planIcoF19.actividadesAcademicas} actividades académicas y{' '}
            {planIcoF19.optativasAcreditar} optativas por acreditar.
          </p>
        </div>
        <a
          className="curriculum-source"
          href={planIcoF19.urlFuente}
          target="_blank"
          rel="noreferrer"
        >
          Consultar fuente oficial <span aria-hidden="true">↗</span>
        </a>
      </div>

      <div className="curriculum-stats" aria-label="Resumen del plan">
        <article>
          <strong>{planIcoF19.periodos}</strong>
          <span>periodos</span>
        </article>
        <article>
          <strong>{planIcoF19.asignaturasObligatorias}</strong>
          <span>UA obligatorias</span>
        </article>
        <article>
          <strong>{planIcoF19.actividadesAcademicas}</strong>
          <span>actividades académicas</span>
        </article>
        <article>
          <strong>{planIcoF19.optativasAcreditar}</strong>
          <span>optativas por acreditar</span>
        </article>
        <article>
          <strong>{planIcoF19.creditosTotales}</strong>
          <span>créditos del plan</span>
        </article>
      </div>

      <div className="curriculum-legend" aria-label="Núcleos de formación">
        <span>
          <i className="nucleus-basic" /> Núcleo básico
        </span>
        <span>
          <i className="nucleus-substantive" /> Núcleo sustantivo
        </span>
        <span>
          <i className="nucleus-integral" /> Núcleo integral
        </span>
      </div>

      <div
        className="curriculum-view-switch"
        role="tablist"
        aria-label="Tipo de asignaturas"
        onKeyDown={navigateTabs}
      >
        <button
          type="button"
          role="tab"
          id="curriculum-tab-obligatorias"
          aria-controls="curriculum-panel"
          tabIndex={vista === 'obligatorias' ? 0 : -1}
          aria-selected={vista === 'obligatorias'}
          onClick={() => setVista('obligatorias')}
        >
          Obligatorias
        </button>
        <button
          type="button"
          role="tab"
          id="curriculum-tab-optativas"
          aria-controls="curriculum-panel"
          tabIndex={vista === 'optativas' ? 0 : -1}
          aria-selected={vista === 'optativas'}
          onClick={() => setVista('optativas')}
        >
          Optativas{' '}
          <span>
            {periodosIcoF19.reduce((sum, period) => sum + (period.optativas?.length ?? 0), 0)}
          </span>
        </button>
      </div>

      {vista === 'obligatorias' ? (
        <div
          className="curriculum-period-grid"
          role="tabpanel"
          id="curriculum-panel"
          aria-labelledby="curriculum-tab-obligatorias"
        >
          {periodosIcoF19.map((period) => {
            const nucleo = nucleoDePeriodo(period.numero);
            return (
              <article
                className={`curriculum-period ${nucleoClass(period.numero)}`}
                key={period.numero}
              >
                <div className="curriculum-period-heading">
                  <span className="period-number">{String(period.numero).padStart(2, '0')}</span>
                  <div>
                    <h3>Periodo {period.numero}</h3>
                    <small>Núcleo {nucleo.toLowerCase()}</small>
                  </div>
                  <span className="period-count">{period.asignaturas.length}</span>
                </div>
                <ul>
                  {period.asignaturas.map((asignatura) => (
                    <li key={asignatura}>{asignatura}</li>
                  ))}
                </ul>
                {period.optativas && (
                  <p className="period-electives">
                    {period.optativas.length} optativas disponibles en este periodo
                  </p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div
          className="curriculum-elective-grid"
          role="tabpanel"
          id="curriculum-panel"
          aria-labelledby="curriculum-tab-optativas"
        >
          {periodosIcoF19
            .filter((period) => period.optativas)
            .map((period) => (
              <article
                className={`curriculum-elective-card ${nucleoClass(period.numero)}`}
                key={period.numero}
              >
                <div className="curriculum-period-heading">
                  <span className="period-number">{String(period.numero).padStart(2, '0')}</span>
                  <div>
                    <h3>Optativas del periodo {period.numero}</h3>
                    <small>{period.optativas!.length} unidades de aprendizaje disponibles</small>
                  </div>
                </div>
                <ul>
                  {period.optativas!.map((asignatura) => (
                    <li key={asignatura}>{asignatura}</li>
                  ))}
                </ul>
              </article>
            ))}
          <p className="curriculum-elective-note">
            El mapa contempla acreditar tres asignaturas optativas; la oferta puede variar por
            periodo.
          </p>
        </div>
      )}

      <p className="curriculum-footnote">
        Esta vista presenta el plan curricular. Las calificaciones y el avance personal solo se
        muestran en el historial de la cuenta del estudiante.
      </p>
    </section>
  );
}
