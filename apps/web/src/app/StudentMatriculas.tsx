import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthProfile } from '@siga/contracts';
import { Link, Navigate } from 'react-router-dom';
import { getMisInscripciones, getOfertaMatricula, inscribirse } from '../services/matriculas';
import { cancelarMatricula, getMisListas, salirLista, unirseLista } from '../services/ampliacion';

export function StudentMatriculas({ session }: { session: AuthProfile | null }) {
  if (!session) return <Navigate to="/acceso" replace />;
  if (session.rol !== 'ESTUDIANTE') return <Navigate to="/" replace />;
  return <MatriculaPage session={session} />;
}

function MatriculaPage({ session }: { session: AuthProfile }) {
  const queryClient = useQueryClient();
  const [offerPage, setOfferPage] = useState(1);
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const oferta = useQuery({
    queryKey: ['matricula-oferta', offerPage],
    queryFn: ({ signal }) => getOfertaMatricula(offerPage, signal),
  });
  const inscripciones = useQuery({
    queryKey: ['mis-inscripciones', enrollmentPage],
    queryFn: ({ signal }) => getMisInscripciones(enrollmentPage, signal),
  });
  const listas = useQuery({
    queryKey: ['matricula-lista-espera'],
    queryFn: ({ signal }) => getMisListas(signal),
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['mis-inscripciones'] }),
      queryClient.invalidateQueries({ queryKey: ['matricula-oferta'] }),
      queryClient.invalidateQueries({ queryKey: ['matricula-lista-espera'] }),
    ]);
  };
  const esperar = useMutation({
    mutationFn: (grupoId: string) => unirseLista(session.csrfToken, grupoId),
    onSuccess: refresh,
  });
  const retirarEspera = useMutation({
    mutationFn: (id: string) => salirLista(session.csrfToken, id),
    onSuccess: refresh,
  });
  const cancelar = useMutation({
    mutationFn: (id: string) => cancelarMatricula(session.csrfToken, id),
    onSuccess: refresh,
  });
  const mutation = useMutation({
    mutationFn: (grupoId: string) => inscribirse(session.csrfToken, grupoId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mis-inscripciones'] }),
        queryClient.invalidateQueries({ queryKey: ['matricula-oferta'] }),
      ]);
    },
  });

  return (
    <section className="catalog-page" aria-labelledby="matricula-title">
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">SIGA / ESTUDIANTE</p>
          <h1 id="matricula-title">Mi matrícula</h1>
          <p>Consulta la oferta de tu plan y registra tus grupos disponibles.</p>
        </div>
        <Link className="outline-button" to="/estudiante">
          Volver a mi espacio
        </Link>
      </div>

      <section className="matricula-section" aria-labelledby="oferta-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">INSCRIPCIÓN EN LÍNEA</p>
            <h2 id="oferta-title">Grupos disponibles</h2>
          </div>
          <button
            className="small-button"
            type="button"
            onClick={() => void oferta.refetch()}
            disabled={oferta.isFetching}
          >
            {oferta.isFetching ? 'Actualizando…' : 'Actualizar oferta'}
          </button>
        </div>
        {oferta.isPending ? (
          <p role="status">Cargando oferta académica…</p>
        ) : oferta.isError ? (
          <p className="form-error" role="alert">
            {oferta.error.message}
          </p>
        ) : oferta.data.items.length === 0 ? (
          <p className="empty-state">
            {oferta.data.total === 0
              ? 'No hay grupos abiertos para tu plan en este momento.'
              : 'No hay grupos en esta página. Regresa a una página anterior.'}
          </p>
        ) : (
          <ul className="matricula-list">
            {oferta.data.items.map((group) => (
              <li className="matricula-card" key={group.grupoId}>
                <div className="matricula-card-heading">
                  <div>
                    <span className="catalog-code">{group.asignatura.clave}</span>
                    <h3>{group.asignatura.nombre}</h3>
                    <p>
                      {group.periodo.nombre} · Grupo {group.clave} · {group.creditos} créditos
                    </p>
                  </div>
                  <span className="matricula-seats">
                    {Math.max(group.cupo - group.ocupacion, 0)} lugares
                  </span>
                </div>
                <p className="matricula-teacher">Docente: {group.docente.nombre}</p>
                <div className="matricula-actions">
                  <button
                    className="small-button"
                    type="button"
                    disabled={!group.puedeInscribirse || mutation.isPending}
                    onClick={() => mutation.mutate(group.grupoId)}
                  >
                    {mutation.isPending && mutation.variables === group.grupoId
                      ? 'Registrando…'
                      : 'Inscribirme'}
                  </button>
                  {!group.puedeInscribirse &&
                    group.motivo?.includes('lugares disponibles') &&
                    !group.enListaEspera && (
                      <button
                        className="small-button"
                        type="button"
                        disabled={esperar.isPending}
                        onClick={() => esperar.mutate(group.grupoId)}
                      >
                        Unirme a la lista de espera
                      </button>
                    )}
                  {group.enListaEspera && <span className="catalog-state">En lista de espera</span>}
                  {group.tieneCupoReservado && (
                    <strong>¡Tienes un cupo reservado! Confirma la matrícula.</strong>
                  )}
                  {!group.puedeInscribirse && group.motivo && (
                    <span className="catalog-state">{group.motivo}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {oferta.data && <PageControls label="oferta" {...oferta.data} onChange={setOfferPage} />}
        {esperar.isError && (
          <p className="form-error" role="alert">
            {esperar.error.message}
          </p>
        )}
        {mutation.isError && (
          <p className="form-error" role="alert">
            {mutation.error.message}
          </p>
        )}
        {mutation.isSuccess && (
          <p className="form-success" role="status">
            Tu inscripción quedó registrada correctamente.
          </p>
        )}
      </section>

      <section className="matricula-section" aria-labelledby="inscripciones-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">HISTORIAL PERSONAL</p>
            <h2 id="inscripciones-title">Mis inscripciones</h2>
          </div>
        </div>
        {inscripciones.isPending ? (
          <p role="status">Cargando tus inscripciones…</p>
        ) : inscripciones.isError ? (
          <p className="form-error" role="alert">
            {inscripciones.error.message}
          </p>
        ) : inscripciones.data.items.length === 0 ? (
          <p className="empty-state">
            {inscripciones.data.total === 0
              ? 'Todavía no tienes inscripciones registradas.'
              : 'No hay inscripciones en esta página. Regresa a una página anterior.'}
          </p>
        ) : (
          <ul className="matricula-list">
            {inscripciones.data.items.map((enrollment) => (
              <li className="matricula-card" key={enrollment.id}>
                <div className="matricula-card-heading">
                  <div>
                    <span className="catalog-code">{enrollment.grupo.asignatura.clave}</span>
                    <h3>{enrollment.grupo.asignatura.nombre}</h3>
                    <p>
                      {enrollment.grupo.periodo.nombre} · Grupo {enrollment.grupo.clave} ·{' '}
                      {enrollment.creditosSnapshot} créditos
                    </p>
                  </div>
                  <span className={`enrollment-status status-${enrollment.estado.toLowerCase()}`}>
                    {enrollment.estado === 'PENDIENTE'
                      ? 'Pendiente de calificación'
                      : enrollment.estado === 'CALIFICADA'
                        ? 'Calificada'
                        : 'Cancelada'}
                  </span>
                </div>
                <p className="matricula-teacher">Docente: {enrollment.grupo.docente.nombre}</p>
                {enrollment.notaFinal !== null && <p>Calificación final: {enrollment.notaFinal}</p>}
                {enrollment.puedeCancelarse && (
                  <button
                    className="small-button"
                    disabled={cancelar.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          '¿Cancelar esta matrícula? No podrás reinscribirte a la misma asignatura en este periodo.',
                        )
                      )
                        cancelar.mutate(enrollment.id);
                    }}
                  >
                    Cancelar matrícula
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {inscripciones.data && (
          <PageControls
            label="inscripciones"
            {...inscripciones.data}
            onChange={setEnrollmentPage}
          />
        )}
      </section>
      {cancelar.isError && (
        <p className="form-error" role="alert">
          {cancelar.error.message}
        </p>
      )}
      <section className="matricula-section" aria-labelledby="espera-title">
        <h2 id="espera-title">Mis listas de espera</h2>
        <p>
          Si se libera un lugar, tendrás una reserva y recibirás una notificación para completar la
          matrícula.
        </p>
        {listas.isPending ? (
          <p role="status">Cargando listas…</p>
        ) : listas.isError ? (
          <p role="alert">{listas.error.message}</p>
        ) : listas.data.length ? (
          <ul className="matricula-list">
            {listas.data.map((item) => (
              <li className="matricula-card" key={item.id}>
                <strong>{item.grupo.planAsignatura.asignatura.nombre}</strong>
                <p>
                  {item.grupo.periodo.nombre} · Grupo {item.grupo.clave} · Estado: {item.estado}
                </p>
                {['ESPERANDO', 'OFRECIDO'].includes(item.estado) && (
                  <button
                    className="small-button"
                    disabled={retirarEspera.isPending}
                    onClick={() => retirarEspera.mutate(item.id)}
                  >
                    Salir de la lista
                  </button>
                )}
                {item.estado === 'OFRECIDO' && (
                  <strong>
                    Hay lugar reservado: vuelve a la oferta para confirmar tu inscripción.
                  </strong>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No estás en ninguna lista de espera.</p>
        )}
        {retirarEspera.isError && (
          <p role="alert" className="form-error">
            {retirarEspera.error.message}
          </p>
        )}
      </section>
    </section>
  );
}

function PageControls({
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
      <button
        type="button"
        className="outline-button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </button>
      <span>
        Página {page} de {Math.max(1, Math.ceil(total / pageSize))} · {total} registros
      </span>
      <button
        type="button"
        className="outline-button"
        disabled={page * pageSize >= total}
        onClick={() => onChange(page + 1)}
      >
        Siguiente
      </button>
    </nav>
  );
}
