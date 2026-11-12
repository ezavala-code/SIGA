import bcrypt from '/app/node_modules/bcryptjs/index.js';
import { createDatabaseClient } from '/app/apps/api/dist/database/client.js';
import { seedData, seedId } from '/app/apps/api/dist/database/seed-data.js';

const databaseUrl = new URL(process.env.DATABASE_URL ?? '');
const password = process.env.SIGA_DEMO_PASSWORD;
if (
  process.env.SIGA_DEMO_SEED !== 'true' ||
  databaseUrl.hostname !== 'db' ||
  databaseUrl.pathname !== '/siga_demo' ||
  !password ||
  password.length < 12
) {
  throw new Error('La semilla solo puede ejecutarse en la base aislada de demostración.');
}

const namespace = 'siga-presentacion-v1';
const id = (name) => seedId(namespace, name);
const client = createDatabaseClient(databaseUrl.toString());
try {
  const [{ name }] = await client.$queryRaw`SELECT current_database() AS name`;
  if (name !== 'siga_demo') throw new Error('La base conectada no es la demo.');
  const exists = await client.usuario.findUnique({ where: { id: id('admin') } });
  if (exists) {
    console.log('Los datos de demostración ya existen; se conservan sin cambios.');
  } else {
    const hash = await bcrypt.hash(password, 12);
    await client.$transaction(
      async (tx) => {
        await seedData(tx, namespace);
        const day = 24 * 60 * 60 * 1000;
        const now = Date.now();
        await tx.periodo.update({
          where: { id: id('actual') },
          data: {
            inicio: new Date(now - 30 * day),
            fin: new Date(now + 90 * day),
            inscripcionInicio: new Date(now - 7 * day),
            inscripcionFin: new Date(now + 90 * day),
          },
        });
        for (const user of [
          'admin',
          'docente1',
          'docente2',
          'estudiante1',
          'estudiante2',
          'estudiante3',
          'estudiante4',
        ]) {
          await tx.usuario.update({
            where: { id: id(user) },
            data: { activo: true, passwordHash: hash },
          });
        }
      },
      { timeout: 60000 },
    );
    console.log('Se cargaron dos programas, usuarios, grupos e historial ficticios.');
  }
} finally {
  await client.$disconnect();
}
