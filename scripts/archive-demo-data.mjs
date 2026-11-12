import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from 'dotenv';

const root = process.cwd();
config({ path: resolve(root, '.env'), quiet: true });

const target = process.argv[2] ?? 'native';
const dryRun = process.argv.includes('--dry-run');
if (!['native', 'docker'].includes(target)) {
  throw new Error('Uso: node scripts/archive-demo-data.mjs native|docker [--dry-run]');
}
if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL en .env.');

const databaseUrl = new URL(process.env.DATABASE_URL);
if (target === 'docker' && databaseUrl.port === '55432') {
  databaseUrl.port = process.env.POSTGRES_PORT || '5432';
}
const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
const allowedHosts =
  target === 'native'
    ? ['127.0.0.1', 'localhost', '[::1]']
    : ['127.0.0.1', 'localhost', '[::1]', 'db'];
if (
  process.env.NODE_ENV === 'production' ||
  databaseName !== 'siga_dev' ||
  !allowedHosts.includes(databaseUrl.hostname) ||
  (target === 'native' && databaseUrl.port !== '55432')
) {
  throw new Error(
    'Archivado cancelado: solo se permite siga_dev local, nunca producción u otra base.',
  );
}

const { createDatabaseClient } = await import(
  pathToFileURL(resolve(root, 'apps/api/dist/database/client.js')).href
);
const { seedId } = await import(
  pathToFileURL(resolve(root, 'apps/api/dist/database/seed-data.js')).href
);
const namespace = 'siga-demo-v1';
const id = (name) => seedId(namespace, name);
const userIds = [
  'admin',
  'docente1',
  'docente2',
  'estudiante1',
  'estudiante2',
  'estudiante3',
  'estudiante4',
].map(id);
const studentIds = [1, 2, 3, 4].map((number) => id(`persona-estudiante${number}`));
const teacherIds = [1, 2].map((number) => id(`persona-docente${number}`));
const programIds = ['software', 'diseno'].map(id);
const planIds = ['plan-software', 'plan-diseno'].map(id);
const subjectIds = ['intro', 'avanzada', 'proyecto', 'comunicacion', 'visual'].map(id);
const periodIds = ['anterior', 'actual'].map(id);
const groupIds = [
  'intro-anterior',
  'intro-actual',
  'intro-alterno',
  'avanzada-actual',
  'visual-actual',
].map(id);
const enrollmentIds = ['aprobada', 'reprobada', 'ultimo-cupo', 'grupo-lleno'].map(id);
const credentialFiles =
  target === 'native'
    ? ['demo-acceso.txt', 'admin-acceso.txt']
    : ['demo-acceso-5432.txt', 'admin-acceso-5432.txt'];
const client = createDatabaseClient(databaseUrl.toString());

