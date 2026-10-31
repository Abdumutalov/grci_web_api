/** Число из переменной окружения (с запасным значением, как `Number(x) || def` в оригинале). */
export function toInt(value: string | undefined, def: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n !== 0 ? n : def;
}

/** Булево из переменной окружения: 'true'/'1'/'yes'/'on' → true. */
export function toBool(value: string | undefined, def: boolean): boolean {
  if (value === undefined || value === '') return def;
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
}
