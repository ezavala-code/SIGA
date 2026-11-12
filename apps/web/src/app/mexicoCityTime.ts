const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Mexico_City',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function mexicoCityInput(value: string | Date): string {
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(value)).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function mexicoCityInstant(value: string, original?: string): string {
  if (original && mexicoCityInput(original) === value) return original;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error('Indica una fecha y hora de inscripción válida.');
  }
  const local = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(local)) throw new Error('Indica una fecha y hora de inscripción válida.');
  let instant = local;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const displayed = Date.parse(`${mexicoCityInput(new Date(instant))}:00Z`);
    instant += local - displayed;
  }
  if (mexicoCityInput(new Date(instant)) !== value) {
    throw new Error('La hora indicada no existe en Ciudad de México.');
  }
  if (
    [-3_600_000, 3_600_000].some((offset) => mexicoCityInput(new Date(instant + offset)) === value)
  ) {
    throw new Error('La hora indicada ocurre dos veces en Ciudad de México; elige otra hora.');
  }
  return new Date(instant).toISOString();
}
