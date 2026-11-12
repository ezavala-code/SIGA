import { Prisma } from '../../generated/prisma/client.js';

export type MetodoIntentos = 'TODOS' | 'ULTIMO' | 'MEJOR';

export interface IntentoAcademico {
  inscripcionId: string;
  asignaturaId: string;
  estado: 'PENDIENTE' | 'CALIFICADA' | 'CANCELADA';
  notaFinal: Prisma.Decimal | null;
  creditosSnapshot: Prisma.Decimal;
  creadoEn: Date;
  periodo: {
    id: string;
    inicio: Date;
    fin: Date;
    politica: {
      minimaAprobatoria: Prisma.Decimal;
      intentosPromedio: MetodoIntentos;
    };
  };
}

export interface AsignaturaPlan {
  id: string;
  creditos: Prisma.Decimal;
}

function cronologia(a: IntentoAcademico, b: IntentoAcademico) {
  return (
    a.periodo.inicio.getTime() - b.periodo.inicio.getTime() ||
    a.periodo.fin.getTime() - b.periodo.fin.getTime() ||
    a.creadoEn.getTime() - b.creadoEn.getTime() ||
    a.periodo.id.localeCompare(b.periodo.id) ||
    a.inscripcionId.localeCompare(b.inscripcionId)
  );
}

function promedio(creditosYNotas: Array<{ nota: Prisma.Decimal; creditos: Prisma.Decimal }>) {
  if (!creditosYNotas.length) return null;
  let ponderacion = new Prisma.Decimal(0);
  let creditos = new Prisma.Decimal(0);
  for (const item of creditosYNotas) {
    ponderacion = ponderacion.plus(item.nota.times(item.creditos));
    creditos = creditos.plus(item.creditos);
  }
  if (creditos.isZero()) return null;
  return ponderacion.div(creditos).toDecimalPlaces(2).toFixed(2);
}

export function promedioPorPeriodo(attempts: IntentoAcademico[]) {
  const periods = new Map<
    string,
    {
      id: string;
      clave: string;
      nombre: string;
      grades: Array<{ nota: Prisma.Decimal; creditos: Prisma.Decimal }>;
    }
  >();
  for (const attempt of attempts) {
    const period = periods.get(attempt.periodo.id) ?? {
      id: attempt.periodo.id,
      clave: '',
      nombre: '',
      grades: [],
    };
    if (attempt.estado === 'CALIFICADA' && attempt.notaFinal !== null) {
      period.grades.push({ nota: attempt.notaFinal, creditos: attempt.creditosSnapshot });
    }
    periods.set(attempt.periodo.id, period);
  }
  return new Map([...periods].map(([id, period]) => [id, promedio(period.grades)]));
}

export function promedioGeneral(attempts: IntentoAcademico[]) {
  const grouped = new Map<string, IntentoAcademico[]>();
  for (const attempt of attempts) {
    if (attempt.estado !== 'CALIFICADA' || attempt.notaFinal === null) continue;
    const list = grouped.get(attempt.asignaturaId) ?? [];
    list.push(attempt);
    grouped.set(attempt.asignaturaId, list);
  }

  const selected: Array<{ nota: Prisma.Decimal; creditos: Prisma.Decimal }> = [];
  for (const courseAttempts of grouped.values()) {
    const chronological = [...courseAttempts].sort(cronologia);
    const policy = chronological.at(-1)!.periodo.politica.intentosPromedio;
    let included = chronological;
    if (policy === 'ULTIMO') included = [chronological.at(-1)!];
    if (policy === 'MEJOR') {
      const best = chronological.reduce((current, candidate) =>
        candidate.notaFinal!.greaterThan(current.notaFinal!) ? candidate : current,
      );
      included = [best];
    }
    for (const attempt of included) {
      selected.push({ nota: attempt.notaFinal!, creditos: attempt.creditosSnapshot });
    }
  }
  return promedio(selected);
}

export function calcularAvance(asignaturas: AsignaturaPlan[], attempts: IntentoAcademico[]) {
  const total = asignaturas.reduce(
    (sum, course) => sum.plus(course.creditos),
    new Prisma.Decimal(0),
  );
  const approved = new Set<string>();
  for (const attempt of attempts) {
    if (
      attempt.estado === 'CALIFICADA' &&
      attempt.notaFinal !== null &&
      attempt.notaFinal.greaterThanOrEqualTo(attempt.periodo.politica.minimaAprobatoria)
    ) {
      approved.add(attempt.asignaturaId);
    }
  }
  const totalAprobado = asignaturas
    .filter((course) => approved.has(course.id))
    .reduce((sum, course) => sum.plus(course.creditos), new Prisma.Decimal(0));
  return {
    creditosTotales: total.toFixed(2),
    creditosAprobados: totalAprobado.toFixed(2),
    avancePorcentaje: total.isZero()
      ? null
      : totalAprobado.div(total).times(100).toDecimalPlaces(2).toFixed(2),
    asignaturasAprobadas: approved.size,
    asignaturasTotales: asignaturas.length,
    sinCreditosEnPlan: total.isZero(),
  };
}
