import { ColaGrupos } from './cola-grupos.js';

describe('cola de matrículas por grupo', () => {
  it('ordena solicitudes del mismo grupo sin bloquear otros grupos y libera ante error', async () => {
    const cola = new ColaGrupos();
    const eventos: string[] = [];
    let liberar!: () => void;
    const espera = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const primero = cola.ejecutar('A', async () => {
      eventos.push('primero');
      await espera;
      throw new Error('fallo esperado');
    });
    const segundo = cola.ejecutar('A', async () => {
      eventos.push('segundo');
      return 2;
    });
    const otro = cola.ejecutar('B', async () => {
      eventos.push('otro');
    });
    await otro;
    expect(eventos).toEqual(['primero', 'otro']);
    liberar();
    await expect(primero).rejects.toThrow('fallo esperado');
    await expect(segundo).resolves.toBe(2);
    expect(eventos).toEqual(['primero', 'otro', 'segundo']);
  });

  it('no retiene solicitudes adicionales cuando la cola de un grupo está llena', async () => {
    const cola = new ColaGrupos();
    let liberar!: () => void;
    const espera = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const pendientes = Array.from({ length: 20 }, () => cola.ejecutar('A', () => espera));
    await expect(cola.ejecutar('A', async () => 'sin espera')).resolves.toBe('sin espera');
    liberar();
    await Promise.all(pendientes);
    await expect(cola.ejecutar('A', async () => 'reutilizada')).resolves.toBe('reutilizada');
  });

  it('limita los grupos retenidos y permite continuar al alcanzar el límite', async () => {
    const cola = new ColaGrupos();
    let liberar!: () => void;
    const espera = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const pendientes = Array.from({ length: 128 }, (_, i) =>
      cola.ejecutar(String(i), () => espera),
    );
    await expect(cola.ejecutar('extra', async () => 'sin espera')).resolves.toBe('sin espera');
    liberar();
    await Promise.all(pendientes);
    await expect(cola.ejecutar('extra', async () => 'reutilizada')).resolves.toBe('reutilizada');
  });
});
