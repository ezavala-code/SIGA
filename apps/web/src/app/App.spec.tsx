import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { periodosIcoF19 } from '../data/ico-f19';

const healthy = { status: 'ok', checks: { database: 'up' }, timestamp: new Date().toISOString() };
const student = {
  id: 'usuario-1',
  correo: 'ana@example.invalid',
  rol: 'ESTUDIANTE',
  csrfToken: 'csrf-de-prueba',
  persona: { id: 'alumna-1', nombre: 'Ana Ejemplo', matricula: 'DEMO-E1' },
};
function studentProgress(programKey = 'ICO-F19') {
  return {
    plan: {
      id: 'plan-1',
      nombre: programKey === 'ICO-F19' ? 'Plan F19 · generación 2022B' : 'Plan vigente',
      version: 2019,
      programa: {
        clave: programKey,
        nombre: programKey === 'ICO-F19' ? 'Ingeniería en Computación' : 'Otro programa',
      },
    },
    creditosTotales: '410.00',
    creditosAprobados: '0.00',
    avancePorcentaje: '0.00',
    asignaturasAprobadas: 0,
    asignaturasTotales: 0,
    sinCreditosEnPlan: false,
    politicaPropuesta: false,
  };
}
function renderApp(path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
function mockFetch(
  health: 'ok' | 'unavailable' | 'offline' = 'ok',
  profile: object | null = null,
  programKey = 'ICO-F19',
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/me'))
        return profile
          ? new Response(JSON.stringify(profile))
          : new Response(null, { status: 401 });
      if (url.includes('/estudiantes/me/progreso'))
        return new Response(JSON.stringify(studentProgress(programKey)));
      if (url.includes('/ampliacion/mapa-curricular'))
        return new Response(
          JSON.stringify({
            plan: {
              id: 'plan-1',
              nombre: programKey === 'ICO-F19' ? 'Plan F19 · generación 2022B' : 'Plan vigente',
              version: 2019,
              programa: programKey === 'ICO-F19' ? 'Ingeniería en Computación' : 'Otro programa',
            },
            asignaturas: [
              {
                id: 'mat-1',
                clave: 'MAT-101',
                nombre: 'Matemáticas básicas',
                creditos: '6.00',
                semestre: 1,
                prerequisitosPendientes: [],
                estado: 'DISPONIBLE',
              },
            ],
          }),
        );
      if (url.includes('/health')) {
        if (health === 'offline') throw new Error('sin red');
        return new Response(
          JSON.stringify(
            health === 'ok'
              ? healthy
              : {
                  status: 'unavailable',
                  checks: { database: 'down' },
                  timestamp: healthy.timestamp,
                },
          ),
          { status: health === 'ok' ? 200 : 503 },
        );
      }
      throw new Error(`Ruta inesperada: ${url}`);
    }),
  );
}
afterEach(() => vi.unstubAllGlobals());

