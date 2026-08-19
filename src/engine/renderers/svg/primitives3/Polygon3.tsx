import { evalNumber } from '@/engine/runtime/eval';
import { resolveColor, dash, SHAPE_STROKE_WIDTH } from '@/engine/colors';
import type { Prim3Props } from '@/engine/renderers/svg/types';

export default function Polygon3({ obj, scope, cx }: Prim3Props) {
  const pts = (obj.points as [never, never, never][]).map((p) =>
    cx.project3(evalNumber(p[0], scope), evalNumber(p[1], scope), evalNumber(p[2], scope))
  );
  if (!pts.every(([px, py]) => Number.isFinite(px) && Number.isFinite(py))) return null;

  const color = resolveColor(obj.color);
  return (
    <polygon
      points={pts.map(([px, py]) => `${px},${py}`).join(' ')}
      fill={obj.fill ? resolveColor(obj.fill) : color}
      fillOpacity={obj.opacity ?? 0.22}
      stroke={color}
      strokeWidth={obj.strokeWidth ?? SHAPE_STROKE_WIDTH}
      strokeDasharray={dash(obj.style)}
      strokeLinejoin="round"
    />
  );
}
