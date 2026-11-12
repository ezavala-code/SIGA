import { describe, expect, it } from 'vitest';
import { mexicoCityInput, mexicoCityInstant } from './mexicoCityTime';

describe('horas de inscripción en Ciudad de México', () => {
  it('convierte y recupera una hora local sin depender de la zona del navegador', () => {
    expect(mexicoCityInstant('2026-12-20T23:30')).toBe('2026-12-21T05:30:00.000Z');
    expect(mexicoCityInput('2026-12-21T05:30:00.000Z')).toBe('2026-12-20T23:30');
  });

  it('respeta el horario histórico y rechaza horas que no existieron', () => {
    expect(mexicoCityInstant('2022-07-01T12:00')).toBe('2022-07-01T17:00:00.000Z');
    expect(() => mexicoCityInstant('2022-04-03T02:30')).toThrow();
    expect(() => mexicoCityInstant('2022-10-30T01:30')).toThrow();
    expect(() => mexicoCityInstant('2026-02-30T08:00')).toThrow();
  });

  it('conserva el instante original al editar sin cambiar una hora histórica o con segundos', () => {
    expect(mexicoCityInstant('2022-10-30T01:30', '2022-10-30T07:30:45.123Z')).toBe(
      '2022-10-30T07:30:45.123Z',
    );
    expect(mexicoCityInstant('2026-12-20T23:31', '2026-12-21T05:30:45.123Z')).toBe(
      '2026-12-21T05:31:00.000Z',
    );
  });
});
