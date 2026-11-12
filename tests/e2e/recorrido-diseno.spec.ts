import { expect, test } from '@playwright/test';
import { journey } from './fixtures';

test('recorre matrícula, nota, avance y constancia del programa de diseño', async ({
  page,
  browser,
}, info) => {
  const fixture = journey(info.project.name, 'diseno');
  const teacherContext = await browser.newContext({ baseURL: process.env.SIGA_E2E_BASE_URL });
  const publicContext = await browser.newContext({ baseURL: process.env.SIGA_E2E_BASE_URL });
  try {
    await page.goto('/acceso');
    await page.getByLabel('Correo electrónico').fill(fixture.student.email);
    await page.getByLabel('Contraseña').fill(fixture.student.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.goto('/estudiante/matriculas');
    const group = page.locator('.matricula-card').filter({ hasText: 'VISUAL-ACTUAL' });
    await group.getByRole('button', { name: 'Inscribirme' }).click();
    await expect(page.getByText('Tu inscripción quedó registrada correctamente.')).toBeVisible();

    const teacher = await teacherContext.newPage();
    await teacher.goto('/acceso');
    await teacher.getByLabel('Correo electrónico').fill(fixture.teacher.email);
    await teacher.getByLabel('Contraseña').fill(fixture.teacher.password);
    await teacher.getByRole('button', { name: 'Iniciar sesión' }).click();
    await teacher.goto(`/docente/grupos/${fixture.groupId}/calificaciones`);
    const card = teacher.locator('.grade-card').filter({ hasText: 'Diego Simulado' });
    await card.getByLabel('Nota final de Diego Simulado').fill('8.20');
    await card.getByRole('button', { name: 'Guardar nota' }).click();
    await expect(teacher.getByText('Calificación guardada y auditada.')).toBeVisible();

    await page.goto('/estudiante/calificaciones');
    const history = page.locator('.matricula-card').filter({ hasText: 'VISUAL-ACTUAL' });
    await expect(history.getByText(/Nota final: 8[.,]20/)).toBeVisible();
    await expect(page.getByText('Créditos aprobados')).toBeVisible();
    await page.reload();
    await expect(history.getByText(/Nota final: 8[.,]20/)).toBeVisible();
    await page.goto('/estudiante/certificados');
    await page.getByRole('button', { name: 'Emitir constancia de estudios' }).click();
    const issued = page.getByRole('status').filter({ hasText: 'Constancia emitida. Código:' });
    await expect(issued).toBeVisible();
    const code = (await issued.locator('strong').textContent())?.trim();
    expect(code).toMatch(/^[a-f0-9]{32}$/);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page
        .locator('.certificate-list li')
        .filter({ hasText: code })
        .getByRole('link', { name: 'Descargar PDF' })
        .click(),
    ]);
    expect(await download.path()).toBeTruthy();
    const publicPage = await publicContext.newPage();
    await publicPage.goto(`/verificar/${code}`);
    await expect(publicPage.getByText('Constancia vigente')).toBeVisible();
  } finally {
    await Promise.all([teacherContext.close(), publicContext.close()]);
  }
});
