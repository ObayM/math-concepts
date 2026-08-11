import { evalNumber } from '@/engine/runtime/eval';
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