describe('Portal y acceso', () => {
  it('muestra disponibilidad y entrada real a las cuentas', async () => {
    mockFetch();
    renderApp();
    expect(await screen.findByText('El servicio está disponible')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Tu trayectoria\.Un solo espacio\./ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/prototipo/i)).not.toBeInTheDocument();
    expect(screen.getByText(/distintos programas y planes de estudio/)).toBeInTheDocument();
    expect(screen.queryByText('ICO-F19')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Explora las funciones de SIGA' })).toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'Licenciatura en Ingeniería en Computación' }),
    ).toBeNull();
    expect(screen.getByRole('link', { name: /acceder a siga/i })).toHaveAttribute(
      'href',
      '/acceso',
    );
  });
  it('permite consultar las optativas del plan ICO-F19', async () => {
    mockFetch('ok', student);
    renderApp('/estudiante/trayectoria');
    fireEvent.click(await screen.findByRole('tab', { name: /optativas/i }));
    expect(screen.getByText('Deep learning')).toBeInTheDocument();
    expect(screen.getByText('Cómputo cuántico')).toBeInTheDocument();
    expect(screen.getByText(/acreditar tres asignaturas optativas/i)).toBeInTheDocument();
  });
  it('no muestra el mapa ICO-F19 a estudiantes de otros programas', async () => {
    mockFetch('ok', student, 'SIS-F20');
    renderApp('/estudiante/trayectoria');

    expect(
      await screen.findByRole('heading', { name: 'Mapa inteligente de Plan vigente' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Otro programa · Plan vigente/)).toBeInTheDocument();
    expect(screen.getByText('Matemáticas básicas')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Licenciatura en Ingeniería en Computación' }),
    ).toBeNull();
    expect(screen.queryByText(/mapa de referencia ICO-F19/i)).toBeNull();
  });
  it('mantiene las funciones de administración en el menú sin repetir las cuatro tarjetas', async () => {
    const admin = { ...student, rol: 'ADMINISTRADOR', persona: null };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/auth/me')) return new Response(JSON.stringify(admin));
        if (url.includes('/auth/usuarios'))
          return new Response(JSON.stringify({ items: [], total: 0, page: 1, pageSize: 20 }));
        throw new Error(`Ruta inesperada: ${url}`);
      }),
    );
    renderApp('/administracion');
    expect(
      await screen.findByRole('heading', { name: 'Administración académica' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Catálogos académicos' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Personas' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Periodos y grupos' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Reportes e historial' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Catálogos y planes' })).toHaveAttribute(
      'href',
      '/administracion/catalogos',
    );
    expect(screen.getByRole('link', { name: 'Estudiantes y docentes' })).toHaveAttribute(
      'href',
      '/administracion/personas',
    );
    expect(screen.getByRole('link', { name: 'Periodos y grupos' })).toHaveAttribute(
      'href',
      '/administracion/oferta',
    );
    expect(screen.getByRole('link', { name: 'Reportes y auditoría' })).toHaveAttribute(
      'href',
      '/administracion/reportes',
    );
  });
  it('mantiene la cantidad de unidades y el carácter obligatorio/optativo del mapa', () => {
    const obligatorias = periodosIcoF19.reduce(
      (total, periodo) => total + periodo.asignaturas.length,
      0,
    );
    const optativas = periodosIcoF19.reduce(
      (total, periodo) => total + (periodo.optativas?.length ?? 0),
      0,
    );

    expect(obligatorias).toBe(57); // 55 UA obligatorias y dos actividades académicas.
    expect(optativas).toBe(24);
    expect(periodosIcoF19[7]?.asignaturas).toContain('Tecnologías computacionales I');
    expect(periodosIcoF19[7]?.optativas).toContain('Reconocimiento de patrones');
    expect(periodosIcoF19[8]?.asignaturas).toContain('Tecnologías computacionales II');
  });
  it('permite recuperar una falla de red al reintentar', async () => {
    let failed = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/auth/me')) return new Response(null, { status: 401 });
        if (!failed) {
          failed = true;
          throw new Error('sin red');
        }
        return new Response(JSON.stringify(healthy));
      }),
    );
    renderApp();
    expect(await screen.findByText('No se pudo conectar con el servicio')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /volver a comprobar/i }));
    expect(await screen.findByText('El servicio está disponible')).toBeInTheDocument();
  });
  it('distingue 503 de disponibilidad correcta', async () => {
    mockFetch('unavailable');
    renderApp();
    expect(await screen.findByText('Servicio temporalmente no disponible')).toBeInTheDocument();
  });
  it('ofrece volver al portal ante una ruta inexistente', () => {
    mockFetch();
    renderApp('/no-existe');
    expect(screen.getByRole('link', { name: /ir al portal/i })).toHaveAttribute('href', '/');
  });
  it('explica un acceso rechazado sin mostrar credenciales en el error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/auth/me')) return new Response(null, { status: 401 });
        if (url.includes('/auth/login'))
          return new Response(JSON.stringify({ message: 'Error' }), { status: 401 });
        throw new Error('Ruta inesperada');
      }),
    );
    renderApp('/acceso');
    fireEvent.change(await screen.findByLabelText('Correo electrónico'), {
      target: { value: 'ana@example.invalid' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'incorrecta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos');
    expect(screen.getByLabelText('Contraseña')).toHaveValue('incorrecta');
  });
  it('redirige al perfil propio tras acceso y lo protege sin sesión', async () => {
    let loggedIn = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/auth/me'))
          return loggedIn
            ? new Response(JSON.stringify(student))
            : new Response(null, { status: 401 });
        if (url.includes('/auth/login')) {
          loggedIn = true;
          return new Response(JSON.stringify({ usuario: student, csrfToken: student.csrfToken }));
        }
        throw new Error('Ruta inesperada');
      }),
    );
    renderApp('/acceso');
    fireEvent.change(await screen.findByLabelText('Correo electrónico'), {
      target: { value: student.correo },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'ClaveFicticiaDePrueba_2026!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(
      await screen.findByRole('heading', { name: 'Espacio de estudiantes' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Matrícula: DEMO-E1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /abrir mi matrícula/i })).toHaveAttribute(
      'href',
      '/estudiante/matriculas',
    );
  });
  it('descarta datos privados al cerrar sesión antes de entrar con otra cuenta', async () => {
    let profile: typeof student | null = student;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/auth/me'))
          return profile
            ? new Response(JSON.stringify(profile))
            : new Response(null, { status: 401 });
        if (url.includes('/auth/logout')) {
          profile = null;
          return new Response(null, { status: 204 });
        }
        if (url.includes('/auth/login')) {
          profile = {
            ...student,
            id: 'usuario-2',
            correo: 'beto@example.invalid',
            csrfToken: 'otro-token',
            persona: { id: 'alumno-2', nombre: 'Beto Ejemplo', matricula: 'DEMO-E2' },
          };
          return new Response(JSON.stringify({ usuario: profile, csrfToken: profile.csrfToken }));
        }
        if (url.includes('/estudiantes/me/progreso'))
          return new Response(JSON.stringify(studentProgress()));
        throw new Error(`Ruta inesperada: ${url}`);
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/estudiante']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByText('Matrícula: DEMO-E1');
    client.setQueryData(['calificaciones', 'propias'], { secreto: 'datos de Ana' });
    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }));
    await screen.findByRole('heading', { name: 'Bienvenido a tu espacio.' });
    expect(client.getQueryData(['calificaciones', 'propias'])).toBeUndefined();
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'beto@example.invalid' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'clave-ficticia' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByText('Matrícula: DEMO-E2')).toBeInTheDocument();
    expect(screen.queryByText('Matrícula: DEMO-E1')).not.toBeInTheDocument();
  });
  it('cierra el acceso cuando una consulta privada informa que la sesión expiró', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    client.setQueryData(['calificaciones', 'propias'], { secreto: 'privado' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        expect(init?.cache).toBe('no-store');
        if (url.includes('/auth/me')) return new Response(JSON.stringify(student));
        if (url.includes('/estudiantes/me/progreso')) return new Response(null, { status: 401 });
        throw new Error(`Ruta inesperada: ${url}`);
      }),
    );
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/estudiante/trayectoria']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole('heading', { name: 'Bienvenido a tu espacio.' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Matrícula: DEMO-E1')).not.toBeInTheDocument();
    expect(client.getQueryData(['calificaciones', 'propias'])).toBeUndefined();
  });
  it('descarta respuestas lentas en vuelo y 401 tardíos de la sesión A cuando ya inició la sesión B', async () => {
    const studentB = {
      ...student,
      id: 'usuario-2',
      correo: 'beto@example.invalid',
      csrfToken: 'csrf-beto',
      persona: { id: 'alumno-2', nombre: 'Beto Ejemplo', matricula: 'DEMO-E2' },
    };
    let activeProfile: typeof student | null = student;
    let resolveSlowProgressA!: (response: Response) => void;
    let resolveSlowCalificaciones401A!: (response: Response) => void;
    let progressCallCount = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        expect(init?.cache).toBe('no-store');
        if (url.includes('/auth/me')) {
          return Promise.resolve(
            activeProfile
              ? new Response(JSON.stringify(activeProfile), {
                  headers: { 'Cache-Control': 'no-store' },
                })
              : new Response(null, { status: 401 }),
          );
        }
        if (url.includes('/auth/logout')) {
          activeProfile = null;
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        if (url.includes('/auth/login')) {
          activeProfile = studentB;
          return Promise.resolve(
            new Response(JSON.stringify({ usuario: studentB, csrfToken: studentB.csrfToken })),
          );
        }
        if (url.includes('/estudiantes/me/progreso')) {
          progressCallCount += 1;
          if (progressCallCount === 1) {
            return new Promise<Response>((resolve) => {
              resolveSlowProgressA = resolve;
            });
          }
          return Promise.resolve(
            new Response(
              JSON.stringify({
                ...studentProgress('SIS-F20'),
                plan: {
                  id: 'plan-beto',
                  nombre: 'Plan exclusivo de Beto',
                  version: 2026,
                  programa: { clave: 'SIS-F20', nombre: 'Sistemas de Beto' },
                },
              }),
              { headers: { 'Cache-Control': 'no-store' } },
            ),
          );
        }
        if (url.includes('/estudiantes/me/calificaciones')) {
          return new Promise<Response>((resolve) => {
            resolveSlowCalificaciones401A = resolve;
          });
        }
        throw new Error(`Ruta inesperada: ${url}`);
      }),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/estudiante/trayectoria']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByText('Cargando tu plan de estudios…');
    fireEvent.click(screen.getByRole('link', { name: 'Calificaciones y avance' }));
    await screen.findByText('Cargando tu historial académico…');

    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }));
    await screen.findByRole('heading', { name: 'Bienvenido a tu espacio.' });

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: studentB.correo },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'ClaveSeguraBeto_2026!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await screen.findByText('Matrícula: DEMO-E2');
    expect(screen.queryByText('Matrícula: DEMO-E1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Mapa curricular de mi plan' }));
    expect(
      await screen.findByText(/Sistemas de Beto · Plan exclusivo de Beto/),
    ).toBeInTheDocument();

    resolveSlowProgressA(
      new Response(
        JSON.stringify({
          ...studentProgress('ICO-F19'),
          plan: {
            id: 'plan-ana',
            nombre: 'Plan privado de Ana',
            version: 2019,
            programa: { clave: 'ICO-F19', nombre: 'Programa privado de Ana' },
          },
        }),
      ),
    );
    resolveSlowCalificaciones401A(new Response(null, { status: 401 }));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByText(/Sistemas de Beto · Plan exclusivo de Beto/)).toBeInTheDocument();
    expect(screen.queryByText(/Plan privado de Ana/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Licenciatura en Ingeniería en Computación/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bienvenido a tu espacio.' })).toBeNull();
  });
  it('muestra el menú académico del estudiante y permite plegar secciones y barra', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes('/auth/me')) return new Response(JSON.stringify(student));
        if (String(input).includes('/estudiantes/me/progreso'))
          return new Response(JSON.stringify(studentProgress()));
        throw new Error(`Ruta inesperada: ${String(input)}`);
      }),
    );
    renderApp('/estudiante');

    expect(
      await screen.findByRole('navigation', { name: 'Funciones de Espacio de estudiantes' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mapa curricular de mi plan' })).toHaveAttribute(
      'href',
      '/estudiante/trayectoria',
    );
    expect(screen.getByRole('link', { name: 'Matrícula e historial' })).toHaveAttribute(
      'href',
      '/estudiante/matriculas',
    );

    const academics = screen.getByRole('button', { name: 'Trayectoria académica' });
    expect(academics).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(academics);
    expect(academics).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('link', { name: 'Mapa curricular de mi plan' }),
    ).not.toBeInTheDocument();
    fireEvent.click(academics);

    fireEvent.click(screen.getByRole('link', { name: 'Mapa curricular de mi plan' }));
    expect(
      await screen.findByRole('heading', { name: 'Trayectoria académica' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Licenciatura en Ingeniería en Computación' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Contraer menú' }));
    expect(screen.getByRole('button', { name: 'Expandir menú' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Expandir menú' }));
    expect(screen.getByRole('link', { name: 'Calificaciones y avance' })).toBeInTheDocument();
  });
  it('envía a acceso a quien abre un perfil protegido sin sesión', async () => {
    mockFetch();
    renderApp('/docente');
    expect(
      await screen.findByRole('heading', { name: 'Bienvenido a tu espacio.' }),
    ).toBeInTheDocument();
  });
});

it('permite buscar cuentas y avanzar mas alla de las primeras 50', async () => {
  const admin = { ...student, rol: 'ADMINISTRADOR', persona: null };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/me')) return new Response(JSON.stringify(admin));
      if (url.includes('/auth/usuarios')) {
        const params = new URL(url, 'http://localhost').searchParams;
        const page = Number(params.get('page'));
        const q = params.get('q');
        return new Response(
          JSON.stringify({
            page,
            pageSize: 20,
            total: q ? 1 : 61,
            items: [
              {
                id: String(page),
                correo: q ? 'buscada@demo.test' : `cuenta${page}@demo.test`,
                rol: 'ESTUDIANTE',
                activo: true,
              },
            ],
          }),
        );
      }
      throw new Error(`Ruta inesperada: ${url}`);
    }),
  );
  renderApp('/administracion');
  await screen.findByText('cuenta1@demo.test');
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  await screen.findByText('cuenta2@demo.test');
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  await screen.findByText('cuenta3@demo.test');
  fireEvent.change(screen.getByLabelText('Buscar cuenta por correo'), {
    target: { value: 'buscada' },
  });
  await screen.findByText('buscada@demo.test');
  expect(screen.getByText(/Página 1/)).toBeInTheDocument();
});
