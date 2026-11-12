const MAX_GRUPOS = 128;
const MAX_POR_GRUPO = 20;

export class ColaGrupos {
  private readonly grupos = new Map<string, { fin: Promise<void>; pendientes: number }>();

  async ejecutar<T>(grupoId: string, operacion: () => Promise<T>): Promise<T> {
    let grupo = this.grupos.get(grupoId);
    if (
      (!grupo && this.grupos.size >= MAX_GRUPOS) ||
      (grupo && grupo.pendientes >= MAX_POR_GRUPO)
    ) {
      return operacion();
    }
    if (!grupo) {
      grupo = { fin: Promise.resolve(), pendientes: 0 };
      this.grupos.set(grupoId, grupo);
    }
    const anterior = grupo.fin;
    let liberar!: () => void;
    grupo.fin = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    grupo.pendientes += 1;
    try {
      await anterior;
      return await operacion();
    } finally {
      liberar();
      grupo.pendientes -= 1;
      if (grupo.pendientes === 0) this.grupos.delete(grupoId);
    }
  }
}
