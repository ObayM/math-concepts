export function shortNum(n: number): string {
  if (Math.abs(n) < 1e-9) return '0';
  if (Math.abs(n) >= 1) return String(Math.round(n * 100) / 100);
  return String(Number(n.toPrecision(2)));
}
