import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { CatalogManagement } from './CatalogManagement';
import * as service from '../services/catalogos';

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

const adminSession = {
  id: 'admin',
  rol: 'ADMINISTRADOR' as const,
  correo: 'admin@example.invalid',
  csrfToken: 'csrf',
  persona: null,
};

function renderCatalog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CatalogManagement session={adminSession} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

it('cumple semántica tablist/tab/tabpanel y navegación con flechas, Home y End', async () => {
  vi.mocked(service.getProgramas).mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  });
  vi.mocked(service.getAsignaturas).mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  });
  vi.mocked(service.getPlanes).mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  });

  renderCatalog();

  const tablist = screen.getByRole('tablist', { name: 'Catálogos académicos' });
  const tabs = within(tablist).getAllByRole('tab');
  expect(tabs).toHaveLength(3);

  const [tabProgramas, tabAsignaturas, tabPlanes] = tabs;
  expect(tabProgramas).toHaveAttribute('aria-selected', 'true');
  expect(tabProgramas).toHaveAttribute('tabIndex', '0');
  expect(tabProgramas).toHaveAttribute('aria-controls', 'catalog-panel-programas');
  expect(tabAsignaturas).toHaveAttribute('aria-selected', 'false');
  expect(tabAsignaturas).toHaveAttribute('tabIndex', '-1');
  expect(tabPlanes).toHaveAttribute('aria-selected', 'false');
  expect(tabPlanes).toHaveAttribute('tabIndex', '-1');

  const panelProgramas = screen.getByRole('tabpanel');
  expect(panelProgramas).toHaveAttribute('id', 'catalog-panel-programas');
  expect(panelProgramas).toHaveAttribute('aria-labelledby', 'catalog-tab-programas');

  fireEvent.keyDown(tabProgramas!, { key: 'ArrowRight' });
  expect(tabAsignaturas).toHaveAttribute('aria-selected', 'true');
  expect(tabAsignaturas).toHaveFocus();
  expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'catalog-panel-asignaturas');

  fireEvent.keyDown(tabAsignaturas!, { key: 'End' });
  expect(tabPlanes).toHaveAttribute('aria-selected', 'true');
  expect(tabPlanes).toHaveFocus();
  expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'catalog-panel-planes');

  fireEvent.keyDown(tabPlanes!, { key: 'Home' });
  expect(tabProgramas).toHaveAttribute('aria-selected', 'true');
  expect(tabProgramas).toHaveFocus();

  fireEvent.keyDown(tabProgramas!, { key: 'ArrowLeft' });
  expect(tabPlanes).toHaveAttribute('aria-selected', 'true');
  expect(tabPlanes).toHaveFocus();
});

it('permite buscar y paginar más de 100 asignaturas y más de 200 prerrequisitos conservando asignaturas históricas inactivas', async () => {
  const allSubjects = Array.from({ length: 205 }, (_, index) => {
    const num = index + 1;
    return {
      id: `asig-${num}`,
      clave: `ASG-${String(num).padStart(3, '0')}`,
      nombre: `Asignatura ${num}`,
      activo: num !== 205,
    };
  });

  vi.mocked(service.getProgramas).mockResolvedValue({
    items: [
      {
        id: 'prog-1',
        clave: 'ISC',
        nombre: 'Ingeniería en Sistemas',
        activo: true,
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
  });

  vi.mocked(service.getAsignaturas).mockImplementation(async (q = '', page = 1, pageSize = 10) => {
    const normalized = q.trim().toLowerCase();
    const filtered = allSubjects.filter(
      (item) =>
        !normalized ||
        item.clave.toLowerCase().includes(normalized) ||
        item.nombre.toLowerCase().includes(normalized),
    );
    return {
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: filtered.length,
    };
  });

  vi.mocked(service.getPlanes).mockResolvedValue({
    items: [
      {
        id: 'plan-1',
        programaId: 'prog-1',
        version: 1,
        nombre: 'Plan Histórico 2020',
        activo: true,
        revision: 1,
        programa: { id: 'prog-1', clave: 'ISC', nombre: 'Ingeniería en Sistemas', activo: true },
        _count: { asignaturas: 205, estudiantes: 0 },
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
  });

  const planCourses = [
    {
      asignaturaId: 'asig-204',
      creditos: '5.00',
      semestreSugerido: 1,
      prerrequisitos: [],
      asignatura: allSubjects[203]!,
    },
    {
      asignaturaId: 'asig-205',
      creditos: '5.00',
      semestreSugerido: 2,
      prerrequisitos: ['asig-204'],
      asignatura: allSubjects[204]!,
    },
  ];

  vi.mocked(service.getPlan).mockResolvedValue({
    id: 'plan-1',
    programaId: 'prog-1',
    version: 1,
    nombre: 'Plan Histórico 2020',
    activo: true,
    revision: 1,
    contenidoEditable: true,
    historial: { estudiantes: 0, grupos: 0, inscripciones: 0 },
    programa: { id: 'prog-1', clave: 'ISC', nombre: 'Ingeniería en Sistemas', activo: true },
    asignaturas: planCourses,
  });

  renderCatalog();

  fireEvent.click(screen.getByRole('tab', { name: 'Asignaturas' }));
  await screen.findByText('205 registros');

  const searchInput = screen.getByLabelText('Buscar en asignaturas');
  fireEvent.change(searchInput, { target: { value: 'ASG-150' } });
  await waitFor(() => expect(screen.getByText('Asignatura 150')).toBeInTheDocument());
  expect(screen.getByText('1 registros')).toBeInTheDocument();

  fireEvent.change(searchInput, { target: { value: '' } });
  fireEvent.click(screen.getByRole('tab', { name: 'Planes de estudio' }));

  await screen.findByText(/El plan conserva asignaturas que ya fueron dadas de baja/);
  expect(screen.getAllByText('ASG-205 · Asignatura 205')[0]).toBeInTheDocument();

  // Verificar paginación de opciones de asignaturas (>200 registros, 3 páginas de 100)
  const subjectOptionsNav = screen.getByRole('navigation', { name: 'Opciones de asignaturas' });
  expect(subjectOptionsNav).toHaveTextContent('Página 1 de 3 · 205 resultados');
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Opciones de asignaturas' })).getByRole(
      'button',
      { name: 'Siguiente' },
    ),
  );
  await waitFor(() =>
    expect(screen.getByRole('navigation', { name: 'Opciones de asignaturas' })).toHaveTextContent(
      'Página 2 de 3 · 205 resultados',
    ),
  );
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Opciones de asignaturas' })).getByRole(
      'button',
      { name: 'Siguiente' },
    ),
  );
  await waitFor(() =>
    expect(screen.getByRole('navigation', { name: 'Opciones de asignaturas' })).toHaveTextContent(
      'Página 3 de 3 · 205 resultados',
    ),
  );
  const addSelect = screen.getByLabelText('Agregar asignatura activa');
  expect(
    within(addSelect).getByRole('option', { name: 'ASG-203 · Asignatura 203' }),
  ).toBeInTheDocument();
});
