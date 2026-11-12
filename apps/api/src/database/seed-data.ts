import { createHash, randomBytes, scryptSync } from 'node:crypto';
import { Prisma, type PrismaClient } from '../generated/prisma/client.js';

export function seedId(namespace: string, name: string): string {
  const hex = createHash('sha256').update(`${namespace}:${name}`).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Dataset ficticio, aditivo: jamás sobrescribe filas existentes ni restablece contraseñas. */
export async function seedData(tx: Prisma.TransactionClient, namespace = 'siga-demo-v1') {
  const id = (name: string) => seedId(namespace, name);
  const suffix = createHash('sha256').update(namespace).digest('hex').slice(0, 8).toUpperCase();
  const clave = (name: string) => `DEMO-${suffix}-${name}`;
  for (const [name, rol] of [
    ['admin', 'ADMINISTRADOR'],
    ['docente1', 'DOCENTE'],
    ['docente2', 'DOCENTE'],
    ['estudiante1', 'ESTUDIANTE'],
    ['estudiante2', 'ESTUDIANTE'],
    ['estudiante3', 'ESTUDIANTE'],
    ['estudiante4', 'ESTUDIANTE'],
  ] as const) {
    // Credencial aleatoria descartada y cuenta deshabilitada. E03 provisionará accesos.
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(randomBytes(32), salt, 64).toString('hex');
    await tx.usuario.upsert({
      where: { id: id(name) },
      update: {},
      create: {
        id: id(name),
        correo: `${name}.${suffix.toLowerCase()}@example.invalid`,
        passwordHash: `scrypt:${salt}:${hash}`,
        rol,
        activo: false,
      },
    });
  }
  for (const [name, nombre] of [
    ['software', 'Desarrollo de Software'],
    ['diseno', 'Diseño Digital'],
  ] as const) {
    await tx.programa.upsert({
      where: { id: id(name) },
      update: {},
      create: {
        id: id(name),
        clave: clave(name.toUpperCase()),
        nombre: `${nombre} (demostración)`,
      },
    });
    await tx.planEstudio.upsert({
      where: { id: id(`plan-${name}`) },
      update: {},
      create: {
        id: id(`plan-${name}`),
        programaId: id(name),
        version: 1,
        nombre: 'Plan ficticio 2026',
      },
    });
  }
  const subjects = [
    ['intro', 'Fundamentos de programación', '6', 1],
    ['avanzada', 'Programación avanzada', '8', 2],
    ['proyecto', 'Proyecto integrador', '10', 3],
    ['comunicacion', 'Comunicación', '4', 1],
    ['visual', 'Diseño visual', '6', 1],
  ] as const;
  for (const [name, nombre, creditos, semestreSugerido] of subjects) {
    await tx.asignatura.upsert({
      where: { id: id(name) },
      update: {},
      create: {
        id: id(name),
        clave: clave(name.toUpperCase()),
        nombre,
      },
    });
    const plans =
      name === 'visual'
        ? ['diseno']
        : name === 'comunicacion'
          ? ['software', 'diseno']
          : ['software'];
    for (const plan of plans) {
      const key = { planId: id(`plan-${plan}`), asignaturaId: id(name) };
      await tx.planAsignatura.upsert({
        where: { planId_asignaturaId: key },
        update: {},
        create: { ...key, creditos, semestreSugerido },
      });
    }
  }
  for (const [destino, requerida] of [
    ['avanzada', 'intro'],
    ['proyecto', 'avanzada'],
  ]) {
    const key = {
      planId: id('plan-software'),
      asignaturaId: id(destino!),
      requeridaId: id(requerida!),
    };
    await tx.prerrequisito.upsert({
      where: { planId_asignaturaId_requeridaId: key },
      update: {},
      create: key,
    });
  }
  await tx.politicaAcademica.upsert({
    where: { id: id('politica') },
    update: {},
    create: {
      id: id('politica'),
      version: clave('PROPUESTA-1'),
      descripcion: 'Solo demostración; D09–D13 pendientes de aprobación.',
      escalaMinima: '0',
      escalaMaxima: '10',
      minimaAprobatoria: '6',
      decimales: 2,
      intentosPromedio: 'TODOS',
      esPropuesta: true,
    },
  });
  for (const [name, inicio, fin, inscripcionInicio, inscripcionFin, estado] of [
    ['anterior', '2026-01-12', '2026-06-30', '2026-01-01', '2026-01-31', 'CERRADO'],
    ['actual', '2026-08-01', '2026-12-20', '2026-07-01', '2026-10-31', 'ABIERTO'],
  ] as const) {
    await tx.periodo.upsert({
      where: { id: id(name) },
      update: {},
      create: {
        id: id(name),
        clave: clave(name.toUpperCase()),
        nombre: `Periodo ficticio ${name}`,
        inicio: new Date(inicio),
        fin: new Date(fin),
        inscripcionInicio: new Date(inscripcionInicio),
        inscripcionFin: new Date(inscripcionFin),
        estado,
        politicaId: id('politica'),
      },
    });
  }
  for (const [index, nombre] of ['Elena Ejemplo', 'Mateo Demostración'].entries()) {
    await tx.docente.upsert({
      where: { id: id(`persona-docente${index + 1}`) },
      update: {},
      create: {
        id: id(`persona-docente${index + 1}`),
        usuarioId: id(`docente${index + 1}`),
        numeroEmpleado: clave(`D${index + 1}`),
        nombre,
        departamento: 'Área de demostración',
      },
    });
  }
  for (const [index, nombre] of [
    'Ana Ejemplo',
    'Bruno Demostración',
    'Carla Prueba',
    'Diego Simulado',
  ].entries()) {
    await tx.estudiante.upsert({
      where: { id: id(`persona-estudiante${index + 1}`) },
      update: {},
      create: {
        id: id(`persona-estudiante${index + 1}`),
        usuarioId: id(`estudiante${index + 1}`),
        matricula: clave(`E${index + 1}`),
        nombre,
        fechaIngreso: new Date('2026-01-01'),
        planId: id(index === 3 ? 'plan-diseno' : 'plan-software'),
      },
    });
  }
  const groups = [
    ['intro-anterior', 'intro', 'software', 'anterior', 10, 1],
    ['intro-actual', 'intro', 'software', 'actual', 1, 1],
    ['intro-alterno', 'intro', 'software', 'actual', 10, 2],
    ['avanzada-actual', 'avanzada', 'software', 'actual', 2, 2],
    ['visual-actual', 'visual', 'diseno', 'actual', 10, 2],
  ] as const;
  for (const [name, subject, plan, period, cupo, teacher] of groups) {
    await tx.grupo.upsert({
      where: { id: id(name) },
      update: {},
      create: {
        id: id(name),
        clave: clave(name.toUpperCase()),
        planId: id(`plan-${plan}`),
        asignaturaId: id(subject),
        periodoId: id(period),
        politicaId: id('politica'),
        docenteId: id(`persona-docente${teacher}`),
        cupo,
      },
    });
  }
  for (const [name, student, group, nota] of [
    ['aprobada', 1, 'intro-anterior', '8.50'],
    ['reprobada', 2, 'intro-anterior', '5.00'],
    ['ultimo-cupo', 1, 'avanzada-actual', null],
    ['grupo-lleno', 2, 'intro-actual', null],
  ] as const) {
    const g = groups.find((row) => row[0] === group)!;
    const creditos = subjects.find((row) => row[0] === g[1])![2];
    await tx.inscripcion.upsert({
      where: { id: id(name) },
      update: {},
      create: {
        id: id(name),
        estudianteId: id(`persona-estudiante${student}`),
        grupoId: id(group),
        planId: id(`plan-${g[2]}`),
        asignaturaId: id(g[1]),
        periodoId: id(g[3]),
        politicaId: id('politica'),
        notaFinal: nota,
        estado: nota === null ? 'PENDIENTE' : 'CALIFICADA',
        creditosSnapshot: creditos,
      },
    });
  }
  await tx.auditoria.upsert({
    where: { id: id('auditoria-seed') },
    update: {},
    create: {
      id: id('auditoria-seed'),
      accion: 'DEMO_CREADA',
      recurso: 'Dataset',
      recursoId: namespace,
      motivo: 'Datos ficticios E02; cuentas deshabilitadas y sin certificados emitidos.',
    },
  });
  return {
    namespace,
    usuarios: 7,
    estudiantes: 4,
    docentes: 2,
    programas: 2,
    grupos: 5,
    inscripciones: 4,
  };
}

export function seedDemo(client: PrismaClient, namespace = 'siga-demo-v1') {
  return client.$transaction((tx) => seedData(tx, namespace), {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    timeout: 30000,
  });
}

/** Metadata real del programa; no crea personas, grupos, notas ni matrículas de ejemplo. */
export function seedIcoF19Metadata(client: PrismaClient) {
  const namespace = 'siga-ico-f19-metadata-v1';
  const programaId = seedId(namespace, 'programa');
  const planId = seedId(namespace, 'plan');
  return client.$transaction(
    async (tx) => {
      await tx.programa.upsert({
        where: { id: programaId },
        update: {},
        create: {
          id: programaId,
          clave: 'ICO-F19',
          nombre: 'Licenciatura en Ingeniería en Computación',
        },
      });
      await tx.planEstudio.upsert({
        where: { id: planId },
        update: {},
        create: {
          id: planId,
          programaId,
          version: 2019,
          nombre: 'Plan F19 · generación 2022B',
        },
      });
      return { programa: 'ICO-F19', plan: 'F19', asignaturasPorConfigurar: true };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 },
  );
}
