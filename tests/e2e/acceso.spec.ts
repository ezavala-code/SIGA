import { expect, test } from '@playwright/test';
import { account } from './fixtures';
import type { Page } from '@playwright/test';

async function expandirMenu(page: Page) {
  const expandir = page.getByRole('button', { name: 'Expandir menú' });
  if (await expandir.isVisible()) await expandir.click();
}

async function contraerMenuMovil(page: Page) {
  if ((page.viewportSize()?.width ?? 0) > 1000) return;
  const contraer = page.getByRole('button', { name: 'Contraer menú' });
  if (await contraer.isVisible()) await contraer.click();
}

for (const [role, title, path] of [
  ['ESTUDIANTE', 'Espacio de estudiantes', '/estudiante'],
  ['DOCENTE', 'Espacio de docentes', '/docente'],
  ['ADMINISTRADOR', 'Administración académica', '/administracion'],
] as const) {
  test(`${role}: acceso, sesión tras recarga y cierre`, async ({ page }) => {
    const credentials = account(role);
    await page.goto('/acceso');
    await page.getByLabel('Correo electrónico').fill(credentials.email);
    await page.getByLabel('Contraseña').fill(credentials.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    if (role === 'ADMINISTRADOR') {
      await expect(page.getByRole('heading', { name: 'Cuentas activas' })).toBeVisible();
      await expandirMenu(page);
      await page.getByRole('link', { name: 'Catálogos y planes' }).click();
      await contraerMenuMovil(page);
      await expect(page.getByRole('heading', { name: 'Catálogos y planes' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Programas registrados' })).toBeVisible();
      await expect(
        page.getByText('Desarrollo de Software (demostración)', { exact: true }).first(),
      ).toBeVisible();
      await page.getByRole('tab', { name: 'Asignaturas' }).click();
      await expect(page.getByRole('heading', { name: 'Asignaturas registradas' })).toBeVisible();
      await page.getByRole('tab', { name: 'Planes de estudio' }).click();
      await page
        .getByRole('button', { name: /SOFTWARE/ })
        .first()
        .click();
      await expect(
        page
          .locator('.plan-course-title strong')
          .filter({ hasText: 'Fundamentos de programación' })
          .first(),
      ).toBeVisible();
      await page.getByRole('link', { name: 'Volver a administración' }).click();
      await expandirMenu(page);
      await page.getByRole('link', { name: 'Estudiantes y docentes' }).click();
      await contraerMenuMovil(page);
      await expect(page.getByRole('heading', { name: 'Estudiantes y docentes' })).toBeVisible();
      await expect(page.getByText('Ana Ejemplo', { exact: true }).first()).toBeVisible();
      await page.getByRole('tab', { name: 'Docentes' }).click();
      await expect(page.getByRole('heading', { name: 'Docentes registrados' })).toBeVisible();
      await expect(page.getByText('Elena Ejemplo', { exact: true }).first()).toBeVisible();
      await page.getByRole('link', { name: 'Volver a administración' }).click();
      await expandirMenu(page);
      await page.getByRole('link', { name: 'Periodos y grupos' }).click();
      await contraerMenuMovil(page);
      await expect(page.getByRole('heading', { name: 'Periodos y grupos' })).toBeVisible();
      await expect(page.getByText(/propuesta pendiente de aprobación/).first()).toBeVisible();
      await page.getByRole('tab', { name: 'Grupos' }).click();
      await expect(page.getByRole('heading', { name: 'Grupos registrados' })).toBeVisible();
      await expect(page.getByText('Elena Ejemplo', { exact: false }).first()).toBeVisible();
      await page.getByRole('button', { name: 'Editar' }).first().click();
      await expect(page.getByLabel('Cupo')).toBeVisible();
      await page.getByRole('button', { name: 'Cancelar' }).click();
      await page.getByRole('link', { name: 'Volver a administración' }).click();
      await expandirMenu(page);
      await page.getByRole('link', { name: 'Reportes y auditoría' }).click();
      await contraerMenuMovil(page);
      await expect(page.getByRole('heading', { name: 'Reportes e historial' })).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Grupos e historial académico' }),
      ).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Bitácora de cambios' })).toBeVisible();
      await page.getByRole('link', { name: 'Volver' }).click();
    }
    if (role === 'DOCENTE') {
      await page.getByRole('link', { name: 'Consultar mis grupos y calificar' }).click();
      await expect(page.getByRole('heading', { name: 'Mis grupos' })).toBeVisible();
      await expect(
        page.getByText(/Docente: (Elena Ejemplo|Mateo Demostración)/).first(),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0);
      await page.getByRole('link', { name: 'Calificar' }).first().click();
      await expect(page.getByRole('heading', { name: 'Captura de calificaciones' })).toBeVisible();
      await expect(page.getByText(/Escala 0\.000–10\.000/)).toBeVisible();
      await expect(page.getByRole('link', { name: 'Exportar historial CSV' })).toBeVisible();
      await page.getByRole('link', { name: 'Volver a mis grupos' }).click();
      await page.getByRole('link', { name: 'Volver a mi espacio' }).click();
    }
    if (role === 'ESTUDIANTE') {
      await page.getByRole('link', { name: 'Abrir mi matrícula' }).click();
      await expect(page.getByRole('heading', { name: 'Mi matrícula' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Grupos disponibles' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Mis inscripciones' })).toBeVisible();
      await page.getByRole('link', { name: 'Volver a mi espacio' }).click();
      await page.getByRole('link', { name: 'Consultar mi historial' }).click();
      await expect(page.getByRole('heading', { name: 'Calificaciones y avance' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Asignaturas cursadas' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Por periodo' })).toBeVisible();
      await page.getByRole('link', { name: 'Volver a mi espacio' }).click();
      await page.getByRole('link', { name: 'Consultar mis constancias' }).click();
      await expect(page.getByRole('heading', { name: 'Constancias de estudios' })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Emitir constancia de estudios' }),
      ).toBeEnabled();
      await page.goto('/verificar/00000000000000000000000000000000');
      await expect(page.getByText('Código inexistente')).toBeVisible();
      await page.goto('/administracion/catalogos');
      await expect(page.getByRole('heading', { name: /Tu trayectoria/ })).toBeVisible();
      await page.goto('/administracion/personas');
      await expect(page.getByRole('heading', { name: /Tu trayectoria/ })).toBeVisible();
      await page.goto('/administracion/reportes');
      await expect(page.getByRole('heading', { name: /Tu trayectoria/ })).toBeVisible();
      await page.goto(path);
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
    }
    await expandirMenu(page);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('heading', { name: 'Bienvenido a tu espacio.' })).toBeVisible();
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Bienvenido a tu espacio.' })).toBeVisible();
  });
}

test('CP-16 / PB-25: aislamiento A->B, respuesta tardía y cabeceras anti-caché', async ({
  page,
}) => {
  const userA = account('ESTUDIANTE');
  const userB = account('ESTUDIANTE_2');

  await page.goto('/acceso');
  await page.getByLabel('Correo electrónico').fill(userA.email);
  await page.getByLabel('Contraseña').fill(userA.password);
  const loginResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/auth/login') && res.status() === 200,
  );
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  const loginResponse = await loginResponsePromise;
  expect(loginResponse.headers()['cache-control'] ?? '').toContain('no-store');
  await expect(page.getByRole('heading', { name: 'Espacio de estudiantes' })).toBeVisible();
  await expect(page.getByText('Sesión de Ana Ejemplo')).toBeVisible();

  const calificacionesResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/estudiantes/me/calificaciones') && res.status() === 200,
  );
  await page.getByRole('link', { name: 'Consultar mi historial' }).click();
  const calificacionesResponse = await calificacionesResponsePromise;
  expect(calificacionesResponse.headers()['cache-control'] ?? '').toContain('no-store');
  await expect(page.getByRole('heading', { name: 'Calificaciones y avance' })).toBeVisible();

  // Preparar una petición lenta iniciada durante la sesión de A.
  let releaseDelayedA!: () => void;
  const delayedAGate = new Promise<void>((resolve) => {
    releaseDelayedA = resolve;
  });
  let interceptedSlow200 = false;

  await page.route('**/api/certificados/me*', async (route) => {
    if (!interceptedSlow200) {
      interceptedSlow200 = true;
      await delayedAGate;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'cache-control': 'no-store' },
        body: JSON.stringify({
          items: [
            {
              id: 'cert-residual-a',
              tipo: 'ESTUDIOS',
              codigo: 'SIGA-RESIDUAL-SESION-A',
              estado: 'EMITIDO',
              emitidoEn: '2026-03-01T12:00:00.000Z',
              motivoRevocacion: null,
              reemplazo: null,
            },
          ],
        }),
      });
      return;
    }
    await route.continue();
  });

  // Iniciar peticiones en vuelo dentro de la sesión de A antes de cerrar sesión
  await page.goto('/estudiante/certificados');
  await expect.poll(() => interceptedSlow200).toBe(true);

  // Cerrar sesión de A e iniciar sesión como Usuario B en la misma pestaña
  await expandirMenu(page);
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('heading', { name: 'Bienvenido a tu espacio.' })).toBeVisible();
  await expect(page.getByText('Ana Ejemplo')).toHaveCount(0);

  await page.getByLabel('Correo electrónico').fill(userB.email);
  await page.getByLabel('Contraseña').fill(userB.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await expect(page.getByRole('heading', { name: 'Espacio de estudiantes' })).toBeVisible();
  await expect(page.getByText('Sesión de Bruno Demostración')).toBeVisible();
  await expect(page.getByText('Ana Ejemplo')).toHaveCount(0);

  // Resolver las respuestas tardías de la sesión A cuando ya está activa la sesión de B
  releaseDelayedA();
  if ((page.viewportSize()?.width ?? 0) <= 1000) {
    const collapseMenu = page.getByRole('button', { name: 'Contraer menú' });
    if (await collapseMenu.isVisible()) await collapseMenu.click();
  }
  await page.getByRole('link', { name: 'Consultar mis constancias' }).click();
  await expect(page.getByRole('heading', { name: 'Constancias de estudios' })).toBeVisible();
  await expect(page.getByText('SIGA-RESIDUAL-SESION-A')).toHaveCount(0);
  await expect(page.getByText('Ana Ejemplo')).toHaveCount(0);
  await expandirMenu(page);
  await expect(page.getByText('Bruno Demostración').first()).toBeVisible();

  // Verificar que un 401 propio de la sesión activa B limpia el estado privado y redirige a /acceso
  await page.route('**/api/estudiantes/me/calificaciones*', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      headers: { 'cache-control': 'no-store' },
      body: JSON.stringify({ message: 'Sesión expirada.' }),
    });
  });
  await page.goto('/estudiante/calificaciones');
  await expect(page.getByRole('heading', { name: 'Bienvenido a tu espacio.' })).toBeVisible();
  await expect(page.getByText('Bruno Demostración')).toHaveCount(0);
});

