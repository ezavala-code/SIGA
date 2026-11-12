import { Prisma } from '../../generated/prisma/client.js';
import {
  calcularAvance,
  promedioGeneral,
  promedioPorPeriodo,
  type IntentoAcademico,
} from './calificaciones.calculo.js';

const policy = (intentosPromedio: IntentoAcademico['periodo']['politica']['intentosPromedio']) => ({
  minimaAprobatoria: new Prisma.Decimal('6'),
  intentosPromedio,
});

function intento(
  id: string,
  asignaturaId: string,
  nota: string | null,
  creditos: string,
  periodoInicio: string,
  metodo: IntentoAcademico['periodo']['politica']['intentosPromedio'] = 'TODOS',
  estado: IntentoAcademico['estado'] = nota === null ? 'PENDIENTE' : 'CALIFICADA',
): IntentoAcademico {
  return {
    inscripcionId: id,
    asignaturaId,
    estado,
    notaFinal: nota === null ? null : new Prisma.Decimal(nota),
    creditosSnapshot: new Prisma.Decimal(creditos),
    creadoEn: new Date(`${periodoInicio}T12:00:00.000Z`),
    periodo: {
      id: `periodo-${periodoInicio}`,
      inicio: new Date(`${periodoInicio}T00:00:00.000Z`),
      fin: new Date(`${periodoInicio}T23:59:59.000Z`),
      politica: policy(metodo),
    },
  };
}

describe('cálculos académicos E07', () => {
  it('calcula el caso de referencia D42: promedio ponderado 8.40 y avance 33.33 % (10/30 créditos)', () => {
    const plan30 = [
      { id: 'intro', creditos: new Prisma.Decimal('6') },
      { id: 'comunicacion', creditos: new Prisma.Decimal('4') },
      { id: 'avanzada', creditos: new Prisma.Decimal('8') },
      { id: 'proyecto', creditos: new Prisma.Decimal('12') },
    ];
    const grades840 = [
      intento('a', 'intro', '8', '6', '2026-01-01'),
      intento('b', 'comunicacion', '9', '4', '2026-01-01'),
      intento('c', 'avanzada', null, '8', '2026-01-01'),
    ];
    expect(promedioGeneral(grades840)).toBe('8.40');
    expect(promedioPorPeriodo(grades840).get('periodo-2026-01-01')).toBe('8.40');
    expect(calcularAvance(plan30, grades840)).toEqual({
      creditosTotales: '30.00',
      creditosAprobados: '10.00',
      avancePorcentaje: '33.33',
      asignaturasAprobadas: 2,
      asignaturasTotales: 4,
      sinCreditosEnPlan: false,
    });

    const grades860 = [
      intento('a2', 'intro', '9', '6', '2026-01-01'),
      intento('b2', 'comunicacion', '8', '4', '2026-01-01'),
    ];
    expect(promedioGeneral(grades860)).toBe('8.60');
  });

  it('conserva el cero como nota calificada (0 créditos aprobados) y devuelve NULL cuando solo hay pendientes o canceladas', () => {
    const plan = [{ id: 'intro', creditos: new Prisma.Decimal('6') }];
    const zeroAttempt = [intento('cero', 'intro', '0', '6', '2026-01-01')];
    expect(promedioGeneral(zeroAttempt)).toBe('0.00');
    expect(calcularAvance(plan, zeroAttempt)).toMatchObject({
      creditosTotales: '6.00',
      creditosAprobados: '0.00',
      avancePorcentaje: '0.00',
      asignaturasAprobadas: 0,
    });
    expect(promedioGeneral([intento('pendiente', 'intro', null, '6', '2026-01-01')])).toBeNull();
    expect(
      promedioGeneral([
        intento('cancelada', 'intro', null, '6', '2026-01-01', 'TODOS', 'CANCELADA'),
      ]),
    ).toBeNull();
  });

  it('bajo TODOS (D42) pondera intento reprobado (5.0) y aprobado (9.0) de 6 créditos, pero acredita 6 créditos una sola vez', () => {
    const plan30 = [
      { id: 'intro', creditos: new Prisma.Decimal('6') },
      { id: 'comunicacion', creditos: new Prisma.Decimal('4') },
      { id: 'avanzada', creditos: new Prisma.Decimal('8') },
      { id: 'proyecto', creditos: new Prisma.Decimal('12') },
    ];
    const recursada = [
      intento('intro-rep', 'intro', '5.0', '6', '2026-01-01', 'TODOS'),
      intento('intro-apr', 'intro', '9.0', '6', '2026-08-01', 'TODOS'),
    ];
    expect(promedioGeneral(recursada)).toBe('7.00');
    expect(calcularAvance(plan30, recursada)).toEqual({
      creditosTotales: '30.00',
      creditosAprobados: '6.00',
      avancePorcentaje: '20.00',
      asignaturasAprobadas: 1,
      asignaturasTotales: 4,
      sinCreditosEnPlan: false,
    });
  });

  it('maneja un plan con 0 créditos totales sin división por cero ni NaN', () => {
    const emptyProgress = calcularAvance([], []);
    expect(emptyProgress).toEqual({
      creditosTotales: '0.00',
      creditosAprobados: '0.00',
      avancePorcentaje: null,
      asignaturasAprobadas: 0,
      asignaturasTotales: 0,
      sinCreditosEnPlan: true,
    });
    expect(Number.isNaN(Number(emptyProgress.avancePorcentaje ?? 0))).toBe(false);
  });

  it('aplica todos, último o mejor intento según la política del intento calificado más reciente', () => {
    const attempts = [
      intento('intro-1', 'intro', '8', '6', '2026-01-01', 'TODOS'),
      intento('intro-2', 'intro', '5', '6', '2026-08-01', 'ULTIMO'),
      intento('com', 'comunicacion', '9', '4', '2026-01-01', 'TODOS'),
    ];
    expect(promedioGeneral(attempts)).toBe('6.60');
    expect(
      promedioGeneral([
        attempts[0]!,
        intento('intro-2-mejor', 'intro', '5', '6', '2026-08-01', 'MEJOR'),
        attempts[2]!,
      ]),
    ).toBe('8.40');
    expect(
      promedioGeneral([
        attempts[0]!,
        intento('intro-2-todos', 'intro', '5', '6', '2026-08-01', 'TODOS'),
        attempts[2]!,
      ]),
    ).toBe('7.13');
  });

  it('cuenta una asignatura una sola vez en avance y no suma intentos reprobados o cancelados', () => {
    const plan = [
      { id: 'intro', creditos: new Prisma.Decimal('6') },
      { id: 'comunicacion', creditos: new Prisma.Decimal('4') },
      { id: 'avanzada', creditos: new Prisma.Decimal('8') },
    ];
    const result = calcularAvance(plan, [
      intento('intro-aprobada', 'intro', '8', '6', '2026-01-01'),
      intento('intro-reprobada', 'intro', '5', '6', '2026-08-01'),
      intento('com-aprobada', 'comunicacion', '6', '4', '2026-01-01'),
      intento('avanzada-cancelada', 'avanzada', null, '8', '2026-08-01', 'TODOS', 'CANCELADA'),
    ]);
    expect(result).toMatchObject({
      creditosTotales: '18.00',
      creditosAprobados: '10.00',
      avancePorcentaje: '55.56',
      asignaturasAprobadas: 2,
    });
    expect(calcularAvance([], []).avancePorcentaje).toBeNull();
  });
});
