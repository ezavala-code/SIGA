import { expect, test, type Page } from '@playwright/test';
import { Pool } from 'pg';
import { account, journey } from './fixtures';

function database() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  const schema = url.searchParams.get('schema');
  if (!schema || !/^siga_e2e_[a-f0-9]{32}$/.test(schema)) {
    throw new Error('La prueba requiere un esquema E2E temporal.');
  }
  url.searchParams.delete('schema');
  return {
    pool: new Pool({
      connectionString: url.toString(),
      options: `-c search_path=${schema},public`,
    }),
    schema,
  };
}

async function iniciarSesion(page: Page, user: { email: string; password: string }) {
  await page.goto('/acceso');
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.getByLabel('Contraseña').fill(user.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

test('busca y pagina más de 50 cuentas', async ({ page }, testInfo) => {
  const { pool, schema } = database();
  const prefix = `e2e-cuenta-${testInfo.project.name}`;
  try {
    await pool.query(
      `INSERT INTO "${schema}"."Usuario" (correo, "passwordHash", rol, activo, "actualizadoEn")
       SELECT $1 || '-' || lpad(n::text, 3, '0') || '@example.invalid', 'sin-acceso',
              'ESTUDIANTE'::"${schema}"."Rol", true, now()
       FROM generate_series(1, 55) AS n`,
      [prefix],
    );
    await iniciarSesion(page, account('ADMINISTRADOR'));
    await expect(page.getByRole('heading', { name: 'Cuentas activas' })).toBeVisible();
    const search = page.getByLabel('Buscar cuenta por correo');
    await search.fill(prefix);
    const pagination = page.locator('[aria-label="Paginación de cuentas"]');
    await expect(pagination).toContainText('55 cuentas · Página 1');
    await pagination.getByRole('button', { name: 'Siguiente' }).click();
    await expect(pagination).toContainText('55 cuentas · Página 2');
    await pagination.getByRole('button', { name: 'Siguiente' }).click();
    await expect(pagination).toContainText('55 cuentas · Página 3');
    await expect(page.getByText(`${prefix}-055@example.invalid`)).toBeVisible();
    await search.fill(`${prefix}-055`);
    await expect(pagination).toContainText('1 cuentas · Página 1');
    await expect(page.getByText(`${prefix}-055@example.invalid`)).toBeVisible();
  } finally {
    try {
      await pool.query(`DELETE FROM "${schema}"."Usuario" WHERE correo LIKE $1`, [`${prefix}-%`]);
    } finally {
      await pool.end();
    }
  }
});

test('busca y pagina más de 100 grupos propios del docente', async ({ page }, testInfo) => {
  const { pool, schema } = database();
  const teacher = journey(testInfo.project.name).teacher;
  const prefix = `E2E-${testInfo.project.name.toUpperCase()}-GRUPO`;
  try {
    const inserted = await pool.query(
      `INSERT INTO "${schema}"."Grupo"
         (clave, "planId", "asignaturaId", "periodoId", "politicaId", "docenteId", cupo, activo)
       SELECT $1 || '-' || lpad(n::text, 3, '0'), base."planId", base."asignaturaId",
              base."periodoId", base."politicaId", base."docenteId", 10, true
       FROM generate_series(1, 105) AS n
       CROSS JOIN LATERAL (
         SELECT g.* FROM "${schema}"."Grupo" g
         JOIN "${schema}"."Docente" d ON d.id = g."docenteId"
         JOIN "${schema}"."Usuario" u ON u.id = d."usuarioId"
         WHERE u.correo = $2 LIMIT 1
       ) base`,
      [prefix, teacher.email],
    );
    expect(inserted.rowCount).toBe(105);
    await iniciarSesion(page, teacher);
    await page.getByRole('link', { name: 'Consultar mis grupos y calificar' }).click();
    const search = page.getByLabel('Buscar grupo, asignatura o periodo');
    await search.fill(prefix);
    const pagination = page.locator('[aria-label="Paginación"]');
    await expect(pagination).toContainText('1–20 de 105');
    for (let current = 2; current <= 6; current++) {
      await pagination.getByRole('button', { name: 'Siguiente' }).click();
      await expect(pagination).toContainText(
        `${(current - 1) * 20 + 1}–${Math.min(current * 20, 105)} de 105`,
      );
    }
    await expect(page.getByText(`${prefix}-105`, { exact: false })).toBeVisible();
    await search.fill(`${prefix}-105`);
    await expect(pagination).toContainText('1–1 de 1');
    await expect(page.getByText(`${prefix}-105`, { exact: false })).toBeVisible();
  } finally {
    try {
      await pool.query(`DELETE FROM "${schema}"."Grupo" WHERE clave LIKE $1`, [`${prefix}-%`]);
    } finally {
      await pool.end();
    }
  }
});

test('CP-17 / PB-26: busca y pagina >100 asignaturas, >50 personas/grupos y conserva opciones históricas inactivas fuera de la primera página al editar', async ({
  page,
}, testInfo) => {
  const { pool, schema } = database();
  const tag = `E2E${testInfo.project.name.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
  const lowerTag = tag.toLowerCase();
  try {
    // 1. Programa base y 55 planes de estudio (el 55 es histórico inactivo)
    const progRes = await pool.query<{ id: string }>(
      `INSERT INTO "${schema}"."Programa" (clave, nombre, activo)
       VALUES ($1, $2, true) RETURNING id`,
      [`${tag}-PROG`, `Programa ${tag}`],
    );
    const programaId = progRes.rows[0]!.id;

    await pool.query(
      `INSERT INTO "${schema}"."PlanEstudio" ("programaId", version, nombre, activo, revision)
       SELECT $1, n, $2 || ' Plan ' || lpad(n::text, 3, '0'), (n < 55), 1
       FROM generate_series(1, 55) AS n`,
      [programaId, tag],
    );
    const plan55Res = await pool.query<{ id: string }>(
      `SELECT id FROM "${schema}"."PlanEstudio" WHERE "programaId" = $1 AND version = 55`,
      [programaId],
    );
    const plan55Id = plan55Res.rows[0]!.id;

    // 2. 105 asignaturas (la 105 es histórica inactiva) vinculadas al plan 55
    await pool.query(
      `INSERT INTO "${schema}"."Asignatura" (clave, nombre, activo)
       SELECT $1 || '-ASG-' || lpad(n::text, 3, '0'), $2 || ' Asignatura ' || lpad(n::text, 3, '0'), (n < 105)
       FROM generate_series(1, 105) AS n`,
      [tag, tag],
    );
    const asig105Res = await pool.query<{ id: string }>(
      `SELECT id FROM "${schema}"."Asignatura" WHERE clave = $1`,
      [`${tag}-ASG-105`],
    );
    const asig105Id = asig105Res.rows[0]!.id;

    await pool.query(
      `INSERT INTO "${schema}"."PlanAsignatura" ("planId", "asignaturaId", creditos, "semestreSugerido")
       VALUES ($1, $2, 6.00, 1)`,
      [plan55Id, asig105Id],
    );

    // 3. 55 estudiantes (el 55 pertenece al plan histórico inactivo 55)
    await pool.query(
      `WITH nuevos_usuarios AS (
         INSERT INTO "${schema}"."Usuario" (correo, "passwordHash", rol, activo, "actualizadoEn")
         SELECT $1 || '-est-' || lpad(n::text, 3, '0') || '@example.invalid',
                'sin-acceso', 'ESTUDIANTE'::"${schema}"."Rol", true, now()
         FROM generate_series(1, 55) AS n
         RETURNING id, correo
       )
       INSERT INTO "${schema}"."Estudiante" ("usuarioId", matricula, nombre, "planId", "fechaIngreso", estado)
       SELECT u.id,
              $2 || '-MAT-' || right(split_part(u.correo, '@', 1), 3),
              $2 || ' Estudiante ' || right(split_part(u.correo, '@', 1), 3),
              $3,
              DATE '2026-01-15',
              'ACTIVO'::"${schema}"."EstadoEstudiante"
       FROM nuevos_usuarios u`,
      [lowerTag, tag, plan55Id],
    );

    // 4. 55 docentes (el 55 está inactivo) y 55 grupos (el 55 usa plan 55 inactivo, asignatura 105 inactiva y docente 55 inactivo)
    await pool.query(
      `WITH nuevos_usuarios AS (
         INSERT INTO "${schema}"."Usuario" (correo, "passwordHash", rol, activo, "actualizadoEn")
         SELECT $1 || '-doc-' || lpad(n::text, 3, '0') || '@example.invalid',
                'sin-acceso', 'DOCENTE'::"${schema}"."Rol", true, now()
         FROM generate_series(1, 55) AS n
         RETURNING id, correo
       )
       INSERT INTO "${schema}"."Docente" ("usuarioId", "numeroEmpleado", nombre, departamento, activo)
       SELECT u.id,
              $2 || '-EMP-' || right(split_part(u.correo, '@', 1), 3),
              $2 || ' Docente ' || right(split_part(u.correo, '@', 1), 3),
              'Sistemas',
              (right(split_part(u.correo, '@', 1), 3) <> '055')
       FROM nuevos_usuarios u`,
      [lowerTag, tag],
    );
    const doc55Res = await pool.query<{ id: string }>(
      `SELECT id FROM "${schema}"."Docente" WHERE "numeroEmpleado" = $1`,
      [`${tag}-EMP-055`],
    );
    const doc55Id = doc55Res.rows[0]!.id;

    const periodRes = await pool.query<{ id: string; politicaId: string }>(
      `SELECT id, "politicaId" FROM "${schema}"."Periodo" ORDER BY inicio DESC LIMIT 1`,
    );
    const { id: periodoId, politicaId } = periodRes.rows[0]!;

    await pool.query(
      `INSERT INTO "${schema}"."Grupo" (clave, "planId", "asignaturaId", "periodoId", "politicaId", "docenteId", cupo, activo)
       SELECT $1 || '-GRP-' || lpad(n::text, 3, '0'), $2, $3, $4, $5, $6, 25, true
       FROM generate_series(1, 55) AS n`,
      [tag, plan55Id, asig105Id, periodoId, politicaId, doc55Id],
    );

    await iniciarSesion(page, account('ADMINISTRADOR'));

    // A) >100 asignaturas en Catálogos
    await page.goto('/administracion/catalogos');
    await page.getByRole('tab', { name: 'Asignaturas' }).click();
    await page.getByLabel('Mostrar archivados').check();
    const catalogSearch = page.getByLabel('Buscar en asignaturas');
    await catalogSearch.fill(`${tag}-ASG-`);
    const catalogPagination = page.locator('[aria-label="Paginación"]');
    await expect(catalogPagination).toContainText('105 registros');
    await catalogSearch.fill(`${tag}-ASG-105`);
    await expect(catalogPagination).toContainText('1 registros');
    await expect(page.getByText(`${tag} Asignatura 105`, { exact: true })).toBeVisible();

    // B) >50 estudiantes en Personas + preservación del plan histórico inactivo fuera de la primera página al editar
    await page.goto('/administracion/personas');
    const studentSearch = page.getByLabel('Buscar estudiante');
    await studentSearch.fill(`${tag}-MAT-`);
    const personPagination = page.locator('[aria-label="Paginación"]');
    await expect(personPagination).toContainText('1–10 de 55');
    await studentSearch.fill(`${tag}-MAT-055`);
    await expect(personPagination).toContainText('1–1 de 1');
    await page.getByRole('button', { name: 'Editar' }).click();
    const studentPlanSelect = page.getByLabel('Plan de estudio', { exact: true });
    await expect(studentPlanSelect).toHaveValue(plan55Id);
    await expect(studentPlanSelect.locator(`option[value="${plan55Id}"]`)).toContainText(
      `${tag} Plan 055 v55`,
    );

    // C) >50 grupos en Oferta + preservación de plan, asignatura y docente históricos inactivos al editar
    await page.goto('/administracion/oferta');
    await page.getByRole('tab', { name: 'Grupos' }).click();
    const groupSearch = page.getByLabel('Buscar grupos');
    await groupSearch.fill(`${tag}-GRP-`);
    const offerPagination = page.locator('[aria-label="Paginación"]');
    await expect(offerPagination).toContainText('1–10 de 55');
    await groupSearch.fill(`${tag}-GRP-055`);
    await expect(offerPagination).toContainText('1–1 de 1');
    await page.getByRole('button', { name: 'Editar' }).click();

    const groupPlanSelect = page.getByLabel('Plan de estudio', { exact: true });
    await expect(groupPlanSelect).toHaveValue(plan55Id);
    const groupSubjectSelect = page.getByLabel('Asignatura del plan', { exact: true });
    await expect(groupSubjectSelect).toHaveValue(asig105Id);
    const groupTeacherSelect = page.getByLabel('Docente activo', { exact: true });
    await expect(groupTeacherSelect).toHaveValue(doc55Id);
    await expect(groupTeacherSelect.locator(`option[value="${doc55Id}"]`)).toContainText(
      'inactivo (histórico)',
    );
  } finally {
    try {
      await pool.query(`DELETE FROM "${schema}"."Grupo" WHERE clave LIKE $1`, [`${tag}-GRP-%`]);
      await pool.query(`DELETE FROM "${schema}"."Estudiante" WHERE matricula LIKE $1`, [
        `${tag}-MAT-%`,
      ]);
      await pool.query(`DELETE FROM "${schema}"."Docente" WHERE "numeroEmpleado" LIKE $1`, [
        `${tag}-EMP-%`,
      ]);
      await pool.query(`DELETE FROM "${schema}"."Usuario" WHERE correo LIKE $1`, [`${lowerTag}-%`]);
      await pool.query(
        `DELETE FROM "${schema}"."PlanAsignatura" WHERE "planId" IN (
           SELECT p.id FROM "${schema}"."PlanEstudio" p
           JOIN "${schema}"."Programa" pr ON pr.id = p."programaId"
           WHERE pr.clave = $1
         )`,
        [`${tag}-PROG`],
      );
      await pool.query(`DELETE FROM "${schema}"."Asignatura" WHERE clave LIKE $1`, [
        `${tag}-ASG-%`,
      ]);
      await pool.query(
        `DELETE FROM "${schema}"."PlanEstudio" WHERE "programaId" IN (
           SELECT id FROM "${schema}"."Programa" WHERE clave = $1
         )`,
        [`${tag}-PROG`],
      );
      await pool.query(`DELETE FROM "${schema}"."Programa" WHERE clave = $1`, [`${tag}-PROG`]);
    } finally {
      await pool.end();
    }
  }
});
