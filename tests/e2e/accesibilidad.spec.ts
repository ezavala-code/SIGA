import { expect, test } from '@playwright/test';

test('acceso tiene etiquetas, orden de teclado y foco visible en móvil y escritorio', async ({
  page,
}) => {
  await page.goto('/acceso');

  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('heading', { name: 'Bienvenido a tu espacio.' })).toBeVisible();
  const email = page.getByRole('textbox', { name: 'Correo electrónico' });
  const password = page.getByLabel('Contraseña');
  const submit = page.getByRole('button', { name: 'Iniciar sesión' });
  await expect(email).toBeVisible();
  await expect(password).toBeVisible();
  await expect(submit).toBeEnabled();

  for (let i = 0; i < 20; i++) {
    if (await email.evaluate((el) => document.activeElement === el)) break;
    await page.keyboard.press('Tab');
  }
  await expect(email).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(password).toBeFocused();
  expect(await password.evaluate((element) => getComputedStyle(element).outlineWidth)).not.toBe(
    '0px',
  );
  await page.keyboard.press('Tab');
  await expect(submit).toBeFocused();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('el espacio de estudiante ofrece un menú lateral desplazable y plegable', async ({ page }) => {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'usuario-prueba',
        correo: 'alumna@example.invalid',
        rol: 'ESTUDIANTE',
        csrfToken: 'token-e2e-ficticio',
        persona: { id: 'alumna-prueba', nombre: 'Alumna de prueba', matricula: 'TEST-001' },
      }),
    }),
  );
  await page.route('**/api/estudiantes/me/progreso', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        plan: {
          id: 'plan-prueba',
          nombre: 'Plan F19 · generación 2022B',
          version: 2019,
          programa: { clave: 'ICO-F19', nombre: 'Ingeniería en Computación' },
        },
        creditosTotales: '410.00',
        creditosAprobados: '0.00',
        avancePorcentaje: '0.00',
        asignaturasAprobadas: 0,
        asignaturasTotales: 0,
        sinCreditosEnPlan: false,
        politicaPropuesta: false,
      }),
    }),
  );
  await page.goto('/estudiante');

  const sidebar = page.locator('.profile-sidebar');
  await expect(sidebar).toBeVisible();
  await expect(sidebar).toHaveCSS('position', 'fixed');
  const sidebarBox = await sidebar.boundingBox();
  const viewport = page.viewportSize();
  expect(sidebarBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(sidebarBox!.x).toBe(0);
  expect(sidebarBox!.y).toBe(0);
  expect(sidebarBox!.height).toBe(viewport!.height);

  if (await page.evaluate(() => window.innerWidth <= 1000)) {
    await page.getByRole('button', { name: 'Expandir menú' }).click();
  }

  const navigation = page.getByRole('navigation', { name: 'Funciones de Espacio de estudiantes' });
  await expect(navigation).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mapa curricular de mi plan' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Matrícula e historial' })).toBeVisible();
  await expect(page.locator('.profile-sidebar-nav')).toHaveCSS('overflow-y', 'auto');

  const academics = page.getByRole('button', { name: 'Trayectoria académica' });
  await academics.click();
  await expect(page.getByRole('link', { name: 'Mapa curricular de mi plan' })).toBeHidden();
  await academics.click();
  await page.getByRole('link', { name: 'Mapa curricular de mi plan' }).click();
  await expect(page.getByRole('heading', { name: 'Trayectoria académica' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Licenciatura en Ingeniería en Computación' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Contraer menú' }).click();
  await expect(page.getByRole('button', { name: 'Expandir menú' })).toBeVisible();
  await page.getByRole('button', { name: 'Expandir menú' }).click();
  await expect(page.getByRole('link', { name: 'Calificaciones y avance' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
