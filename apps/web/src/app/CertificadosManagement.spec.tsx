import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { ReportsManagement, StudentCertificates } from './CertificadosManagement';
import * as service from '../services/e08';

vi.mock('../services/e08', () => ({
  emitirMiCertificado: vi.fn(),
  getAuditoria: vi.fn(),
  getCertificadosAdministracion: vi.fn(),
  getMisCertificados: vi.fn(),
  getReporteGrupos: vi.fn(),
  getVerificacionCertificado: vi.fn(),
  reemitirCertificado: vi.fn(),
  recuperarCertificado: vi.fn(),
  revocarCertificado: vi.fn(),
}));

const student = {
  id: 'student',
  rol: 'ESTUDIANTE' as const,
  csrfToken: 'csrf',
  correo: 'student@example.invalid',
  persona: null,
};
const admin = { ...student, id: 'admin', rol: 'ADMINISTRADOR' as const };

function renderPage(page: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{page}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.resetAllMocks());

it('recupera una solicitud fallida y actualiza su historial', async () => {
  const certificate = {
    id: 'cert-1',
    tipo: 'ESTUDIOS',
    codigo: 'COD-1',
    estado: 'FALLIDO',
    emitidoEn: null,
    motivoRevocacion: null,
    reemplazo: null,
  };
  vi.mocked(service.getMisCertificados)
    .mockResolvedValueOnce({ items: [certificate] } as never)
    .mockResolvedValue({ items: [{ ...certificate, estado: 'EMITIDO' }] } as never);
  vi.mocked(service.recuperarCertificado).mockResolvedValue(certificate as never);

  renderPage(<StudentCertificates session={student} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Recuperar solicitud' }));
  await waitFor(() => expect(service.recuperarCertificado).toHaveBeenCalledWith('csrf', 'cert-1'));
  expect(await screen.findByRole('link', { name: 'Descargar PDF' })).toHaveAttribute(
    'href',
    '/api/certificados/cert-1/pdf',
  );
  expect(screen.queryByRole('button', { name: 'Recuperar solicitud' })).not.toBeInTheDocument();
});

it('permite intentar de nuevo cuando falla la recuperación', async () => {
  vi.mocked(service.getMisCertificados).mockResolvedValue({
    items: [
      {
        id: 'cert-1',
        tipo: 'ESTUDIOS',
        codigo: 'COD-1',
        estado: 'PENDIENTE',
        emitidoEn: null,
        motivoRevocacion: null,
        reemplazo: null,
      },
    ],
  } as never);
  vi.mocked(service.recuperarCertificado).mockRejectedValue(new Error('No se pudo recuperar'));
  renderPage(<StudentCertificates session={student} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Recuperar solicitud' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo recuperar');
  expect(screen.getByRole('button', { name: 'Recuperar solicitud' })).toBeEnabled();
});

it('pagina reportes por separado y reinicia sus páginas al buscar', async () => {
  const page = (current: number, total = 201) => ({
    items: [],
    page: current,
    pageSize: 100,
    total,
  });
  vi.mocked(service.getReporteGrupos).mockImplementation(async (_q, current = 1) => page(current));
  vi.mocked(service.getCertificadosAdministracion).mockImplementation(async (_q, current = 1) =>
    page(current),
  );
  vi.mocked(service.getAuditoria).mockImplementation(async (_q, current = 1) => page(current));
  renderPage(<ReportsManagement session={admin} />);
  const groups = await screen.findByRole('navigation', { name: 'Paginación de grupos' });
  const certificates = await screen.findByRole('navigation', { name: 'Paginación de constancias' });
  const audits = await screen.findByRole('navigation', { name: 'Paginación de bitácora' });
  fireEvent.click(within(groups).getByRole('button', { name: 'Siguiente' }));
  await waitFor(() =>
    expect(screen.getByRole('navigation', { name: 'Paginación de grupos' })).toHaveTextContent(
      'Página 2 de 3',
    ),
  );
  expect(within(certificates).getByText(/Página 1 de 3/)).toBeInTheDocument();
  fireEvent.click(within(audits).getByRole('button', { name: 'Siguiente' }));
  await waitFor(() =>
    expect(screen.getByRole('navigation', { name: 'Paginación de bitácora' })).toHaveTextContent(
      'Página 2 de 3',
    ),
  );
  fireEvent.change(screen.getByLabelText('Buscar en certificados, grupos y bitácora'), {
    target: { value: 'Ana' },
  });
  await waitFor(() =>
    expect(service.getReporteGrupos).toHaveBeenLastCalledWith(
      'Ana',
      1,
      100,
      expect.any(AbortSignal),
    ),
  );
  await waitFor(() =>
    expect(service.getAuditoria).toHaveBeenLastCalledWith('Ana', 1, 100, expect.any(AbortSignal)),
  );
  await waitFor(() =>
    expect(screen.getByRole('navigation', { name: 'Paginación de grupos' })).toHaveTextContent(
      'Página 1 de 3',
    ),
  );
  await waitFor(() =>
    expect(screen.getByRole('navigation', { name: 'Paginación de bitácora' })).toHaveTextContent(
      'Página 1 de 3',
    ),
  );
});
