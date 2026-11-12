import { seTraslapan, sumarPonderaciones, validarPonderaciones } from './reglas.js';

describe('reglas de la ampliación académica', () => {
  it('detecta choques parciales, totales y por contención en el mismo día', () => {
    const horario = { diaSemana: 1, inicioMinuto: 8 * 60, finMinuto: 10 * 60 };
    expect(seTraslapan(horario, { diaSemana: 1, inicioMinuto: 9 * 60, finMinuto: 11 * 60 })).toBe(
      true,
    );
    expect(
      seTraslapan(horario, { diaSemana: 1, inicioMinuto: 8 * 60 + 1, finMinuto: 9 * 60 }),
    ).toBe(true);
    expect(seTraslapan(horario, { diaSemana: 1, inicioMinuto: 10 * 60, finMinuto: 11 * 60 })).toBe(
      false,
    );
    expect(seTraslapan(horario, { diaSemana: 2, inicioMinuto: 9 * 60, finMinuto: 11 * 60 })).toBe(
      false,
    );
  });
  it('suma pesos en centésimos y evita pesos negativos o superiores al 100%', () => {
    expect(validarPonderaciones(['33.33', '33.33', '33.34'])).toBe(true);
    expect(sumarPonderaciones(['33.33', '33.33', '33.34'])).toBe(100);
    expect(validarPonderaciones(['50.01', '50.00'])).toBe(false);
    expect(validarPonderaciones(['0', '100'])).toBe(false);
    expect(validarPonderaciones(['-10', '110'])).toBe(false);
  });
});
