export function rotateAbout(
  x: number,
  y: number,
  ox: number,
  oy: number,
  deg: number
): [number, number] {
  if (!deg) return [x, y];
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = x - ox;
  const dy = y - oy;
  return [ox + dx * c - dy * s, oy + dx * s + dy * c];
}
