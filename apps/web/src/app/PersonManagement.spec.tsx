import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { PersonManagement } from './PersonManagement';
import * as personasService from '../services/personas';
import * as catalogosService from '../services/catalogos';

vi.mock('../services/personas', () => ({
  estadosEstudiante: ['ACTIVO', 'BAJA_TEMPORAL', 'BAJA_DEFINITIVA', 'EGRESADO'],
  getEstudiantes: vi.fn(),
  getDocentes: vi.fn(),
  createEstudiante: vi.fn(),
  updateEstudiante: vi.fn(),
  createDocente: vi.fn(),
  updateDocente: vi.fn(),
}));

vi.mock('../services/catalogos', () => ({
  getPlanes: vi.fn(),
}));

const adminSession = {
  id: 'admin',
  rol: 'ADMINISTRADOR' as const,
  correo: 'admin@example.invalid',
  csrfToken: 'csrf',
  persona: null,
};

function renderPersonas() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PersonManagement session={adminSession} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

it('cumple semántica tablist/tab/tabpanel, navegación por teclado y cancelación con Escape', async () => {
  vi.mocked(personasService.getEstudiantes).mockResolvedValue({
    items: [
      {
        id: 'est-1',
        correo: 'elena@example.invalid',
        matricula: '20260001',
        nombre: 'Elena Nájera',
        planId: 'plan-1',
        fechaIngreso: '2026-01-15',
        estado: 'ACTIVO',
        accesoActivo: true,
        plan: {
          id: 'plan-1',
          version: 1,
          nombre: 'Plan 2026',
          programa: { id: 'prog-1', clave: 'ISC', nombre: 'Ingeniería' },
        },
        historial: { inscripciones: 2, certificados: 0 },
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
  });
  vi.mocked(personasService.getDocentes).mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  });
  vi.mocked(catalogosService.getPlanes).mockResolvedValue({
    items: [
      {
        id: 'plan-1',
        programaId: 'prog-1',
        version: 1,
        nombre: 'Plan 2026',
        activo: true,
        revision: 1,
        programa: { id: 'prog-1', clave: 'ISC', nombre: 'Ingeniería', activo: true },
        _count: { asignaturas: 5, estudiantes: 1 },
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
  });

  renderPersonas();

  const tablist = screen.getByRole('tablist', { name: 'Tipo de persona' });
  const [tabEstudiantes, tabDocentes] = within(tablist).getAllByRole('tab');
  expect(tabEstudiantes).toHaveAttribute('aria-selected', 'true');
  expect(tabEstudiantes).toHaveAttribute('tabIndex', '0');
  expect(tabEstudiantes).toHaveAttribute('aria-controls', 'person-panel-estudiantes');
  expect(tabDocentes).toHaveAttribute('aria-selected', 'false');
  expect(tabDocentes).toHaveAttribute('tabIndex', '-1');

  const panelEstudiantes = screen.getByRole('tabpanel');
  expect(panelEstudiantes).toHaveAttribute('id', 'person-panel-estudiantes');
  expect(panelEstudiantes).toHaveAttribute('aria-labelledby', 'person-tab-estudiantes');

  // Editar estudiante y cancelar con Escape
  fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
  expect(screen.getByRole('heading', { name: 'Editar estudiante' })).toBeInTheDocument();
  const matriculaInput = screen.getByLabelText('Matrícula');
  expect(matriculaInput).toHaveValue('20260001');
  fireEvent.keyDown(matriculaInput, { key: 'Escape' });
  expect(screen.getByRole('heading', { name: 'Alta de estudiante' })).toBeInTheDocument();

  // Navegación con flechas entre pestañas
  fireEvent.keyDown(tabEstudiantes!, { key: 'ArrowRight' });
  expect(tabDocentes).toHaveAttribute('aria-selected', 'true');
  expect(tabDocentes).toHaveFocus();
  expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'person-panel-docentes');

  fireEvent.keyDown(tabDocentes!, { key: 'Home' });
  expect(tabEstudiantes).toHaveAttribute('aria-selected', 'true');
  expect(tabEstudiantes).toHaveFocus();
});

it('permite buscar y paginar más de 50 personas y conserva el plan histórico inactivo fuera de la primera página al editar', async () => {
  const allStudents = Array.from({ length: 55 }, (_, index) => {
    const num = index + 1;
    return {
      id: `est-${num}`,
      correo: `est${num}@example.invalid`,
      matricula: `2026${String(num).padStart(4, '0')}`,
      nombre: `Estudiante ${num} Apellido ${num}`,
      planId: num === 55 ? 'plan-inactivo-60' : 'plan-1',
      fechaIngreso: '2026-01-15',
      estado: 'ACTIVO' as const,
      accesoActivo: true,
      plan:
        num === 55
          ? {
              id: 'plan-inactivo-60',
              version: 1,
              nombre: 'Plan Histórico Inactivo 2015',
              programa: {
                id: 'prog-60',
                clave: 'OLD',
                nombre: 'Programa Histórico',
              },
            }
          : {
              id: 'plan-1',
              version: 1,
              nombre: 'Plan 2026',
              programa: { id: 'prog-1', clave: 'ISC', nombre: 'Ingeniería' },
            },
      historial: { inscripciones: 1, certificados: 0 },
    };
  });

  vi.mocked(personasService.getEstudiantes).mockImplementation(
    async (q = '', page = 1, pageSize = 10) => {
      const normalized = q.trim().toLowerCase();
      const filtered = allStudents.filter(
        (item) =>
          !normalized ||
          item.matricula.toLowerCase().includes(normalized) ||
          item.nombre.toLowerCase().includes(normalized),
      );
      return {
        items: filtered.slice((page - 1) * pageSize, page * pageSize),
        page,
        pageSize,
        total: filtered.length,
      };
    },
  );
  vi.mocked(personasService.getDocentes).mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 10,
    total: 0,
  });
  vi.mocked(catalogosService.getPlanes).mockResolvedValue({
    items: [
      {
        id: 'plan-1',
        programaId: 'prog-1',
        version: 1,
        nombre: 'Plan 2026',
        activo: true,
        revision: 1,
        programa: { id: 'prog-1', clave: 'ISC', nombre: 'Ingeniería', activo: true },
        _count: { asignaturas: 5, estudiantes: 54 },
      },
    ],
    page: 1,
    pageSize: 20,
    total: 55,
  });

  renderPersonas();

  await screen.findByText('1–10 de 55');

  for (let next = 2; next <= 6; next++) {
    const pagination = screen.getByLabelText('Paginación');
    fireEvent.click(within(pagination).getByRole('button', { name: 'Siguiente' }));
    const start = (next - 1) * 10 + 1;
    const end = Math.min(next * 10, 55);
    await screen.findByText(`${start}–${end} de 55`);
  }
  expect(screen.getByText('Estudiante 55 Apellido 55')).toBeInTheDocument();

  // También localizable por búsqueda directa
  fireEvent.change(screen.getByLabelText('Buscar estudiante'), {
    target: { value: '20260055' },
  });
  await waitFor(() => expect(screen.getByText('1–1 de 1')).toBeInTheDocument());

  // Al editar Estudiante 55, el selector de Plan de estudio conserva la opción histórica inactiva fuera de la página 1
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  const planSelect = screen.getByLabelText('Plan de estudio');
  await waitFor(() => expect(planSelect).toHaveValue('plan-inactivo-60'));
  expect(
    within(planSelect).getByRole('option', {
      name: /Programa Histórico · Plan Histórico Inactivo 2015 v1/,
    }),
  ).toBeInTheDocument();
});
