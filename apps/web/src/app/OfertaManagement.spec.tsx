import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { OfertaManagement } from './OfertaManagement';
import * as ofertaService from '../services/oferta';
import * as catalogosService from '../services/catalogos';
import * as personasService from '../services/personas';

vi.mock('../services/oferta', () => ({
  createGrupo: vi.fn(),
  createPeriodo: vi.fn(),
  getGrupos: vi.fn(),
  getMisGrupos: vi.fn(),
  getPeriodos: vi.fn(),
  getPoliticas: vi.fn(),
  updateGrupo: vi.fn(),
  updatePeriodo: vi.fn(),
}));

vi.mock('../services/catalogos', () => ({
  getPlan: vi.fn(),
  getPlanes: vi.fn(),
}));

vi.mock('../services/personas', () => ({
  getDocentes: vi.fn(),
}));

const adminSession = {
  id: 'admin',
  rol: 'ADMINISTRADOR' as const,
  correo: 'admin@example.invalid',
  csrfToken: 'csrf',
  persona: null,
};

function renderOferta() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OfertaManagement session={adminSession} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

it('cumple semántica tablist/tab/tabpanel, navegación con flechas y cierre con Escape', async () => {
  vi.mocked(ofertaService.getPeriodos).mockResolvedValue({
    items: [
      {
        id: 'per-1',
        clave: '2026-1',
        nombre: 'Semestre 2026-1',
        inicio: '2026-01-15',
        fin: '2026-06-15',
        inscripcionInicio: '2026-01-10T15:00:00.000Z',
        inscripcionFin: '2026-01-20T15:00:00.000Z',
        estado: 'ABIERTO',
        politicaId: 'pol-1',
        politica: { id: 'pol-1', version: 'v1', descripcion: 'Política', esPropuesta: true },
        grupos: 2,
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
  });
  vi.mocked(ofertaService.getGrupos).mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  });
  vi.mocked(ofertaService.getPoliticas).mockResolvedValue([
    { id: 'pol-1', version: 1, esPropuesta: true },
  ] as never);
  vi.mocked(catalogosService.getPlanes).mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  });
  vi.mocked(personasService.getDocentes).mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 20,
    total: 0,
  });

  renderOferta();

  const tablist = screen.getByRole('tablist', { name: 'Administración de oferta' });
  const [tabPeriodos, tabGrupos] = within(tablist).getAllByRole('tab');
  expect(tabPeriodos).toHaveAttribute('aria-selected', 'true');
  expect(tabPeriodos).toHaveAttribute('tabIndex', '0');
  expect(tabPeriodos).toHaveAttribute('aria-controls', 'offer-panel-periodos');
  expect(tabGrupos).toHaveAttribute('aria-selected', 'false');
  expect(tabGrupos).toHaveAttribute('tabIndex', '-1');

  const panelPeriodos = screen.getByRole('tabpanel');
  expect(panelPeriodos).toHaveAttribute('id', 'offer-panel-periodos');
  expect(panelPeriodos).toHaveAttribute('aria-labelledby', 'offer-tab-periodos');

  // Abrir formulario de periodo y cerrarlo con Escape
  fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
  const claveInput = screen.getByLabelText('Clave');
  expect(claveInput).toHaveValue('2026-1');
  fireEvent.keyDown(claveInput, { key: 'Escape' });
  expect(screen.queryByLabelText('Clave')).not.toBeInTheDocument();

  // Navegación por teclado entre pestañas
  fireEvent.keyDown(tabPeriodos!, { key: 'ArrowRight' });
  expect(tabGrupos).toHaveAttribute('aria-selected', 'true');
  expect(tabGrupos).toHaveFocus();
  expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'offer-panel-grupos');

  fireEvent.keyDown(tabGrupos!, { key: 'ArrowLeft' });
  expect(tabPeriodos).toHaveAttribute('aria-selected', 'true');
  expect(tabPeriodos).toHaveFocus();
});

