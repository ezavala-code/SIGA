import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { CatalogManagement } from './CatalogManagement';
import * as catalog from '../services/catalogos';

vi.mock('../services/catalogos', () => ({
  createAsignatura: vi.fn(),
  createPlan: vi.fn(),
  createPlanVersion: vi.fn(),
  createPrograma: vi.fn(),
  getAsignaturas: vi.fn(),
  getPlan: vi.fn(),
  getPlanes: vi.fn(),
  getProgramas: vi.fn(),
  updateAsignatura: vi.fn(),
  updatePlan: vi.fn(),
  updatePlanCourses: vi.fn(),
  updatePrograma: vi.fn(),
}));

it('permite elegir un programa posterior y conserva la selección al buscar', async () => {
  vi.mocked(catalog.getProgramas).mockImplementation(async (q = '', page = 1, size = 100) => ({
    items:
      size === 100 && (page === 2 || q === 'último')
        ? [{ id: 'p101', clave: 'P101', nombre: 'Último', activo: true }]
        : [],
    page,
    pageSize: size,
    total: q ? 1 : 101,
  }));
  vi.mocked(catalog.getAsignaturas).mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 100,
    total: 0,
  });
  vi.mocked(catalog.getPlanes).mockResolvedValue({ items: [], page: 1, pageSize: 10, total: 0 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CatalogManagement
          session={{
            id: 'admin',
            rol: 'ADMINISTRADOR',
            correo: 'admin@example.invalid',
            csrfToken: 'token',
            persona: null,
          }}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('tab', { name: 'Planes de estudio' }));
  const navigation = await screen.findByRole('navigation', { name: 'Opciones de programas' });
  fireEvent.click(within(navigation).getByRole('button', { name: 'Siguiente' }));
  const option = await screen.findByRole('option', { name: 'P101 · Último' });
  fireEvent.change(screen.getByLabelText('Programa activo'), {
    target: { value: option.getAttribute('value') },
  });
  fireEvent.change(screen.getByLabelText('Buscar programa por clave o nombre'), {
    target: { value: 'otra búsqueda' },
  });
  expect(await screen.findByRole('option', { name: 'P101 · Último' })).toBeInTheDocument();
  expect(screen.getByLabelText('Programa activo')).toHaveValue('p101');
});
