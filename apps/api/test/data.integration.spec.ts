import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { createDatabaseClient } from '../src/database/client.js';
import { seedData, seedId } from '../src/database/seed-data.js';
import { requireTestDatabaseUrl } from '../src/config/environment.js';
import { type Prisma } from '../src/generated/prisma/client.js';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
const url = requireTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);
const client = createDatabaseClient(url);
const rollback = new Error('ROLLBACK de fixtures');
const sqlError = (code: string) => ({
  code: 'P2010',
  meta: { driverAdapterError: { cause: { originalCode: code } } },
});

async function fixture(
  run: (
    tx: Prisma.TransactionClient,
    id: (name: string) => string,
    namespace: string,
  ) => Promise<void>,
) {
  const namespace = `test-${randomUUID()}`;
  try {
    await client.$transaction(
      async (tx) => {
        await seedData(tx, namespace);
        await run(tx, (name) => seedId(namespace, name), namespace);
        throw rollback;
      },
      { isolationLevel: 'Serializable', timeout: 30000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

beforeAll(async () => {
  const rows = await client.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
  expect(rows[0]?.name).toBe(decodeURIComponent(new URL(url).pathname.slice(1)));
  const migrations = await client.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  expect(Number(migrations[0]?.count)).toBeGreaterThanOrEqual(3);
});
afterAll(async () => {
  await client.$disconnect();
});

describe('Semillas y precisión con PostgreSQL real', () => {
  it('repetir semillas conserva filas y cambios, sin habilitar accesos ni emitir PDFs', async () => {
    await fixture(async (tx, id, namespace) => {
      await tx.estudiante.update({
        where: { id: id('persona-estudiante1') },
        data: { nombre: 'Nombre editado' },
      });
      await seedData(tx, namespace);
      const users = await tx.usuario.findMany({
        where: {
          id: {
            in: [
              'admin',
              'docente1',
              'docente2',
              'estudiante1',
              'estudiante2',
              'estudiante3',
              'estudiante4',
            ].map(id),
          },
        },
      });
      expect(users).toHaveLength(7);
      expect(users.every((u) => !u.activo && u.passwordHash.startsWith('scrypt:'))).toBe(true);
      expect(
        (await tx.estudiante.findUniqueOrThrow({ where: { id: id('persona-estudiante1') } }))
          .nombre,
      ).toBe('Nombre editado');
      expect(
        await tx.certificado.count({ where: { estudianteId: id('persona-estudiante1') } }),
      ).toBe(0);
    });
  });
  it('conserva Decimal exacto y diferencia pendiente, cero y nota aprobada', async () => {
    await fixture(async (tx, id) => {
      expect(
        (
          await tx.inscripcion.findUniqueOrThrow({ where: { id: id('aprobada') } })
        ).notaFinal?.toString(),
      ).toBe('8.5');
      expect(
        (await tx.inscripcion.findUniqueOrThrow({ where: { id: id('ultimo-cupo') } })).notaFinal,
      ).toBeNull();
      const zero = await tx.inscripcion.update({
        where: { id: id('grupo-lleno') },
        data: { estado: 'CALIFICADA', notaFinal: '0' },
      });
      expect(zero.notaFinal?.toString()).toBe('0');
      expect(zero.version).toBe(2);
    });
  });
  it('el rollback elimina únicamente las fixtures de la prueba', async () => {
    let createdId = '';
    await fixture(async (tx, id) => {
      createdId = id('persona-estudiante1');
      expect(await tx.estudiante.findUnique({ where: { id: createdId } })).not.toBeNull();
    });
    expect(await client.estudiante.findUnique({ where: { id: createdId } })).toBeNull();
  });
});

const invalidCases: [string, string, string[], string][] = [
  [
    'correo duplicado',
    'INSERT INTO "Usuario" (correo, "passwordHash", rol, "actualizadoEn") SELECT correo, \'test\', rol, now() FROM "Usuario" WHERE id=$1',
    ['estudiante1'],
    '23505',
  ],
  [
    'correo sin normalizar',
    'UPDATE "Usuario" SET correo=upper(correo) WHERE id=$1',
    ['estudiante1'],
    '23514',
  ],
  [
    'matrícula duplicada',
    'UPDATE "Estudiante" SET matricula=(SELECT matricula FROM "Estudiante" WHERE id=$1) WHERE id=$2',
    ['persona-estudiante1', 'persona-estudiante2'],
    '23505',
  ],
  [
    'empleado duplicado',
    'UPDATE "Docente" SET "numeroEmpleado"=(SELECT "numeroEmpleado" FROM "Docente" WHERE id=$1) WHERE id=$2',
    ['persona-docente1', 'persona-docente2'],
    '23505',
  ],
  [
    'sesión con vencimiento anterior',
    'INSERT INTO "Sesion" ("usuarioId", "expiraEn") VALUES ($1, now()-interval \'1 day\')',
    ['estudiante1'],
    '23514',
  ],
  [
    'créditos no positivos',
    'UPDATE "PlanAsignatura" SET creditos=0 WHERE "planId"=$1 AND "asignaturaId"=$2',
    ['plan-diseno', 'visual'],
    '23514',
  ],
  [
    'prerrequisito del mismo curso',
    'INSERT INTO "Prerrequisito" VALUES ($1,$2,$2)',
    ['plan-diseno', 'visual'],
    '23514',
  ],
  [
    'prerrequisito de otro plan',
    'INSERT INTO "Prerrequisito" VALUES ($1,$2,$3)',
    ['plan-diseno', 'visual', 'intro'],
    '23503',
  ],
  ['cupo no positivo', 'UPDATE "Grupo" SET cupo=0 WHERE id=$1', ['intro-actual'], '23514'],
  ['fechas invertidas', 'UPDATE "Periodo" SET fin=inicio-1 WHERE id=$1', ['actual'], '23514'],
  [
    'política fuera de escala',
    'INSERT INTO "PoliticaAcademica" (version,descripcion,"escalaMinima","escalaMaxima","minimaAprobatoria",decimales,"intentosPromedio") VALUES ($1,\'Test\',0,10,11,2,\'TODOS\')',
    ['politica-invalida'],
    '23514',
  ],
  [
    'alteración de política versionada',
    'UPDATE "PoliticaAcademica" SET "minimaAprobatoria"=7 WHERE id=$1',
    ['politica'],
    '23514',
  ],
  [
    'alteración de créditos con historial',
    'UPDATE "PlanAsignatura" SET creditos=7 WHERE "planId"=$1 AND "asignaturaId"=$2',
    ['plan-software', 'intro'],
    '23514',
  ],
  [
    'cambio de rol con persona asociada',
    'UPDATE "Usuario" SET rol=\'DOCENTE\' WHERE id=$1',
    ['estudiante1'],
    '23514',
  ],
  [
    'persona con rol incorrecto',
    'UPDATE "Estudiante" SET "usuarioId"=$1 WHERE id=$2',
    ['admin', 'persona-estudiante1'],
    '23514',
  ],
  [
    'cambio de identidad del plan con historial',
    'UPDATE "PlanEstudio" SET version=2 WHERE id=$1',
    ['plan-software'],
    '23514',
  ],
  [
    'reescritura de créditos históricos',
    'UPDATE "Inscripcion" SET "creditosSnapshot"=7 WHERE id=$1',
    ['aprobada'],
    '23514',
  ],
  [
    'nota fuera de escala',
    'UPDATE "Inscripcion" SET "notaFinal"=11 WHERE id=$1',
    ['aprobada'],
    '23514',
  ],
  [
    'precisión excesiva',
    'UPDATE "Inscripcion" SET "notaFinal"=8.555 WHERE id=$1',
    ['aprobada'],
    '23514',
  ],
  [
    'nota pendiente no nula',
    'UPDATE "Inscripcion" SET "notaFinal"=0 WHERE id=$1',
    ['ultimo-cupo'],
    '23514',
  ],
  [
    'calificada sin nota',
    'UPDATE "Inscripcion" SET "notaFinal"=NULL WHERE id=$1',
    ['aprobada'],
    '23514',
  ],
  ['borrado del historial', 'DELETE FROM "Inscripcion" WHERE id=$1', ['aprobada'], '23514'],
  [
    'reescritura de auditoría',
    'UPDATE "Auditoria" SET accion=\'OTRA\' WHERE id=$1',
    ['auditoria-seed'],
    '23514',
  ],
  [
    'certificado emitido sin archivo',
    'INSERT INTO "Certificado" ("estudianteId",estado,instantanea) VALUES ($1,\'EMITIDO\',\'{}\')',
    ['persona-estudiante1'],
    '23514',
  ],
];

describe('Restricciones de base, independientes de la API', () => {
  it.each(invalidCases)('rechaza %s', async (_label, sql, names, code) => {
    await fixture(async (tx, id) => {
      await expect(tx.$executeRawUnsafe(sql, ...names.map(id))).rejects.toMatchObject(
        sqlError(code),
      );
    });
  });
  it('detecta ciclos indirectos en un plan sin historial', async () => {
    await fixture(async (tx, id) => {
      await tx.prerrequisito.create({
        data: {
          planId: id('plan-diseno'),
          asignaturaId: id('visual'),
          requeridaId: id('comunicacion'),
        },
      });
      await expect(
        tx.$executeRaw`INSERT INTO "Prerrequisito" VALUES (${id('plan-diseno')}::uuid, ${id('comunicacion')}::uuid, ${id('visual')}::uuid)`,
      ).rejects.toMatchObject(sqlError('23514'));
    });
  });
  it.each([
    ['duplicidad entre grupos', 'intro-alterno', 'intro', 'actual', 'persona-estudiante2', '23505'],
    [
      'grupo y asignatura incompatibles',
      'intro-alterno',
      'avanzada',
      'actual',
      'persona-estudiante3',
      '23503',
    ],
    [
      'grupo y periodo incompatibles',
      'intro-alterno',
      'intro',
      'anterior',
      'persona-estudiante3',
      '23503',
    ],
    ['estudiante de otro plan', 'intro-alterno', 'intro', 'actual', 'persona-estudiante4', '23503'],
  ])('rechaza %s', async (_label, group, subject, period, student, code) => {
    await fixture(async (tx, id) => {
      const credits = subject === 'avanzada' ? 8 : 6;
      await expect(tx.$executeRaw`INSERT INTO "Inscripcion"
        ("estudianteId","planId","grupoId","asignaturaId","periodoId","politicaId","creditosSnapshot","actualizadoEn")
        VALUES (${id(student!)}::uuid,${id('plan-software')}::uuid,${id(group!)}::uuid,
        ${id(subject!)}::uuid,${id(period!)}::uuid,${id('politica')}::uuid,${credits},now())`).rejects.toMatchObject(
        sqlError(code!),
      );
    });
  });
  it('genera códigos diferentes y protege su unicidad', async () => {
    await fixture(async (tx, id) => {
      const data = { estudianteId: id('persona-estudiante1'), instantanea: { demo: true } };
      const first = await tx.certificado.create({ data });
      const second = await tx.certificado.create({ data });
      expect(first.codigo).toMatch(/^[0-9a-f]{32}$/);
      expect(first.codigo).not.toBe(second.codigo);
      await expect(tx.$executeRaw`INSERT INTO "Certificado" ("estudianteId",codigo,instantanea)
        VALUES (${id('persona-estudiante1')}::uuid,${first.codigo},'{}')`).rejects.toMatchObject(
        sqlError('23505'),
      );
    });
  });
  it('permite revocar y reemitir conservando la instantánea original', async () => {
    await fixture(async (tx, id) => {
      // Metadatos ficticios dentro del rollback; no se atribuye la existencia de un PDF real.
      const certificado = await tx.certificado.create({
        data: {
          estudianteId: id('persona-estudiante1'),
          instantanea: { prueba: true, nota: '8.50' },
        },
      });
      await tx.certificado.update({
        where: { id: certificado.id },
        data: {
          estado: 'EMITIDO',
          emitidoEn: new Date(),
          archivoRuta: 'fixture.pdf',
          archivoSha256: 'a'.repeat(64),
        },
      });
      await tx.certificado.update({
        where: { id: certificado.id },
        data: {
          estado: 'REVOCADO',
          revocadoEn: new Date(),
          motivoRevocacion: 'Corrección de prueba',
        },
      });
      const replacement = await tx.certificado.create({
        data: {
          estudianteId: id('persona-estudiante1'),
          instantanea: { prueba: true },
          reemplazaId: certificado.id,
        },
      });
      expect(replacement.estado).toBe('PENDIENTE');
      await expect(
        tx.$executeRaw`UPDATE "Certificado" SET instantanea='{}' WHERE id=${certificado.id}::uuid`,
      ).rejects.toMatchObject(sqlError('23514'));
    });
  });

  it('aplica incrementalmente la 4.a migración (America/Mexico_City) sobre un esquema con las 3 migraciones previas y registros existentes', async () => {
    const baseUrl = new URL(url);
    baseUrl.searchParams.delete('schema');
    const incrementalSchema = `siga_mig_inc_${randomUUID().replaceAll('-', '')}`;
    const pool = new Pool({ connectionString: baseUrl.toString(), connectionTimeoutMillis: 2000 });
    try {
      await pool.query(`CREATE SCHEMA "${incrementalSchema}"`);
      const pgClient = await pool.connect();
      try {
        await pgClient.query(`SET search_path TO "${incrementalSchema}"`);
        const preMigrations = [
          '20261010030000_inicial',
          '20261010030100_integridad',
          '20261010030200_identidad_historial',
        ];
        for (const folder of preMigrations) {
          const sql = await readFile(
            new URL(`../prisma/migrations/${folder}/migration.sql`, import.meta.url),
            'utf8',
          );
          await pgClient.query(sql);
        }
        const politicaId = randomUUID();
        const periodoExistenteId = randomUUID();
        await pgClient.query(
          `INSERT INTO "PoliticaAcademica" (id, version, descripcion, "escalaMinima", "escalaMaxima", "minimaAprobatoria", decimales, "intentosPromedio")
           VALUES ($1::uuid, 'v-inc-1', 'Política previa', 0, 10, 6, 2, 'TODOS')`,
          [politicaId],
        );
        await pgClient.query(
          `INSERT INTO "Periodo" (id, clave, nombre, inicio, fin, "inscripcionInicio", "inscripcionFin", estado, "politicaId")
           VALUES ($1::uuid, '2026-INC', 'Periodo previo a D44', '2026-08-01', '2026-12-15', '2026-08-01T06:00:00Z', '2026-12-15T18:00:00Z', 'ABIERTO', $2::uuid)`,
          [periodoExistenteId, politicaId],
        );
        // Con la restricción previa en UTC, 23:59:59 America/Mexico_City del día de fin (05:59:59Z del día siguiente) fallaba:
        await expect(
          pgClient.query(
            `UPDATE "Periodo" SET "inscripcionFin" = '2026-12-16T05:59:59Z' WHERE id = $1::uuid`,
            [periodoExistenteId],
          ),
        ).rejects.toMatchObject({ code: '23514' });

        // Aplicar incrementalmente la 4.a migración sobre los datos existentes:
        const fourthSql = await readFile(
          new URL(
            '../prisma/migrations/20261106010000_periodo_hora_mexico/migration.sql',
            import.meta.url,
          ),
          'utf8',
        );
        await pgClient.query(fourthSql);

        // Ahora 23:59:59 America/Mexico_City del 2026-12-15 (2026-12-16T05:59:59Z) es aceptado:
        await pgClient.query(
          `UPDATE "Periodo" SET "inscripcionFin" = '2026-12-16T05:59:59Z' WHERE id = $1::uuid`,
          [periodoExistenteId],
        );
        // Mientras que el día siguiente en America/Mexico_City (2026-12-16T06:00:00Z) se rechaza:
        await expect(
          pgClient.query(
            `UPDATE "Periodo" SET "inscripcionFin" = '2026-12-16T06:00:00Z' WHERE id = $1::uuid`,
            [periodoExistenteId],
          ),
        ).rejects.toMatchObject({ code: '23514' });
      } finally {
        pgClient.release();
      }
    } finally {
      await pool.query(`DROP SCHEMA IF EXISTS "${incrementalSchema}" CASCADE`);
      await pool.end();
    }
  });
});
