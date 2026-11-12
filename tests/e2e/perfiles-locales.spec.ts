import { expect, test } from '@playwright/test';
import { account } from './fixtures';

test('mantiene sesiones independientes para los tres roles y dos estudiantes', async ({
  browser,
}) => {
  const roles = [
    ['ADMINISTRADOR', 'Administración académica'],
    ['DOCENTE', 'Espacio de docentes'],
    ['ESTUDIANTE', 'Espacio de estudiantes'],
    ['ESTUDIANTE_2', 'Espacio de estudiantes'],
  ] as const;
  const contexts = await Promise.all(roles.map(() => browser.newContext()));
  try {
    const pages = await Promise.all(contexts.map((context) => context.newPage()));
    await Promise.all(
      roles.map(async ([role, title], index) => {
        const page = pages[index]!;
        const credentials = account(role);
        await page.goto('/acceso');
        await page.getByLabel('Correo electrónico').fill(credentials.email);
        await page.getByLabel('Contraseña').fill(credentials.password);
        await page.getByRole('button', { name: 'Iniciar sesión' }).click();
        await expect(page.getByRole('heading', { name: title })).toBeVisible();
      }),
    );
    await Promise.all(pages.map((page) => page.reload()));
    await Promise.all(
      roles.map(([, title], index) =>
        expect(pages[index]!.getByRole('heading', { name: title })).toBeVisible(),
      ),
    );
    await pages[2]!.goto('/administracion');
    await expect(pages[2]!.getByRole('heading', { name: 'Espacio de estudiantes' })).toBeVisible();
    await pages[2]!.goto('/estudiante');
    await expect(pages[2]!.getByText('Sesión de Ana Ejemplo')).toBeVisible();
    await expect(pages[3]!.getByText('Sesión de Bruno Demostración')).toBeVisible();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
