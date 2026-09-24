export const sameAnswer = (a, b) => typeof a === 'string' && a.trim() === b?.trim();

const PLAIN_NUMBER = /^[+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;

export function parseNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  if (typeof v !== 'string') return NaN;
  const s = v.trim().replace(/−/g, '-');
  if (!PLAIN_NUMBER.test(s)) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export const isNumberAnswer = (v) => !Number.isNaN(parseNumber(v));
