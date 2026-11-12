import { expect, test, type Page } from '@playwright/test';
import { Pool } from 'pg';
import { journey } from './fixtures';

async function iniciarSesion(page: Page, account: { email: string; password: string }) {
  await page.goto('/acceso');
  await page.getByLabel('Correo electrónico').fill(account.email);
  await page.getByLabel('Contraseña').fill(account.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

test('matricula, califica y consulta el resultado persistido', async ({
  page,
  browser,
}, testInfo) => {
  const fixture = journey(testInfo.project.name);
  const databaseUrl = new URL(process.env.DATABASE_URL ?? '');
  const schema = databaseUrl.searchParams.get('schema');
  if (!schema || !/^siga_e2e_[a-f0-9]{32}$/.test(schema)) {
    throw new Error('El recorrido requiere un esquema E2E temporal.');
  }
  databaseUrl.searchParams.delete('schema');
  const pool = new Pool({
    connectionString: databaseUrl.toString(),
    options: `-c search_path=${schema},public`,
  });
  const teacherContext = await browser.newContext({ baseURL: process.env.SIGA_E2E_BASE_URL });
  try {
    await iniciarSesion(page, fixture.student);
    await expect(page.getByRole('heading', { name: 'Espacio de estudiantes' })).toBeVisible();
    await page.goto('/estudiante/matriculas');
    const group = page.locator('.matricula-card').filter({ hasText: 'INTRO-ALTERNO' });
    await expect(group.getByRole('button', { name: 'Inscribirme' })).toBeEnabled();
    await group.getByRole('button', { name: 'Inscribirme' }).click();
    await expect(page.getByText('Tu inscripción quedó registrada correctamente.')).toBeVisible();

    const readEnrollment = () =>
      pool.query<{ estado: string; nota: string | null }>(
        `SELECT estado::text, "notaFinal"::text AS nota FROM "${schema}"."Inscripcion" WHERE "estudianteId" = $1 AND "grupoId" = $2`,
        [fixture.studentId, fixture.groupId],
      );
    const enrolled = await readEnrollment();
    expect(enrolled.rows).toEqual([{ estado: 'PENDIENTE', nota: null }]);

    const teacherPage = await teacherContext.newPage();
    await iniciarSesion(teacherPage, fixture.teacher);
    await expect(teacherPage.getByRole('heading', { name: 'Espacio de docentes' })).toBeVisible();
    await teacherPage.goto(`/docente/grupos/${fixture.groupId}/calificaciones`);
    const studentCard = teacherPage.locator('.grade-card').filter({ hasText: 'Carla Prueba' });
    await studentCard.getByLabel('Nota final de Carla Prueba').fill('8.40');
    await studentCard.getByRole('button', { name: 'Guardar nota' }).click();
    await expect(teacherPage.getByText('Calificación guardada y auditada.')).toBeVisible();
    const graded = await readEnrollment();
    expect(graded.rows).toEqual([{ estado: 'CALIFICADA', nota: '8.400' }]);

    await page.goto('/estudiante/calificaciones');
    const history = page.locator('.matricula-card').filter({ hasText: 'INTRO-ALTERNO' });
    await expect(history.getByText(/Nota final: 8[.,]40/)).toBeVisible();
    await expect(history.getByText('Aprobada', { exact: true })).toBeVisible();
    await page.reload();
    await expect(history.getByText(/Nota final: 8[.,]40/)).toBeVisible();
    await expect(page.getByText('Créditos aprobados')).toBeVisible();
    await page.goto('/estudiante/certificados');
    await page.getByRole('button', { name: 'Emitir constancia de estudios' }).click();
    const issued = page.getByRole('status').filter({ hasText: 'Constancia emitida. Código:' });
    await expect(issued).toBeVisible();
    const code = (await issued.locator('strong').textContent())?.trim();
    expect(code).toMatch(/^[a-f0-9]{32}$/);
    const publicContext = await browser.newContext({ baseURL: process.env.SIGA_E2E_BASE_URL });
    try {
      const publicPage = await publicContext.newPage();
      await publicPage.goto(`/verificar/${code}`);
      await expect(publicPage.getByText('Constancia vigente')).toBeVisible();
    } finally {
      await publicContext.close();
    }

    // CP-18 / PB-27: Segundo estudiante en el mismo grupo para probar preservación de borradores, conflicto 409, aviso al navegar y limpieza al cerrar sesión
    const secondTag = `e2e-borrador-${testInfo.project.name}`;
    await pool.query(
      `WITH u AS (
         INSERT INTO "${schema}"."Usuario" (correo, "passwordHash", rol, activo, "actualizadoEn")
         VALUES ($1, 'sin-acceso', 'ESTUDIANTE'::"${schema}"."Rol", true, now())
         RETURNING id
       ),
       e AS (
         INSERT INTO "${schema}"."Estudiante" ("usuarioId", matricula, nombre, "planId", "fechaIngreso", estado)
         SELECT u.id, $2, 'Diego Borrador', g."planId", DATE '2026-01-15', 'ACTIVO'::"${schema}"."EstadoEstudiante"
         FROM u CROSS JOIN "${schema}"."Grupo" g WHERE g.id = $3
         RETURNING id, "planId"
       )
       INSERT INTO "${schema}"."Inscripcion"
         ("estudianteId", "planId", "grupoId", "asignaturaId", "periodoId", "politicaId", estado, "creditosSnapshot", "actualizadoEn")
       SELECT e.id, e."planId", g.id, g."asignaturaId", g."periodoId", g."politicaId",
              'PENDIENTE'::"${schema}"."EstadoInscripcion", pa.creditos, now()
       FROM e
       CROSS JOIN "${schema}"."Grupo" g
       JOIN "${schema}"."PlanAsignatura" pa ON pa."planId" = g."planId" AND pa."asignaturaId" = g."asignaturaId"
       WHERE g.id = $3`,
      [
        `${secondTag}@example.invalid`,
        `MAT-${testInfo.project.name.toUpperCase()}`,
        fixture.groupId,
      ],
    );

    await teacherPage.reload();
    const carlaCard = teacherPage.locator('.grade-card').filter({ hasText: 'Carla Prueba' });
    const diegoCard = teacherPage.locator('.grade-card').filter({ hasText: 'Diego Borrador' });
    await expect(diegoCard).toBeVisible();

    await carlaCard.getByLabel('Nota final de Carla Prueba').fill('9.10');
    await carlaCard
      .getByLabel('Motivo de corrección para Carla Prueba')
      .fill('Revisión de proyecto final');
    await diegoCard.getByLabel('Nota final de Diego Borrador').fill('7.50');

    // Simular cambio concurrente de versión en base de datos para Carla Prueba (provoca 409)
    await pool.query(
      `UPDATE "${schema}"."Inscripcion"
       SET "notaFinal" = 8.800, version = version + 1, "actualizadoEn" = now()
       WHERE "estudianteId" = $1 AND "grupoId" = $2`,
      [fixture.studentId, fixture.groupId],
    );

    await carlaCard.getByRole('button', { name: 'Corregir' }).click();
    await expect(
      teacherPage.getByText(/No se pudo guardar la calificación de Carla Prueba/),
    ).toBeVisible();
    await expect(teacherPage.getByText(/Valor actual: 8[.,]80/)).toBeVisible();

    // Ambos borradores y el motivo de corrección se conservan intactos
    await expect(carlaCard.getByLabel('Nota final de Carla Prueba')).toHaveValue('9.10');
    await expect(carlaCard.getByLabel('Motivo de corrección para Carla Prueba')).toHaveValue(
      'Revisión de proyecto final',
    );
    await expect(diegoCard.getByLabel('Nota final de Diego Borrador')).toHaveValue('7.50');

    // Guardar la calificación de Diego Borrador tiene éxito sin perder el borrador en conflicto de Carla Prueba
    await diegoCard.getByRole('button', { name: 'Guardar nota' }).click();
    await expect(teacherPage.getByText('Calificación guardada y auditada.')).toBeVisible();
    await expect(carlaCard.getByLabel('Nota final de Carla Prueba')).toHaveValue('9.10');
    await expect(carlaCard.getByLabel('Motivo de corrección para Carla Prueba')).toHaveValue(
      'Revisión de proyecto final',
    );

    // Aviso de confirmación antes de salir cuando existen borradores sin guardar (cancelar mantiene en la vista)
    teacherPage.once('dialog', (dialog) => void dialog.dismiss());
    await teacherPage.getByRole('link', { name: 'Volver a mis grupos' }).click();
    await expect(
      teacherPage.getByRole('heading', { name: 'Captura de calificaciones' }),
    ).toBeVisible();
    await expect(carlaCard.getByLabel('Nota final de Carla Prueba')).toHaveValue('9.10');

    // Recuperación del conflicto 409 tras revisar el valor actual y reintentar
    await carlaCard.getByRole('button', { name: 'Revisé el valor actual' }).click();
    await expect(carlaCard.getByRole('button', { name: 'Corregir' })).toBeEnabled();
    await carlaCard.getByRole('button', { name: 'Corregir' }).click();
    await expect(teacherPage.getByText('Calificación guardada y auditada.')).toBeVisible();

    // Un nuevo borrador se limpia al cerrar sesión por privacidad
    await diegoCard.getByLabel('Nota final de Diego Borrador').fill('8.00');
    await diegoCard
      .getByLabel('Motivo de corrección para Diego Borrador')
      .fill('Borrador temporal');
    const expandir = teacherPage.getByRole('button', { name: 'Expandir menú' });
    if (await expandir.isVisible()) await expandir.click();
    teacherPage.once('dialog', (dialog) => void dialog.accept());
    await teacherPage.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(
      teacherPage.getByRole('heading', { name: 'Bienvenido a tu espacio.' }),
    ).toBeVisible();

    await iniciarSesion(teacherPage, fixture.teacher);
    await teacherPage.goto(`/docente/grupos/${fixture.groupId}/calificaciones`);
    await expect(
      teacherPage
        .locator('.grade-card')
        .filter({ hasText: 'Diego Borrador' })
        .getByLabel('Nota final de Diego Borrador'),
    ).toHaveValue(/^7\.50/);
  } finally {
    await teacherContext.close();
    await pool.end();
  }
});
