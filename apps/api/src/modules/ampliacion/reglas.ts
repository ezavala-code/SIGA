export type Intervalo = { diaSemana: number; inicioMinuto: number; finMinuto: number };

/** Intervalos semiabiertos: terminar a las 10:00 y comenzar a las 10:00 no colisiona. */
export function seTraslapan(a: Intervalo, b: Intervalo): boolean {
  return (
    a.diaSemana === b.diaSemana && a.inicioMinuto < b.finMinuto && b.inicioMinuto < a.finMinuto
  );
}

export function validarPonderaciones(pesos: Array<string | number>): boolean {
  const centesimos = pesos.map((peso) => Math.round(Number(peso) * 100));
  return (
    centesimos.every((p) => p > 0 && p <= 10000) && centesimos.reduce((a, b) => a + b, 0) <= 10000
  );
}

export function sumarPonderaciones(pesos: Array<string | number>) {
  return pesos.reduce<number>((a, b) => a + Math.round(Number(b) * 100), 0) / 100;
}
