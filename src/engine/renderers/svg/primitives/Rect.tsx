import { evalNumber } from '@/engine/runtime/eval';
import { resolveColor, dash, SHAPE_FILL_OPACITY, SHAPE_STROKE_WIDTH } from '@/engine/colors';
import type { PrimProps } from '@/engine/renderers/svg/types';
import { rotateAbout } from './rotate';

export default function Rect({ obj, scope, cx }: PrimProps) {
  const x = evalNumber(obj.x, scope);
  const y = evalNumber(obj.y, scope);
  const w = evalNumber(obj.w, scope);
  const h = evalNumber(obj.h, scope);
  const rotate = obj.rotate == null ? 0 : evalNumber(obj.rotate, scope);

  const color = resolveColor(obj.color);
  const skin = {
    fill: color,
    fillOpacity: obj.opacity ?? SHAPE_FILL_OPACITY,
    stroke: color,
    strokeWidth: obj.strokeWidth ?? SHAPE_STROKE_WIDTH,
    strokeLinejoin: 'round' as const,
    strokeDasharray: dash(obj.style),
  };

  if (rotate) {
    const corners: [number, number][] = [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ];
    const pts = corners.map(([px, py]) => {
      const [rx, ry] = rotateAbout(px, py, x, y, rotate);
      return [cx.toX(rx), cx.toY(ry)];
    });
    if (pts.some(([a, b]) => !Number.isFinite(a) || !Number.isFinite(b))) return null;
    return <polygon points={pts.map((p) => p.join(',')).join(' ')} {...skin} />;
  }

  const px = cx.toX(x);
  const py = cx.toY(y + h);
  const width = Math.abs(cx.toX(x + w) - px);
  const height = Math.abs(cx.toY(y) - py);
  if (![px, py, width, height].every(Number.isFinite)) return null;

  return (
    <rect
      x={px}
      y={py}
      width={width}
      height={height}
      rx={Math.min(4, Math.min(width, height) * 0.12)}
      {...skin}
    />
  );
}
