export function shortNum(n: number): string {
  if (Math.abs(n) >= 1 || n === 0) return String(Math.round(n * 100) / 100);
  return String(Number(n.toPrecision(2)));
}
