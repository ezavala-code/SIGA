import { expect, test, type Locator, type Page } from '@playwright/test';
import { account } from './fixtures';

async function tabUntilFocused(page: Page, target: Locator, maxTabs = 50) {
  await expect(target).toBeVisible();
  for (let step = 0; step < maxTabs; step++) {
    const state = await target.evaluate((el) => {
      const active = document.activeElement;
      if (active === el) {
        const style = getComputedStyle(el);
        return {
          focused: true,
          focusVisible:
            el.matches(':focus-visible') &&
            style.outlineStyle !== 'none' &&
            style.outlineWidth !== '0px',
          direction: 'none' as const,
        };
      }
      if (!active || active === document.body || active === document.documentElement) {
        return { focused: false, focusVisible: false, direction: 'forward' as const };
      }
      const pos = active.compareDocumentPosition(el);
      const direction =
        pos & Node.DOCUMENT_POSITION_PRECEDING ? ('backward' as const) : ('forward' as const);
      return { focused: false, focusVisible: false, direction };
    });

    if (state.focused) {
      expect(state.focusVisible).toBe(true);
      return;
    }
    await page.keyboard.press(state.direction === 'backward' ? 'Shift+Tab' : 'Tab');
  }
  await expect(target).toBeFocused();
}

async function assertNoHorizontalOverflow(page: Page) {
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
}

for (const [role, heading, link, destination] of [
  ['ADMINISTRADOR', 'Administración académica', 'Catálogos y planes', 'Catálogos y planes'],
  ['DOCENTE', 'Espacio de docentes', 'Consultar mis grupos y calificar', 'Mis grupos'],
  ['ESTUDIANTE', 'Espacio de estudiantes', 'Abrir mi matrícula', 'Mi matrícula'],
] as const) {
  test(`${role}: navega con Tab real, activa con Enter/Space, cancela con Escape y mantiene zoom 200 % sin desbordamiento`, async ({
    page,
  }) => {
    const user = account(role);
    await page.goto('/acceso');
    await assertNoHorizontalOverflow(page);

    const emailInput = page.getByLabel('Correo electrónico');
    const passwordInput = page.getByLabel('Contraseña');
    const submitButton = page.getByRole('button', { name: 'Iniciar sesión' });

    await tabUntilFocused(page, emailInput);
    await page.keyboard.type(user.email);
    await tabUntilFocused(page, passwordInput);
    await page.keyboard.type(user.password);
    await tabUntilFocused(page, submitButton);
    await page.keyboard.press('Enter');

    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.style.zoom = '200%';
    });
    await assertNoHorizontalOverflow(page);

    const expandButton = page.getByRole('button', { name: 'Expandir menú' });
    const collapseButton = page.getByRole('button', { name: 'Contraer menú' });
    if (await collapseButton.isVisible()) {
      await tabUntilFocused(page, collapseButton);
      // Verificar que Escape cierra/colapsa el menú lateral expandido y devuelve el foco al botón
      await page.keyboard.press('Escape');
      await expect(expandButton).toBeVisible();
      await expect(expandButton).toBeFocused();
      if (role === 'ADMINISTRADOR') {
        await page.keyboard.press('Enter');
      }
    } else if (await expandButton.isVisible()) {
      await tabUntilFocused(page, expandButton);
      await page.keyboard.press('Space');
      await expect(collapseButton).toBeVisible();
      // Verificar que Escape cierra/colapsa el menú lateral expandido y devuelve el foco al botón
      await page.keyboard.press('Escape');
      await expect(expandButton).toBeVisible();
      await expect(expandButton).toBeFocused();
      if (role === 'ADMINISTRADOR') {
        await page.keyboard.press('Enter');
      }
    }

    const action = page.getByRole('link', { name: link });
    await tabUntilFocused(page, action);
    await expect(action).toBeFocused();
    await page.keyboard.press('Enter');

    if (await collapseButton.isVisible()) {
      await page.keyboard.press('Escape');
    }

    await expect(page.getByRole('heading', { name: destination })).toBeVisible();
    await assertNoHorizontalOverflow(page);

    if (role === 'ADMINISTRADOR') {
      const tabProgramas = page.getByRole('tab', { name: 'Programas' });
      const tabAsignaturas = page.getByRole('tab', { name: 'Asignaturas' });
      const tabPlanes = page.getByRole('tab', { name: 'Planes de estudio' });

      await tabUntilFocused(page, tabProgramas);
      await expect(tabProgramas).toHaveAttribute('aria-selected', 'true');
      await page.keyboard.press('ArrowRight');
      await expect(tabAsignaturas).toBeFocused();
      await expect(tabAsignaturas).toHaveAttribute('aria-selected', 'true');
      await page.keyboard.press('End');
      await expect(tabPlanes).toBeFocused();
      await expect(tabPlanes).toHaveAttribute('aria-selected', 'true');
      await page.keyboard.press('Home');
      await expect(tabProgramas).toBeFocused();
      await expect(tabProgramas).toHaveAttribute('aria-selected', 'true');
      await assertNoHorizontalOverflow(page);
    }
  });
}
