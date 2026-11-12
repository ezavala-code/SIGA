import { test, expect } from '@playwright/test';

test('portal conectado al servicio real y sin desbordamiento horizontal', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'El servicio está disponible' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Explora las funciones/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Licenciatura/ })).toHaveCount(0);
  await page.getByRole('link', { name: /acceder a siga/i }).click();
  await expect(page.getByRole('heading', { name: 'Bienvenido a tu espacio.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('permite volver a inicio desde una ruta desconocida', async ({ page }) => {
  await page.goto('/ruta-inexistente');
  await page.getByRole('link', { name: /ir al portal/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tu trayectoria.');
});