it('permite buscar y paginar más de 50 grupos y conserva plan, asignatura, periodo y docente históricos inactivos al editar', async () => {
  const allGroups = Array.from({ length: 55 }, (_, index) => {
    const num = index + 1;
    return {
      id: `grp-${num}`,
      clave: `G-${String(num).padStart(3, '0')}`,
      planId: num === 55 ? 'plan-hist-55' : 'plan-1',
      asignaturaId: num === 55 ? 'asig-inactiva-55' : 'asig-1',
      periodoId: num === 55 ? 'per-cerrado-55' : 'per-1',
      politicaId: 'pol-1',
      docenteId: num === 55 ? 'doc-inactivo-55' : 'doc-1',
      cupo: 30,
      ocupacion: 5,
      activo: true,
      creditosPlan: '6.00',
      semestreSugerido: 1,
      plan:
        num === 55
          ? {
              id: 'plan-hist-55',
              version: 1,
              nombre: 'Plan Histórico Inactivo',
              activo: false,
              programa: { id: 'prog-hist', clave: 'HIS', nombre: 'Programa Histórico' },
            }
          : {
              id: 'plan-1',
              version: 1,
              nombre: 'Plan Vigente',
              activo: true,
              programa: { id: 'prog-1', clave: 'ISC', nombre: 'Ingeniería' },
            },
      asignatura:
        num === 55
          ? {
              id: 'asig-inactiva-55',
              clave: 'HIS-055',
              nombre: 'Asignatura Histórica Inactiva',
              activo: false,
            }
          : {
              id: 'asig-1',
              clave: 'MAT-001',
              nombre: 'Cálculo',
              activo: true,
            },
      periodo:
        num === 55
          ? {
              id: 'per-cerrado-55',
              clave: '2020-1',
              nombre: 'Semestre Cerrado 2020-1',
              inicio: '2020-01-15',
              fin: '2020-06-15',
              inscripcionInicio: '2020-01-10T15:00:00.000Z',
              inscripcionFin: '2020-01-20T15:00:00.000Z',
              estado: 'CERRADO' as const,
            }
          : {
              id: 'per-1',
              clave: '2026-1',
              nombre: 'Semestre 2026-1',
              inicio: '2026-01-15',
              fin: '2026-06-15',
              inscripcionInicio: '2026-01-10T15:00:00.000Z',
              inscripcionFin: '2026-01-20T15:00:00.000Z',
              estado: 'ABIERTO' as const,
            },
      docente:
        num === 55
          ? {
              id: 'doc-inactivo-55',
              numeroEmpleado: 'EMP-055',
              nombre: 'Docente Histórico Inactivo',
              correo: 'doc55@example.invalid',
              departamento: 'Sistemas',
              activo: false,
            }
          : {
              id: 'doc-1',
              numeroEmpleado: 'EMP-001',
              nombre: 'Docente Activo',
              correo: 'doc1@example.invalid',
              departamento: 'Sistemas',
              activo: true,
            },
    };
  });

  vi.mocked(ofertaService.getPeriodos).mockResolvedValue({
    items: [
      {
        id: 'per-1',
        clave: '2026-1',
        nombre: 'Semestre 2026-1',
        inicio: '2026-01-15',
        fin: '2026-06-15',
        inscripcionInicio: '2026-01-10T15:00:00.000Z',
        inscripcionFin: '2026-01-20T15:00:00.000Z',
        estado: 'ABIERTO',
        politicaId: 'pol-1',
        politica: { id: 'pol-1', version: 'v1', descripcion: 'Política', esPropuesta: true },
        grupos: 54,
      },
    ],
    page: 1,
    pageSize: 20,
    total: 55,
  });

  vi.mocked(ofertaService.getGrupos).mockImplementation(async (q = '', page = 1, pageSize = 10) => {
    const normalized = q.trim().toLowerCase();
    const filtered = allGroups.filter(
      (group) =>
        !normalized ||
        group.clave.toLowerCase().includes(normalized) ||
        group.asignatura.nombre.toLowerCase().includes(normalized) ||
        group.docente.nombre.toLowerCase().includes(normalized),
    );
    return {
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: filtered.length,
    };
  });

  vi.mocked(ofertaService.getPoliticas).mockResolvedValue([
    { id: 'pol-1', version: 'v1', esPropuesta: true },
  ] as never);

  vi.mocked(catalogosService.getPlanes).mockResolvedValue({
    items: [
      {
        id: 'plan-1',
        programaId: 'prog-1',
        version: 1,
        nombre: 'Plan Vigente',
        activo: true,
        revision: 1,
        programa: { id: 'prog-1', clave: 'ISC', nombre: 'Ingeniería', activo: true },
        _count: { asignaturas: 5, estudiantes: 1 },
      },
    ],
    page: 1,
    pageSize: 20,
    total: 55,
  });

  vi.mocked(catalogosService.getPlan).mockResolvedValue({
    id: 'plan-hist-55',
    programaId: 'prog-hist',
    version: 1,
    nombre: 'Plan Histórico Inactivo',
    activo: false,
    revision: 1,
    contenidoEditable: false,
    historial: { estudiantes: 1, grupos: 1, inscripciones: 0 },
    programa: { id: 'prog-hist', clave: 'HIS', nombre: 'Programa Histórico', activo: false },
    asignaturas: [
      {
        asignaturaId: 'asig-inactiva-55',
        creditos: '6.00',
        semestreSugerido: 1,
        prerrequisitos: [],
        asignatura: {
          id: 'asig-inactiva-55',
          clave: 'HIS-055',
          nombre: 'Asignatura Histórica Inactiva',
          activo: false,
        },
      },
    ],
  });

  vi.mocked(personasService.getDocentes).mockResolvedValue({
    items: [
      {
        id: 'doc-1',
        correo: 'doc1@example.invalid',
        numeroEmpleado: 'EMP-001',
        nombre: 'Docente Activo',
        departamento: 'Sistemas',
        activo: true,
        accesoActivo: true,
        gruposAsignados: 1,
      },
    ],
    page: 1,
    pageSize: 20,
    total: 55,
  });

  renderOferta();

  fireEvent.click(screen.getByRole('tab', { name: 'Grupos' }));
  await screen.findByText('1–10 de 55');

  // Buscar el grupo 55 situado más allá del antiguo límite de 50
  fireEvent.change(screen.getByLabelText('Buscar grupos'), { target: { value: 'G-055' } });
  await waitFor(() =>
    expect(screen.getByText(/Asignatura Histórica Inactiva/)).toBeInTheDocument(),
  );

  // Editar el grupo histórico y comprobar que conserva plan, asignatura, periodo CERRADO y docente inactivo
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

  const planSelect = await screen.findByLabelText('Plan de estudio');
  expect(planSelect).toHaveValue('plan-hist-55');
  expect(
    within(planSelect).getByRole('option', { name: /HIS · Plan Histórico Inactivo v1/ }),
  ).toBeInTheDocument();

  const subjectSelect = screen.getByLabelText('Asignatura del plan');
  await waitFor(() => expect(subjectSelect).toHaveValue('asig-inactiva-55'));
  expect(
    within(subjectSelect).getByRole('option', {
      name: /HIS-055 · Asignatura Histórica Inactiva/,
    }),
  ).toBeInTheDocument();

  const periodSelect = screen.getByLabelText('Periodo');
  expect(periodSelect).toHaveValue('per-cerrado-55');
  expect(
    within(periodSelect).getByRole('option', {
      name: /2020-1 · Semestre Cerrado 2020-1 · CERRADO/,
    }),
  ).toBeInTheDocument();

  const teacherSelect = screen.getByLabelText('Docente activo');
  expect(teacherSelect).toHaveValue('doc-inactivo-55');
  expect(
    within(teacherSelect).getByRole('option', {
      name: /EMP-055 · Docente Histórico Inactivo · inactivo \(histórico\)/,
    }),
  ).toBeInTheDocument();
});
