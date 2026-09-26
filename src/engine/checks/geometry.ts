import type { ExprIR, Scope } from '@/engine/expr';
import { evalNum } from '@/engine/expr';

// pure geometric predicates over student answers, all in scene (data) coords.
// no react, no dom — importable from api routes and unit tests. these back the
// sketch/hotspot/place-points checkable types (see the exercises registry).

export type Pt = [number, number];

// --- distance ---------------------------------------------------------------

// squared distance from point p to segment ab (avoids a sqrt in the hot path)
function distSqToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    const px = p[0] - a[0];
    const py = p[1] - a[1];
    return px * px + py * py;
  }
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = a[0] + t * dx;
  const cy = a[1] + t * dy;
  const ex = p[0] - cx;
  const ey = p[1] - cy;
  return ex * ex + ey * ey;
}

// shortest distance from a point to a polyline (open path of segments)
export function distToPolyline(p: Pt, line: Pt[]): number {
  if (line.length === 0) return Infinity;
  if (line.length === 1) return Math.hypot(p[0] - line[0][0], p[1] - line[0][1]);
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const d = distSqToSegment(p, line[i], line[i + 1]);
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

// every target point must lie within tol of the drawn polyline, and every time
// the drawing crosses a target's x it has to be near that target, so scribbling
// up and down across the whole scene doesn't pass
export function curveNearPoints(line: Pt[], targets: Pt[], tol: number): boolean {
  return targets.every(
    (t) =>
      distToPolyline(t, line) <= tol &&
      crossingsAt(line, t[0]).every((y) => Math.abs(y - t[1]) <= 2 * tol)
  );
}

function crossingsAt(line: Pt[], x: number): number[] {
  const ys: number[] = [];
  for (let i = 0; i < line.length - 1; i++) {
    const [x1, y1] = line[i];
    const [x2, y2] = line[i + 1];
    if (x1 === x2 || x < Math.min(x1, x2) || x > Math.max(x1, x2)) continue;
    ys.push(y1 + ((x - x1) / (x2 - x1)) * (y2 - y1));
  }
  return ys;
}

export function pointsNearTargets(points: Pt[], targets: Pt[], tol: number): boolean {
  return targets.every((t) => points.some((p) => Math.hypot(p[0] - t[0], p[1] - t[1]) <= tol));
}

// --- curve vs expression ----------------------------------------------------

// does the drawn polyline approximate y = f(x) over [a,b]? resample the curve
// at N x's, compare to the drawn y at that x (linear interp along the polyline),
// require `coverage` fraction within tol AND the drawing to span most of [a,b].
export function curveMatchesExpr(
  line: Pt[],
  expr: ExprIR | number,
  domain: [number, number],
  tol: number,
  coverage = 0.9,
  samples = 40
): boolean {
  if (line.length < 2) return false;
  const [a, b] = domain;
  if (b <= a) return false;

  // drawn x-span must cover most of the domain, else "one dot" would pass
  const xs = line.map((p) => p[0]);
  const drawnMin = Math.min(...xs);
  const drawnMax = Math.max(...xs);
  if ((drawnMax - drawnMin) / (b - a) < coverage) return false;

  let hit = 0;
  let total = 0;
  for (let i = 0; i <= samples; i++) {
    const x = a + ((b - a) * i) / samples;
    if (x < drawnMin || x > drawnMax) continue;
    const drawnY = interpY(line, x);
    if (drawnY == null) continue;
    total++;
    const scope: Scope = { x };
    const wantY = evalNum(expr, scope);
    if (Number.isFinite(wantY) && Math.abs(drawnY - wantY) <= tol) hit++;
  }
  return total > 0 && hit / total >= coverage;
}

export interface GapBand {
  off: boolean;
  pts: Pt[];
}

export interface SketchGap {
  truth: Pt[][];
  bands: GapBand[];
  within: number;
}

export function sketchGap(
  line: Pt[] | null,
  expr: ExprIR | number,
  domain: [number, number],
  tol: number,
  samples = 120
): SketchGap {
  const [a, b] = domain;
  const truth: Pt[][] = [];
  const bands: GapBand[] = [];
  let run: Pt[] = [];
  let drawn: Pt[] = [];
  let want: Pt[] = [];
  let off = false;
  let hit = 0;
  let finite = 0;

  const closeBand = () => {
    if (drawn.length > 1) bands.push({ off, pts: [...drawn, ...want.reverse()] });
    drawn = [];
    want = [];
  };

  for (let i = 0; i <= samples; i++) {
    const x = a + ((b - a) * i) / samples;
    const y = safeEval(expr, x);
    if (!Number.isFinite(y)) {
      if (run.length > 1) truth.push(run);
      run = [];
      closeBand();
      continue;
    }
    finite++;
    run.push([x, y]);

    const d = line && line.length > 1 ? interpY(line, x) : null;
    if (d == null) {
      closeBand();
      continue;
    }
    const miss = Math.abs(d - y) > tol;
    if (!miss) hit++;
    if (drawn.length && miss !== off) {
      const joinD = drawn[drawn.length - 1];
      const joinW = want[want.length - 1];
      closeBand();
      drawn = [joinD];
      want = [joinW];
    }
    off = miss;
    drawn.push([x, d]);
    want.push([x, y]);
  }
  closeBand();
  if (run.length > 1) truth.push(run);
  return { truth, bands, within: finite ? hit / finite : 0 };
}

function safeEval(expr: ExprIR | number, x: number): number {
  try {
    return evalNum(expr, { x });
  } catch {
    return NaN;
  }
}

// y of the polyline at a given x (assumes roughly monotonic-x sketch input)
function interpY(line: Pt[], x: number): number | null {
  for (let i = 0; i < line.length - 1; i++) {
    const [x1, y1] = line[i];
    const [x2, y2] = line[i + 1];
    const lo = Math.min(x1, x2);
    const hi = Math.max(x1, x2);
    if (x >= lo && x <= hi) {
      if (x2 === x1) return (y1 + y2) / 2;
      const t = (x - x1) / (x2 - x1);
      return y1 + t * (y2 - y1);
    }
  }
  return null;
}

// --- regions (hotspot / place-points) --------------------------------------

export type Region =
  | { kind: 'rect'; x: number; y: number; w: number; h: number }
  | { kind: 'circle'; x: number; y: number; r: number }
  | { kind: 'polygon'; points: Pt[] };

export function pointInRegion(p: Pt, region: Region): boolean {
  switch (region.kind) {
    case 'rect':
      return (
        p[0] >= region.x &&
        p[0] <= region.x + region.w &&
        p[1] >= region.y &&
        p[1] <= region.y + region.h
      );
    case 'circle':
      return Math.hypot(p[0] - region.x, p[1] - region.y) <= region.r;
    case 'polygon':
      return pointInPolygon(p, region.points);
  }
}

// ray-casting: count crossings of a ray going +x from p
function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersects = yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

// --- lines ------------------------------------------------------------------

export function slope(a: Pt, b: Pt): number {
  return (b[1] - a[1]) / (b[0] - a[0]);
}

export function approx(value: number, target: number, tol: number): boolean {
  return Math.abs(value - target) <= tol;
}
