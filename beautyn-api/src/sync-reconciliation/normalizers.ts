export function normalizeName(x?: string): string | undefined {
  if (x == null) return x;
  return x.normalize('NFKC').trim().replace(/\s+/g, ' ');
}
export function clampDuration(mins?: number, step = 15): number | undefined {
  if (mins == null) return mins;
  return Math.round(mins / step) * step;
}
export function minorUnits(amount?: number, exponent = 2): number | undefined {
  if (amount == null) return amount;
  return Math.round(amount * Math.pow(10, exponent));
}

