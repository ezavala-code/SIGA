import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { StudentMatriculas } from './StudentMatriculas';
import { StudentCalificaciones } from './StudentCalificaciones';
import * as service from '../services/matriculas';
import * as calificacionesService from '../services/calificaciones';

vi.mock('../services/matriculas', () => ({
  getOfertaMatricula: vi.fn(),
  getMisInscripciones: vi.fn(),
  inscribirse: vi.fn(),
}));

vi.mock('../services/calificaciones', () => ({
  getMisCalificaciones: vi.fn(),
  getMiProgreso: vi.fn(),
}));

it('permite recorrer oferta e historial de forma independiente', async () => {
  vi.mocked(service.getOfertaMatricula).mockImplementation(async (page) => ({
    page,
    pageSize: 20,
    total: 101,
    items:
      page === 6
        ? ([
            {
              grupoId: 'g101',
              clave: 'G101',
              creditos: '5',
              cupo: 10,
              ocupacion: 0,
              asignatura: { clave: 'M101', nombre: 'Materia 101' },
              periodo: { nombre: 'Periodo' },
              docente: { nombre: 'Docente' },
              puedeInscribirse: true,
            },
          ] as never)
        : [],
  }));
  vi.mocked(service.getMisInscripciones).mockImplementation(async (page) => ({
    page,
    pageSize: 20,
    total: 201,
    items: [],
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <StudentMatriculas
          session={{
            id: 'estudiante',
            rol: 'ESTUDIANTE',
            correo: 'e@example.invalid',
            csrfToken: 'token',
            persona: null,
          }}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  for (let page = 2; page <= 6; page++) {
    const nav = await screen.findByRole('navigation', { name: 'Paginación de oferta' });
    fireEvent.click(within(nav).getByRole('button', { name: 'Siguiente' }));
    await screen.findByText(`Página ${page} de 6 · 101 registros`);
  }
  expect(screen.getByText('Materia 101')).toBeInTheDocument();
  expect(screen.getByText('Página 1 de 11 · 201 registros')).toBeInTheDocument();
  const history = screen.getByRole('navigation', { name: 'Paginación de inscripciones' });
  fireEvent.click(within(history).getByRole('button', { name: 'Siguiente' }));
  expect(await screen.findByText('Página 2 de 11 · 201 registros')).toBeInTheDocument();
  expect(screen.getByText('Materia 101')).toBeInTheDocument();
});

it('muestra el registro pendiente solo en el grupo elegido', async () => {
  const group = (id: string) => ({
    grupoId: id,
    clave: id,
    creditos: '5',
    cupo: 10,
    ocupacion: 0,
    asignatura: { clave: id, nombre: `Materia ${id}` },
    periodo: { nombre: 'Periodo' },
    docente: { nombre: 'Docente' },
    puedeInscribirse: true,
  });
  vi.mocked(service.getOfertaMatricula).mockResolvedValue({
    page: 1,
    pageSize: 20,
    total: 2,
    items: [group('A'), group('B')] as never,
  });
  vi.mocked(service.getMisInscripciones).mockResolvedValue({
    page: 1,
    pageSize: 20,
    total: 0,
    items: [],
  });
  vi.mocked(service.inscribirse).mockImplementation(() => new Promise(() => {}));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <StudentMatriculas
          session={{
            id: 'estudiante',
            rol: 'ESTUDIANTE',
            correo: 'e@example.invalid',
            csrfToken: 'token',
            persona: null,
          }}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const buttons = await screen.findAllByRole('button', { name: 'Inscribirme' });
  fireEvent.click(buttons[0]!);
  expect(await screen.findByRole('button', { name: 'Registrando…' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Inscribirme' })).toBeDisabled();
});

it('permite buscar y paginar más de 50 asignaturas cursadas en el historial personal', async () => {
  const historyItems = Array.from({ length: 65 }, (_, index) => {
    const num = index + 1;
    return {
      inscripcionId: `ins-${num}`,
      estado: 'CALIFICADA',
      resultado: 'APROBADA',
      notaFinal: '9',
      creditosSnapshot: '5',
      asignatura: {
        id: `asig-${num}`,
        clave: `HIS-${String(num).padStart(3, '0')}`,
        nombre: `Materia Histórica ${num}`,
      },
      grupo: {
        id: `grp-${num}`,
        clave: `G-${num}`,
        docente: 'Docente Demo',
      },
      periodo: {
        id: 'per-1',
        clave: '2026-1',
        nombre: 'Semestre 2026-1',
        politica: {
          version: 1,
          esPropuesta: true,
          minimaAprobatoria: '6',
        },
      },
    };
  });

  vi.mocked(calificacionesService.getMisCalificaciones).mockResolvedValue({
    promedioGeneral: '9.00',
    politicaPropuesta: true,
    periodos: [
      {
        id: 'per-1',
        clave: '2026-1',
        nombre: 'Semestre 2026-1',
        promedio: '9.00',
        intentosCalificados: 65,
      },
    ],
    items: historyItems,
  } as never);
  vi.mocked(calificacionesService.getMiProgreso).mockResolvedValue({
    plan: { id: 'p1', version: 1, nombre: 'Plan 2026' },
    creditosAprobados: '325',
    creditosTotales: '325',
    asignaturasAprobadas: 65,
    asignaturasTotales: 65,
    avancePorcentaje: '100',
    politicaPropuesta: true,
  } as never);

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <StudentCalificaciones
          session={{
            id: 'estudiante',
            rol: 'ESTUDIANTE',
            correo: 'e@example.invalid',
            csrfToken: 'token',
            persona: null,
          }}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  await screen.findByText('Página 1 de 4 · 65 registros');
  const pagination = screen.getByLabelText('Paginación de historial');
  for (let page = 2; page <= 4; page++) {
    fireEvent.click(within(pagination).getByRole('button', { name: 'Siguiente' }));
    await screen.findByText(`Página ${page} de 4 · 65 registros`);
  }
  expect(screen.getByText('Materia Histórica 65')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Buscar asignatura, clave o periodo'), {
    target: { value: 'HIS-058' },
  });
  expect(await screen.findByText('Materia Histórica 58')).toBeInTheDocument();
});
