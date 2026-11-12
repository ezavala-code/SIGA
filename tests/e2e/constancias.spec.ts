import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { Pool } from 'pg';
import { certificateJourney } from './fixtures';

async function iniciarSesion(page: Page, account: { email: string; password: string }) {
  await page.goto('/acceso');
  await page.getByLabel('Correo electrónico').fill(account.email);
  await page.getByLabel('Contraseña').fill(account.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

test('emite, verifica, revoca y reemite una constancia con auditoría', async ({
  page,
  browser,
}, testInfo) => {
  const fixture = certificateJourney(testInfo.project.name);
  const databaseUrl = new URL(process.env.DATABASE_URL ?? '');
  const schema = databaseUrl.searchParams.get('schema');
  if (!schema || !/^siga_e2e_[a-f0-9]{32}$/.test(schema))
    throw new Error('El recorrido requiere un esquema E2E temporal.');
  databaseUrl.searchParams.delete('schema');
  const pool = new Pool({ connectionString: databaseUrl.toString() });
  const adminContext = await browser.newContext({ baseURL: process.env.SIGA_E2E_BASE_URL });
  const publicContext = await browser.newContext({ baseURL: process.env.SIGA_E2E_BASE_URL });
  try {
    await iniciarSesion(page, fixture.student);
    await expect(page.getByRole('heading', { name: 'Espacio de estudiantes' })).toBeVisible();
    await page.goto('/estudiante/certificados');
    await page.getByRole('button', { name: 'Emitir constancia de estudios' }).click();
    const issued = page.getByRole('status').filter({ hasText: 'Constancia emitida. Código:' });
    await expect(issued).toBeVisible();
    const code = (await issued.locator('strong').textContent())?.trim();
    expect(code).toMatch(/^[a-f0-9]{32}$/);
    if (!code) throw new Error('La constancia no devolvió código.');
    const card = page.locator('.certificate-list li').filter({ hasText: code });
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      card.getByRole('link', { name: 'Descargar PDF' }).click(),
    ]);
    const path = await download.path();
    if (!path) throw new Error('No se pudo descargar la constancia.');
    expect((await readFile(path)).subarray(0, 5).toString()).toBe('%PDF-');

    const publicPage = await publicContext.newPage();
    await publicPage.goto(`/verificar/${code}`);
    await expect(publicPage.getByText('Constancia vigente')).toBeVisible();
    await expect(publicPage.getByText('Ana E.', { exact: true })).toBeVisible();

    const adminPage = await adminContext.newPage();
    await iniciarSesion(adminPage, fixture.administrator);
    await expect(
      adminPage.getByRole('heading', { name: 'Administración académica' }),
    ).toBeVisible();
    await adminPage.goto('/administracion/reportes');
    const search = adminPage.getByLabel('Buscar en certificados, grupos y bitácora');
    await search.fill(code);
    const adminCard = adminPage
      .locator('.certificate-admin-list article')
      .filter({ hasText: code });
    await adminCard.getByLabel('Motivo para revocar').fill('Revocación de prueba E2E');
    await adminCard.getByRole('button', { name: 'Revocar' }).click();
    await expect(adminCard.getByText(/Revocado/)).toBeVisible();
    await publicPage.reload();
    await expect(publicPage.getByText('Constancia revocada')).toBeVisible();

    const original = await pool.query<{ id: string; estado: string }>(
      `SELECT id, estado::text FROM "${schema}"."Certificado" WHERE codigo = $1 AND "estudianteId" = $2`,
      [code, fixture.studentId],
    );
    expect(original.rows).toHaveLength(1);
    expect(original.rows[0]?.estado).toBe('REVOCADO');
    const originalId = original.rows[0]!.id;
    await search.fill(originalId);
    const audit = adminPage
      .locator('.audit-list details')
      .filter({ hasText: 'REVOCAR_CERTIFICADO' });
    await expect(audit).toBeVisible();
    await audit.locator('summary').click();
    await expect(audit.getByText(/Revocación de prueba E2E/)).toBeVisible();

    await page.reload();
    await card.getByRole('button', { name: 'Reemitir' }).click();
    await expect(card.getByText(/Reemplazada por/)).toBeVisible();
    const replacements = await pool.query<{ codigo: string; estado: string }>(
      `SELECT codigo, estado::text FROM "${schema}"."Certificado" WHERE "reemplazaId" = $1 AND "estudianteId" = $2`,
      [originalId, fixture.studentId],
    );
    expect(replacements.rows).toHaveLength(1);
    expect(replacements.rows[0]?.estado).toBe('EMITIDO');
    const replacementCode = replacements.rows[0]!.codigo;
    expect(replacementCode).not.toBe(code);
    await publicPage.goto(`/verificar/${replacementCode}`);
    await expect(publicPage.getByText('Constancia vigente')).toBeVisible();
    await publicPage.goto(`/verificar/${code}`);
    await expect(publicPage.getByText('Constancia revocada')).toBeVisible();
  } finally {
    await Promise.all([adminContext.close(), publicContext.close(), pool.end()]);
  }
});