let result;
let removedCredentialFiles = 0;
try {
  const connectedDatabase = await client.$queryRaw`SELECT current_database() AS name`;
  if (connectedDatabase[0]?.name !== 'siga_dev') {
    throw new Error('La conexión no apunta a siga_dev.');
  }

  result = await client.$transaction(async (tx) => {
    const demoAdmin = await tx.usuario.findUnique({
      where: { id: id('admin') },
      select: { id: true },
    });
    const demoUsers = await tx.usuario.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    });
    const demoCertificates = await tx.certificado.findMany({
      where: { estudianteId: { in: studentIds } },
      select: { id: true, estado: true },
    });
    const certificateIds = demoCertificates.map((certificate) => certificate.id);
    const auditResourceIds = [
      ...userIds,
      ...studentIds,
      ...teacherIds,
      ...programIds,
      ...planIds,
      ...subjectIds,
      ...periodIds,
      ...groupIds,
      ...enrollmentIds,
      ...certificateIds,
      id('politica'),
      id('auditoria-seed'),
      namespace,
    ];
    const [counts, activeCounts, auditHistory, priorArchive] = await Promise.all([
      Promise.all([
        tx.usuario.count({ where: { id: { in: userIds } } }),
        tx.estudiante.count({ where: { id: { in: studentIds } } }),
        tx.docente.count({ where: { id: { in: teacherIds } } }),
        tx.programa.count({ where: { id: { in: programIds } } }),
        tx.planEstudio.count({ where: { id: { in: planIds } } }),
        tx.asignatura.count({ where: { id: { in: subjectIds } } }),
        tx.periodo.count({ where: { id: { in: periodIds } } }),
        tx.grupo.count({ where: { id: { in: groupIds } } }),
        tx.inscripcion.count({
          where: {
            OR: [
              { id: { in: enrollmentIds } },
              { estudianteId: { in: studentIds } },
              { grupoId: { in: groupIds } },
            ],
          },
        }),
        tx.certificado.count({ where: { estudianteId: { in: studentIds } } }),
      ]),
      Promise.all([
        tx.usuario.count({ where: { id: { in: userIds }, activo: true } }),
        tx.estudiante.count({ where: { id: { in: studentIds }, estado: 'ACTIVO' } }),
        tx.docente.count({ where: { id: { in: teacherIds }, activo: true } }),
        tx.programa.count({ where: { id: { in: programIds }, activo: true } }),
        tx.planEstudio.count({ where: { id: { in: planIds }, activo: true } }),
        tx.asignatura.count({ where: { id: { in: subjectIds }, activo: true } }),
        tx.periodo.count({ where: { id: { in: periodIds }, estado: { not: 'CERRADO' } } }),
        tx.grupo.count({ where: { id: { in: groupIds }, activo: true } }),
        tx.certificado.count({ where: { id: { in: certificateIds }, estado: 'EMITIDO' } }),
        tx.sesion.count({ where: { usuarioId: { in: userIds }, revocadaEn: null } }),
      ]),
      tx.auditoria.count({
        where: {
          OR: [{ actorId: { in: userIds } }, { recursoId: { in: auditResourceIds } }],
        },
      }),
      tx.auditoria.findFirst({
        where: { accion: 'ARCHIVAR_DATOS_DEMO', recursoId: namespace },
        select: { id: true },
      }),
    ]);
    const names = [
      'users',
      'students',
      'teachers',
      'programs',
      'plans',
      'subjects',
      'periods',
      'groups',
      'enrollments',
      'certificates',
    ];
    const activeNames = [...names.slice(0, 8), 'issuedCertificates', 'activeSessions'];
    const allRows = Object.fromEntries(names.map((name, index) => [name, counts[index]]));
    const activeRows = Object.fromEntries(
      activeNames.map((name, index) => [name, activeCounts[index]]),
    );
    const summary = {
      demoRecordsFound: allRows,
      activeRowsToDisable: activeRows,
      immutableAuditRowsToPreserve: auditHistory,
      priorArchiveExists: Boolean(priorArchive),
    };

    if (dryRun || priorArchive) {
      return { hasDemoAdmin: Boolean(demoAdmin), hasDemoUsers: demoUsers.length > 0, summary };
    }

    const now = new Date();
    const changes = {
      revokedSessions: await tx.sesion.updateMany({
        where: { usuarioId: { in: userIds }, revocadaEn: null },
        data: { revocadaEn: now },
      }),
      disabledUsers: await tx.usuario.updateMany({
        where: { id: { in: userIds }, activo: true },
        data: { activo: false },
      }),
      inactiveStudents: await tx.estudiante.updateMany({
        where: { id: { in: studentIds }, estado: 'ACTIVO' },
        data: { estado: 'INACTIVO' },
      }),
      inactiveTeachers: await tx.docente.updateMany({
        where: { id: { in: teacherIds }, activo: true },
        data: { activo: false },
      }),
      inactivePrograms: await tx.programa.updateMany({
        where: { id: { in: programIds }, activo: true },
        data: { activo: false },
      }),
      inactivePlans: await tx.planEstudio.updateMany({
        where: { id: { in: planIds }, activo: true },
        data: { activo: false },
      }),
      inactiveSubjects: await tx.asignatura.updateMany({
        where: { id: { in: subjectIds }, activo: true },
        data: { activo: false },
      }),
      closedPeriods: await tx.periodo.updateMany({
        where: { id: { in: periodIds }, estado: { not: 'CERRADO' } },
        data: { estado: 'CERRADO' },
      }),
      inactiveGroups: await tx.grupo.updateMany({
        where: { id: { in: groupIds }, activo: true },
        data: { activo: false },
      }),
      revokedCertificates: await tx.certificado.updateMany({
        where: { id: { in: certificateIds }, estado: 'EMITIDO' },
        data: {
          estado: 'REVOCADO',
          revocadoEn: now,
          motivoRevocacion: 'Constancia de demostración retirada del uso operativo.',
        },
      }),
    };

    for (const certificate of demoCertificates.filter((item) => item.estado === 'EMITIDO')) {
      await tx.auditoria.create({
        data: {
          actorId: null,
          accion: 'REVOCAR_CERTIFICADO',
          recurso: 'Certificado',
          recursoId: certificate.id,
          motivo: 'Constancia de demostración retirada del uso operativo.',
          anterior: { estado: 'EMITIDO' },
          posterior: { estado: 'REVOCADO', revocadoEn: now.toISOString() },
        },
      });
    }
    await tx.auditoria.create({
      data: {
        actorId: null,
        accion: 'ARCHIVAR_DATOS_DEMO',
        recurso: 'Semilla',
        recursoId: namespace,
        motivo: 'Cuentas y catálogos demo deshabilitados; historial inmutable preservado.',
        anterior: summary,
        posterior: { archivado: true, cambiadoEn: now.toISOString() },
      },
    });
    return {
      hasDemoAdmin: Boolean(demoAdmin),
      hasDemoUsers: demoUsers.length > 0,
      summary,
      changes: Object.fromEntries(
        Object.entries(changes).map(([name, value]) => [name, value.count]),
      ),
    };
  });

  if (!dryRun) {
    const filesToRemove = credentialFiles.filter(
      (name) =>
        (name.startsWith('demo-') && result.hasDemoUsers) ||
        (name.startsWith('admin-') && result.hasDemoAdmin),
    );
    for (const name of filesToRemove) {
      const filePath = resolve(root, '.local', name);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        removedCredentialFiles += 1;
      }
    }
  }

  console.log(JSON.stringify({ target, dryRun, ...result, removedCredentialFiles }));
} finally {
  await client.$disconnect();
}
