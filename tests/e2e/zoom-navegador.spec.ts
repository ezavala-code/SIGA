import { chromium, expect, test, type Locator, type Page } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { account } from './fixtures';

async function enfocarConTab(page: Page, target: Locator) {
  for (let step = 0; step < 80; step += 1) {
    if (await target.evaluate((element) => document.activeElement === element)) {
      await expect(target).toBeFocused();
      return;
    }
    await page.keyboard.press('Tab');
  }
  throw new Error('No se alcanzó el control usando Tab.');
}

test('zoom real de Chromium al 200 % y navegación por teclado en los tres roles', async ({
  browserName,
}, info) => {
  test.skip(
    info.project.name !== 'desktop' || browserName !== 'chromium',
    'El zoom se verifica en Chromium de escritorio.',
  );
  const profile = await mkdtemp(join(tmpdir(), 'siga-zoom-real-'));
  const extension = resolve('tests/e2e/zoom-extension');
  const width = 1280;
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      headless: true,
      channel: 'chromium',
      viewport: { width, height: 900 },
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const origin = process.env.SIGA_E2E_BASE_URL ?? 'http://127.0.0.1:5173';
    for (const [role, link, title] of [
      ['ADMINISTRADOR', 'Catálogos y planes', 'Catálogos y planes'],
      ['DOCENTE', 'Consultar mis grupos y calificar', 'Mis grupos'],
      ['ESTUDIANTE', 'Abrir mi matrícula', 'Mi matrícula'],
    ] as const) {
      await context.clearCookies();
      const page = await context.newPage();
      const tabUrl = `${origin}/acceso#zoom-${role}`;
      await page.goto(tabUrl);
      await page.bringToFront();
      const zoom = await worker.evaluate(async (expectedUrl) => {
        const api = (
          globalThis as typeof globalThis & {
            chrome: {
              tabs: {
                query(query: object): Promise<Array<{ id?: number; url?: string }>>;
                setZoom(id: number, factor: number): Promise<void>;
                getZoom(id: number): Promise<number>;
              };
            };
          }
        ).chrome;
        const tab = (await api.tabs.query({})).find((candidate) => candidate.url === expectedUrl);
        if (tab?.id === undefined) throw new Error('No se encontró la pestaña de prueba.');
        await api.tabs.setZoom(tab.id, 2);
        return api.tabs.getZoom(tab.id);
      }, tabUrl);
      expect(zoom).toBe(2);
      await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(Math.round(width / 2));
      expect(await page.evaluate(() => document.documentElement.style.zoom)).toBe('');

      const email = page.getByLabel('Correo electrónico');
      const password = page.getByLabel('Contraseña');
      const submit = page.getByRole('button', { name: 'Iniciar sesión' });
      await enfocarConTab(page, email);
      await page.keyboard.type(account(role).email);
      await enfocarConTab(page, password);
      await page.keyboard.type(account(role).password);
      await enfocarConTab(page, submit);
      await page.keyboard.press('Enter');
      const menu = page.getByRole('button', { name: 'Expandir menú' });
      if (await menu.isVisible()) {
        await enfocarConTab(page, menu);
        await page.keyboard.press('Enter');
      }
      const action = page.getByRole('link', { name: link });
      await expect(action).toBeVisible();
      await enfocarConTab(page, action);
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.close();
    }
  } finally {
    await context?.close();
    await rm(profile, { recursive: true, force: true });
  }
});
