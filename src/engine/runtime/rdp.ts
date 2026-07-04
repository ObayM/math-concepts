export type Pt = [number, number];

function perpDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
}

export function simplify(points: Pt[], epsilon: number): Pt[] {
  if (points.length <= 2) return points;

  const first = points[0];
  const last = points[points.length - 1];
  let maxDist = 0;
  let splitAt = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      splitAt = i;
    }
  }

  if (maxDist <= epsilon) return [first, last];

  const left = simplify(points.slice(0, splitAt + 1), epsilon);
  const right = simplify(points.slice(splitAt), epsilon);
  return [...left.slice(0, -1), ...right];
}