test('CP-16: cancela una consulta privada real de A antes de iniciar la sesión B', async ({
  page,
}) => {
  const userA = account('ESTUDIANTE');
  const userB = account('ESTUDIANTE_2');
  let release!: () => void;
  let intercepted!: (request: import('@playwright/test').Request) => void;
  let finishRoute!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requestStarted = new Promise<import('@playwright/test').Request>((resolve) => {
    intercepted = resolve;
  });
  const routeFinished = new Promise<void>((resolve) => {
    finishRoute = resolve;
  });

  await page.route('**/api/estudiantes/me/progreso*', async (route) => {
    const request = route.request();
    intercepted(request);
    try {
      await gate;
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: '{"message":"Sesión anterior"}',
      });
    } catch (error) {
      if (!request.failure()) throw error;
    } finally {
      finishRoute();
    }
  });

  try {
    await page.goto('/acceso');
    await page.getByLabel('Correo electrónico').fill(userA.email);
    await page.getByLabel('Contraseña').fill(userA.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByText('Sesión de Ana Ejemplo')).toBeVisible();
    await page.getByRole('link', { name: 'Consultar mi historial' }).click();
    const request = await requestStarted;
    const failedRequest = page.waitForEvent('requestfailed', (candidate) => candidate === request);
    await expandirMenu(page);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('heading', { name: 'Bienvenido a tu espacio.' })).toBeVisible();
    await failedRequest;
    expect(request.failure()?.errorText).toContain('ERR_ABORTED');

    await page.getByLabel('Correo electrónico').fill(userB.email);
    await page.getByLabel('Contraseña').fill(userB.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByText('Sesión de Bruno Demostración')).toBeVisible();
    release();
    await routeFinished;
    await expect(page.getByText('Sesión de Bruno Demostración')).toBeVisible();
    await expect(page.getByText('Ana Ejemplo')).toHaveCount(0);
  } finally {
    release();
  }
});
