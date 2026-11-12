import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { TeacherGroups } from './OfertaManagement';
import * as service from '../services/oferta';

vi.mock('../services/oferta', () => ({ getMisGrupos: vi.fn() }));

it('permite llegar a grupos posteriores a 100 y reinicia la pagina al buscar', async () => {
  vi.mocked(service.getMisGrupos).mockImplementation(async (q, page) => ({
    page,
    pageSize: 20,
    total: q ? 1 : 101,
    items: [
      {
        id: String(page),
        clave: q ? 'BUSCADO' : `GRUPO${page}`,
        activo: true,
        asignatura: { clave: 'M1', nombre: 'Materia' },
        plan: { nombre: 'Plan', version: 1, programa: { nombre: 'Programa' } },
        periodo: { clave: 'P1', nombre: 'Periodo', estado: 'ABIERTO' },
        docente: { nombre: 'Docente' },
        ocupacion: 0,
        cupo: 10,
      },
    ] as never,
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TeacherGroups
          session={{
            id: 'docente',
            correo: 'd@demo.test',
            rol: 'DOCENTE',
            csrfToken: 'token',
            persona: null,
          }}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByText('GRUPO1');
  for (let page = 2; page <= 6; page++) {
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByText(`GRUPO${page}`);
  }
  expect(screen.getByRole('link', { name: 'Calificar' })).toHaveAttribute(
    'href',
    '/docente/grupos/6/calificaciones',
  );
  fireEvent.change(screen.getByLabelText('Buscar grupo, asignatura o periodo'), {
    target: { value: 'buscado' },
  });
  await screen.findByText('BUSCADO');
  expect(screen.getByText('1–1 de 1')).toBeInTheDocument();
});
