import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthProfile } from '@siga/contracts';
import {
  emitirMiCertificado,
  emitirConclusion,
  getAuditoria,
  getCertificadosAdministracion,
  getMisCertificados,
  getReporteGrupos,
  getVerificacionCertificado,
  reemitirCertificado,
  recuperarCertificado,
  revocarCertificado,
} from '../services/e08';

function dateLabel(value: string | null) {
  if (!value) return 'Pendiente';
  return new Date(value).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function statusLabel(value: string) {
  switch (value) {
    case 'EMITIDO':
    case 'VIGENTE':
      return 'Vigente';
    case 'REVOCADO':
      return 'Revocado';
    case 'FALLIDO':
      return 'Fallido';
    case 'PENDIENTE':
      return 'Pendiente';
    default:
      return 'No encontrado';
  }
}

export function StudentCertificates({ session }: { session: AuthProfile | null }) {
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const certificates = useQuery({
    queryKey: ['certificados', 'propios'],
    queryFn: ({ signal }) => getMisCertificados(signal),
    enabled: session?.rol === 'ESTUDIANTE',
  });
  const issue = useMutation({
    mutationFn: () => emitirMiCertificado(session!.csrfToken),
    onSettled: () => client.invalidateQueries({ queryKey: ['certificados', 'propios'] }),
  });
  const conclusion = useMutation({
    mutationFn: () => emitirConclusion(session!.csrfToken),
    onSettled: () => client.invalidateQueries({ queryKey: ['certificados', 'propios'] }),
  });
  const replace = useMutation({
    mutationFn: (id: string) => reemitirCertificado(session!.csrfToken, id),
    onSettled: () => client.invalidateQueries({ queryKey: ['certificados', 'propios'] }),
  });

  const recover = useMutation({
    mutationFn: (id: string) => recuperarCertificado(session!.csrfToken, id),
    onSettled: () => client.invalidateQueries({ queryKey: ['certificados', 'propios'] }),
  });

  if (!session) return <Navigate to="/acceso" replace />;
  if (session.rol !== 'ESTUDIANTE') return <Navigate to="/" replace />;

  const normalizedSearch = search.trim().toLowerCase();
  const filteredItems = (certificates.data?.items ?? []).filter((item) => {
    if (!normalizedSearch) return true;
    const text =
      `${item.codigo} ${item.estado} ${statusLabel(item.estado)} ${item.motivoRevocacion ?? ''}`.toLowerCase();
    return text.includes(normalizedSearch);
  });
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <section className="catalog-page academic-page" aria-labelledby="certificates-title">
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">SIGA / ESTUDIANTE</p>
          <h1 id="certificates-title">Constancias de estudios</h1>
          <p>Emite una constancia con tus notas finales y consulta su vigencia.</p>
        </div>
        <Link className="outline-button" to="/estudiante">
          Volver a mi espacio
        </Link>
      </div>
      <div className="profile-panel certificate-actions">
        <p>
          El documento incluye intentos con nota final, incluso reprobados. No acredita la
          conclusión del programa. Una constancia sin notas finales no puede emitirse.
        </p>
        <button className="primary-link" disabled={issue.isPending} onClick={() => issue.mutate()}>
          {issue.isPending ? 'Generando PDF…' : 'Emitir constancia de estudios'}
        </button>
        <p>
          También puedes solicitar el certificado de conclusión si has aprobado todas las
          asignaturas de tu plan académico.
        </p>
        <button
          className="small-button"
          disabled={conclusion.isPending}
          onClick={() => conclusion.mutate()}
        >
          {conclusion.isPending ? 'Comprobando requisitos…' : 'Emitir certificado de conclusión'}
        </button>
        {conclusion.isError && (
          <p className="form-error" role="alert">
            {conclusion.error.message}
          </p>
        )}
        {conclusion.isSuccess && (
          <p className="form-success" role="status">
            Certificado emitido. Código: {conclusion.data.codigo}
          </p>
        )}
        {issue.isError && (
          <p className="form-error" role="alert">
            {issue.error.message}
          </p>
        )}
        {issue.isSuccess && (
          <p className="success-notice" role="status">
            Constancia emitida. Código: <strong>{issue.data.codigo}</strong>
          </p>
        )}
        {replace.isError && (
          <p className="form-error" role="alert">
            {replace.error.message}
          </p>
        )}
        {recover.isError && (
          <p className="form-error" role="alert">
            {recover.error.message}
          </p>
        )}
      </div>
      <section className="profile-panel" aria-labelledby="issued-list-title">
        <div className="section-heading">
          <h2 id="issued-list-title">Mi historial de emisión</h2>
          {(certificates.data?.items.length ?? 0) > 0 && (
            <label className="catalog-search">
              Buscar constancia por código o estado
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </label>
          )}
        </div>
        {certificates.isPending ? (
          <p role="status">Cargando constancias…</p>
        ) : certificates.isError ? (
          <p className="form-error" role="alert">
            {certificates.error.message}
          </p>
        ) : certificates.data.items.length === 0 ? (
          <p>Aún no hay constancias emitidas.</p>
        ) : filteredItems.length === 0 ? (
          <p>No se encontraron constancias con ese criterio.</p>
        ) : (
          <>
            <ul className="certificate-list">
              {pagedItems.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>
                      {item.tipo === 'ESTUDIOS'
                        ? 'Constancia de estudios'
                        : 'Certificado de conclusión'}
                    </strong>
                    <span>
                      {statusLabel(item.estado)} · {dateLabel(item.emitidoEn)}
                    </span>
                    <code>{item.codigo}</code>
                    {item.motivoRevocacion && (
                      <small>Motivo de revocación: {item.motivoRevocacion}</small>
                    )}
                    {item.reemplazo && <small>Reemplazada por {item.reemplazo.codigo}</small>}
                  </div>
                  <div className="certificate-row-actions">
                    {['EMITIDO', 'REVOCADO'].includes(item.estado) && (
                      <a
                        className="outline-button"
                        href={`/api/certificados/${encodeURIComponent(item.id)}/pdf`}
                      >
                        Descargar PDF
                      </a>
                    )}
                    {['PENDIENTE', 'FALLIDO'].includes(item.estado) && (
                      <button
                        className="small-button"
                        disabled={recover.isPending}
                        onClick={() => recover.mutate(item.id)}
                      >
                        {recover.isPending && recover.variables === item.id
                          ? 'Recuperando…'
                          : 'Recuperar solicitud'}
                      </button>
                    )}
                    {item.estado === 'REVOCADO' && !item.reemplazo && (
                      <button
                        className="small-button"
                        disabled={replace.isPending}
                        onClick={() => replace.mutate(item.id)}
                      >
                        Reemitir
                      </button>
                    )}
                    {['EMITIDO', 'REVOCADO'].includes(item.estado) && (
                      <Link to={`/verificar/${item.codigo}`}>Verificación pública</Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {filteredItems.length > pageSize && (
              <ReportPagination
                label="mis constancias"
                page={currentPage}
                pageSize={pageSize}
                total={filteredItems.length}
                onChange={setPage}
              />
            )}
          </>
        )}
      </section>
    </section>
  );
}

export function PublicCertificateVerification() {
  const { codigo = '' } = useParams();
  const verification = useQuery({
    queryKey: ['verificacion-certificado', codigo],
    queryFn: ({ signal }) => getVerificacionCertificado(codigo, signal),
    enabled: Boolean(codigo),
    retry: false,
  });
  const result = verification.data;
  return (
    <section className="verification-page" aria-labelledby="verification-title">
      <p className="eyebrow">SIGA / VERIFICACIÓN PÚBLICA</p>
      <h1 id="verification-title">Consulta de constancia</h1>
      {verification.isPending ? (
        <p role="status">Verificando el código…</p>
      ) : verification.isError ? (
        <p className="form-error" role="alert">
          No se pudo consultar la verificación. Intenta de nuevo.
        </p>
      ) : result?.estado === 'INEXISTENTE' ? (
        <div className="verification-card is-invalid" role="status">
          <strong>Código inexistente</strong>
          <p>No se encontró una constancia verificable con este código.</p>
        </div>
      ) : (
        <div
          className={`verification-card ${result?.estado === 'REVOCADO' ? 'is-invalid' : 'is-valid'}`}
        >
          <strong>
            {result?.estado === 'REVOCADO' ? 'Constancia revocada' : 'Constancia vigente'}
          </strong>
          <dl>
            <div>
              <dt>Código</dt>
              <dd>{result?.codigo}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>Constancia de estudios</dd>
            </div>
            <div>
              <dt>Fecha de emisión</dt>
              <dd>{dateLabel(result?.fechaEmision ?? null)}</dd>
            </div>
            <div>
              <dt>Programa</dt>
              <dd>{result?.programa}</dd>
            </div>
            <div>
              <dt>Nombre</dt>
              <dd>{result?.nombre}</dd>
            </div>
          </dl>
          <p>
            La consulta pública confirma el estado registral; no muestra el expediente académico.
          </p>
        </div>
      )}
      <Link className="outline-button" to="/">
        Volver al portal
      </Link>
    </section>
  );
}

function ReportPagination({
  label,
  page,
  pageSize,
  total,
  onChange,
}: {
  label: string;
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <nav className="catalog-pagination" aria-label={`Paginación de ${label}`}>
      <button className="outline-button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Anterior
      </button>
      <span>
        Página {page} de {Math.max(1, Math.ceil(total / pageSize))} · {total} registros
      </span>
      <button
        className="outline-button"
        disabled={page * pageSize >= total}
        onClick={() => onChange(page + 1)}
      >
        Siguiente
      </button>
    </nav>
  );
}

export function ReportsManagement({ session }: { session: AuthProfile | null }) {
  const client = useQueryClient();
  const [q, setQ] = useState('');
  const [groupsPage, setGroupsPage] = useState(1);
  const [certificatesPage, setCertificatesPage] = useState(1);
  const [auditsPage, setAuditsPage] = useState(1);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const groups = useQuery({
    queryKey: ['reportes', 'grupos', q, groupsPage],
    queryFn: ({ signal }) => getReporteGrupos(q, groupsPage, 100, signal),
    enabled: session?.rol === 'ADMINISTRADOR',
  });
  const certificates = useQuery({
    queryKey: ['reportes', 'certificados', q, certificatesPage],
    queryFn: ({ signal }) => getCertificadosAdministracion(q, certificatesPage, 100, signal),
    enabled: session?.rol === 'ADMINISTRADOR',
  });
  const audits = useQuery({
    queryKey: ['reportes', 'auditoria', q, auditsPage],
    queryFn: ({ signal }) => getAuditoria(q, auditsPage, 100, signal),
    enabled: session?.rol === 'ADMINISTRADOR',
  });
  const revoke = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      revocarCertificado(session!.csrfToken, id, reason),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['reportes', 'certificados'] });
      void client.invalidateQueries({ queryKey: ['reportes', 'auditoria'] });
    },
  });
  if (!session) return <Navigate to="/acceso" replace />;
  if (session.rol !== 'ADMINISTRADOR') return <Navigate to="/" replace />;

  return (
    <section className="catalog-page reports-page" aria-labelledby="reports-title">
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">SIGA / ADMINISTRACIÓN</p>
          <h1 id="reports-title">Reportes e historial</h1>
          <p>Consulta grupos, exporta historiales y revisa los cambios auditados.</p>
        </div>
        <div className="report-heading-actions">
          <button className="outline-button" onClick={() => window.print()}>
            Imprimir reportes
          </button>
          <Link className="outline-button" to="/administracion">
            Volver
          </Link>
        </div>
      </div>
      <label className="report-search">
        Buscar en certificados, grupos y bitácora
        <input
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setGroupsPage(1);
            setCertificatesPage(1);
            setAuditsPage(1);
          }}
          maxLength={120}
        />
      </label>
      <section className="report-panel" aria-labelledby="groups-report-title">
        <h2 id="groups-report-title">Grupos e historial académico</h2>
        {groups.isPending ? (
          <p role="status">Cargando grupos…</p>
        ) : groups.isError ? (
          <p className="form-error" role="alert">
            {groups.error.message}
          </p>
        ) : (
          <div className="table-scroll">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Grupo</th>
                  <th>Programa / asignatura</th>
                  <th>Docente</th>
                  <th>Inscripciones</th>
                  <th>Historial</th>
                </tr>
              </thead>
              <tbody>
                {groups.data.items.map((group) => (
                  <tr key={group.id}>
                    <td>
                      {group.periodo.clave}
                      <small>{group.periodo.nombre}</small>
                    </td>
                    <td>
                      {group.clave}
                      <small>{group.activo ? 'Activo' : 'Inactivo'}</small>
                    </td>
                    <td>
                      {group.programa.nombre}
                      <small>
                        {group.asignatura.clave} · {group.asignatura.nombre}
                      </small>
                    </td>
                    <td>{group.docente.nombre}</td>
                    <td>
                      {group.inscripciones} / {group.cupo}
                    </td>
                    <td>
                      <a
                        href={`/api/reportes/grupos/${encodeURIComponent(group.id)}/historial.csv`}
                      >
                        Exportar CSV
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {groups.data && (
          <ReportPagination label="grupos" {...groups.data} onChange={setGroupsPage} />
        )}
      </section>
      <section className="report-panel" aria-labelledby="certificates-report-title">
        <h2 id="certificates-report-title">Constancias</h2>
        {certificates.isPending ? (
          <p role="status">Cargando constancias…</p>
        ) : certificates.isError ? (
          <p className="form-error" role="alert">
            {certificates.error.message}
          </p>
        ) : certificates.data.items.length === 0 ? (
          <p>No hay constancias para mostrar.</p>
        ) : (
          <div className="certificate-admin-list">
            {certificates.data.items.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.estudiante.nombre}</strong>
                  <span>
                    {item.estudiante.matricula} · {item.programa.nombre}
                  </span>
                  <code>{item.codigo}</code>
                  <small>
                    {statusLabel(item.estado)} · {dateLabel(item.emitidoEn)}
                  </small>
                </div>
                <div className="certificate-row-actions">
                  {['EMITIDO', 'REVOCADO'].includes(item.estado) && (
                    <a href={`/api/certificados/${encodeURIComponent(item.id)}/pdf`}>Descargar</a>
                  )}
                  {item.estado === 'EMITIDO' && (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        revoke.mutate({ id: item.id, reason: reasons[item.id] ?? '' });
                      }}
                    >
                      <label htmlFor={`reason-${item.id}`}>Motivo para revocar</label>
                      <input
                        id={`reason-${item.id}`}
                        value={reasons[item.id] ?? ''}
                        onChange={(event) =>
                          setReasons((current) => ({ ...current, [item.id]: event.target.value }))
                        }
                        maxLength={500}
                        required
                      />
                      <button
                        className="small-button"
                        disabled={revoke.isPending || !(reasons[item.id] ?? '').trim()}
                      >
                        Revocar
                      </button>
                    </form>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        {revoke.isError && (
          <p className="form-error" role="alert">
            {revoke.error.message}
          </p>
        )}
        {certificates.data && (
          <ReportPagination
            label="constancias"
            {...certificates.data}
            onChange={setCertificatesPage}
          />
        )}
      </section>
      <section className="report-panel" aria-labelledby="audit-report-title">
        <h2 id="audit-report-title">Bitácora de cambios</h2>
        {audits.isPending ? (
          <p role="status">Cargando bitácora…</p>
        ) : audits.isError ? (
          <p className="form-error" role="alert">
            {audits.error.message}
          </p>
        ) : (
          <div className="audit-list">
            {audits.data.items.map((item) => (
              <details key={item.id}>
                <summary>
                  <strong>{item.accion}</strong>
                  <span>
                    {item.recurso} · {dateLabel(item.creadoEn)}
                  </span>
                  <span>{item.actor?.correo ?? 'Sistema'}</span>
                </summary>
                <p>
                  Recurso: {item.recursoId}
                  {item.motivo ? ` · Motivo: ${item.motivo}` : ''}
                </p>
                <div className="audit-values">
                  <div>
                    <strong>Antes</strong>
                    <pre>{JSON.stringify(item.anterior, null, 2) ?? 'Sin dato'}</pre>
                  </div>
                  <div>
                    <strong>Después</strong>
                    <pre>{JSON.stringify(item.posterior, null, 2) ?? 'Sin dato'}</pre>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
        {audits.data && (
          <ReportPagination label="bitácora" {...audits.data} onChange={setAuditsPage} />
        )}
      </section>
    </section>
  );
}
