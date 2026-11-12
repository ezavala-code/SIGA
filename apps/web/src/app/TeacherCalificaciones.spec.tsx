import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { TeacherCalificaciones } from './TeacherCalificaciones';
import { clearTeacherDrafts, hasTeacherDrafts } from './teacherDrafts';

afterEach(() => {
  clearTeacherDrafts();
  vi.unstubAllGlobals();
});

it('conserva las dos filas al fallar y permite reintentar o descartar tras conflicto 409', async () => {
  let version = 1;
  let betoSaved = false;
  const items = () => [
    {
      inscripcionId: 'uno',
      version,
      estado: 'CALIFICADA',
      notaFinal: version === 1 ? '8' : '9',
      creditos: '6',
      estudiante: { id: 'a', matricula: 'A', nombre: 'Ana' },
    },
    {
      inscripcionId: 'dos',
      version: betoSaved ? 2 : 1,
      estado: betoSaved ? 'CALIFICADA' : 'PENDIENTE',
      notaFinal: betoSaved ? '6' : null,
      creditos: '6',
      estudiante: { id: 'b', matricula: 'B', nombre: 'Beto' },
    },
  ];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (options?.method === 'PUT') {
        if (url.includes('/dos')) {
          betoSaved = true;
          return new Response(
            JSON.stringify({
              inscripcionId: 'dos',
              version: 2,
              estado: 'CALIFICADA',
              notaFinal: '6',
            }),
            { status: 200 },
          );
        }
        version = 2;
        return new Response(JSON.stringify({ message: 'La inscripción cambió.' }), { status: 409 });
      }
      return new Response(
        JSON.stringify({
          grupo: {
            id: 'g',
            clave: 'G',
            asignatura: { clave: 'X', nombre: 'Materia' },
            periodo: { nombre: 'Periodo' },
            politica: { decimales: 0, escalaMinima: '0', escalaMaxima: '10' },
          },
          items: items(),
          page: 1,
          pageSize: 100,
          total: 2,
        }),
      );
    }),
  );
  const confirmMock = vi.fn(() => true);
  vi.stubGlobal('confirm', confirmMock);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/docente/grupos/g/calificaciones']}>
        <Routes>
          <Route
            path="/docente/grupos/:grupoId/calificaciones"
            element={
              <TeacherCalificaciones
                session={{
                  id: 'docente',
                  rol: 'DOCENTE',
                  csrfToken: 'token',
                  correo: 'docente@example.invalid',
                  persona: null,
                }}
              />
            }
          />
          <Route
            path="/docente/grupos"
            element={<Link to="/docente/grupos/g/calificaciones">Volver a captura</Link>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  fireEvent.change(await screen.findByLabelText('Nota final de Ana'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Motivo de corrección para Ana'), {
    target: { value: 'Revisión' },
  });
  fireEvent.change(screen.getByLabelText('Nota final de Beto'), { target: { value: '6' } });
  fireEvent.click(screen.getByRole('button', { name: 'Corregir' }));
  await screen.findByText(/No se pudo guardar la calificación de Ana/);
  await screen.findByText(/Valor actual: 9/);
  expect(screen.getByLabelText('Nota final de Ana')).toHaveValue(7);
  expect(screen.getByLabelText('Motivo de corrección para Ana')).toHaveValue('Revisión');
  expect(screen.getByLabelText('Nota final de Beto')).toHaveValue(6);
  expect(screen.getByRole('button', { name: 'Corregir' })).toBeDisabled();

  // Guardar la fila de Beto funciona mientras Ana permanece en conflicto con su borrador intacto
  fireEvent.click(screen.getByRole('button', { name: 'Guardar nota' }));
  await screen.findByText('Calificación guardada y auditada.');
  expect(screen.getByLabelText('Nota final de Ana')).toHaveValue(7);
  expect(screen.getByLabelText('Motivo de corrección para Ana')).toHaveValue('Revisión');

  // Reintentar tras revisar el valor actual habilita nuevamente el botón Corregir
  fireEvent.click(screen.getByRole('button', { name: 'Revisé el valor actual' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Corregir' })).toBeEnabled());

  // Si el usuario cancela el diálogo de confirmación, no abandona la vista
  confirmMock.mockReturnValueOnce(false);
  fireEvent.click(screen.getByRole('link', { name: 'Volver a mis grupos' }));
  expect(confirmMock).toHaveBeenCalledWith('Hay cambios sin guardar. ¿Deseas salir?');
  expect(screen.getByLabelText('Nota final de Ana')).toHaveValue(7);

  // Si confirma, sale y al regresar recupera el borrador de la sesión actual
  confirmMock.mockReturnValueOnce(true);
  fireEvent.click(screen.getByRole('link', { name: 'Volver a mis grupos' }));
  fireEvent.click(screen.getByRole('link', { name: 'Volver a captura' }));
  expect(await screen.findByLabelText('Nota final de Ana')).toHaveValue(7);
  expect(screen.getByLabelText('Motivo de corrección para Ana')).toHaveValue('Revisión');
});

it('permite descartar el borrador en conflicto 409 y limpia borradores al cerrar sesión', async () => {
  let version = 1;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_input: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method === 'PUT') {
        version = 2;
        return new Response(JSON.stringify({ message: 'Conflicto de versión.' }), { status: 409 });
      }
      return new Response(
        JSON.stringify({
          grupo: {
            id: 'g',
            clave: 'G',
            asignatura: { clave: 'X', nombre: 'Materia' },
            periodo: { nombre: 'Periodo' },
            politica: { decimales: 0, escalaMinima: '0', escalaMaxima: '10' },
          },
          items: [
            {
              inscripcionId: 'uno',
              version,
              estado: 'CALIFICADA',
              notaFinal: version === 1 ? '8' : '9',
              creditos: '6',
              estudiante: { id: 'a', matricula: 'A', nombre: 'Ana' },
            },
          ],
          page: 1,
          pageSize: 100,
          total: 1,
        }),
      );
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/docente/grupos/g/calificaciones']}>
        <Routes>
          <Route
            path="/docente/grupos/:grupoId/calificaciones"
            element={
              <TeacherCalificaciones
                session={{
                  id: 'docente',
                  rol: 'DOCENTE',
                  csrfToken: 'token-1',
                  correo: 'docente@example.invalid',
                  persona: null,
                }}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  fireEvent.change(await screen.findByLabelText('Nota final de Ana'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Motivo de corrección para Ana'), {
    target: { value: 'Error de captura' },
  });
  expect(hasTeacherDrafts()).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: 'Corregir' }));
  await screen.findByText(/Valor actual: 9/);
  fireEvent.click(screen.getByRole('button', { name: 'Descartar borrador' }));

  await waitFor(() => expect(screen.getByLabelText('Nota final de Ana')).toHaveValue(9));
  expect(screen.queryByLabelText('Motivo de corrección para Ana')).not.toBeInTheDocument();
  expect(hasTeacherDrafts()).toBe(false);

  // Nuevo borrador se limpia al cerrar sesión (clearTeacherDrafts)
  fireEvent.change(screen.getByLabelText('Nota final de Ana'), { target: { value: '10' } });
  await waitFor(() => expect(hasTeacherDrafts()).toBe(true));
  clearTeacherDrafts();
  expect(hasTeacherDrafts()).toBe(false);
});
