const PLAIN_NUMBER = /^[+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;

export function parseNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  if (typeof v !== 'string') return NaN;
  const s = v.trim().replace(/−/g, '-');
  if (!PLAIN_NUMBER.test(s)) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export const isNumberAnswer = (v: unknown) => !Number.isNaN(parseNumber(v));

export function formatAnswer(value: number, tolerance = 0): string {
  const places = tolerance > 1e-9 ? Math.max(2, Math.ceil(-Math.log10(tolerance))) : 4;
  return String(Number(value.toFixed(Math.min(places, 6))));
}
