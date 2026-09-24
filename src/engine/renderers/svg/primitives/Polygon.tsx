import { evalNumber, drawOf } from '@/engine/runtime/eval';
import { resolveColor, dash, SHAPE_FILL_OPACITY, SHAPE_STROKE_WIDTH } from '@/engine/colors';
import type { PrimProps } from '@/engine/renderers/svg/types';
import { rotateAbout } from './rotate';

export default function Polygon({ obj, scope, cx }: PrimProps) {
  const data = obj.points.map(([xe, ye]: [string | number, string | number]) => [
    evalNumber(xe, scope),
    evalNumber(ye, scope),
  ]);
  const rotate = obj.rotate == null ? 0 : evalNumber(obj.rotate, scope);
  const [ox, oy] = data[0] ?? [0, 0];

  const pts = data.map(([dx, dy]: number[]) => {
    const [rx, ry] = rotateAbout(dx, dy, ox, oy, rotate);
    return [cx.toX(rx), cx.toY(ry)];
  });
  if (pts.some(([a, b]: number[]) => !Number.isFinite(a) || !Number.isFinite(b))) return null;

  const color = resolveColor(obj.color);
  const k = drawOf(obj, scope);
  if (k < 1) {
    return (
      <polyline
        points={partialPerimeter(pts, k)}
        fill="none"
        stroke={color}
        strokeWidth={obj.strokeWidth ?? SHAPE_STROKE_WIDTH}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={dash(obj.style)}
      />
    );
  }
  return (
    <polygon
      points={pts.map((p: number[]) => p.join(',')).join(' ')}
      fill={color}
      fillOpacity={obj.opacity ?? SHAPE_FILL_OPACITY}
      stroke={color}
      strokeWidth={obj.strokeWidth ?? SHAPE_STROKE_WIDTH}
      strokeLinejoin="round"
      strokeDasharray={dash(obj.style)}
    />
  );
}

function partialPerimeter(pts: number[][], k: number): string {
  const ring = [...pts, pts[0]];
  const lens = ring.slice(1).map((p, i) => Math.hypot(p[0] - ring[i][0], p[1] - ring[i][1]));
  let left = lens.reduce((a, b) => a + b, 0) * k;
  const out = [ring[0]];
  for (let i = 0; i < lens.length && left > 0; i++) {
    const t = Math.min(1, left / (lens[i] || 1));
    const [ax, ay] = ring[i];
    const [bx, by] = ring[i + 1];
    out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
    left -= lens[i];
  }
  return out.map((p) => p.join(',')).join(' ');
}
