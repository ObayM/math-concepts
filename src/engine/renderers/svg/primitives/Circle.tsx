import { evalNumber } from '@/engine/runtime/eval';
import { resolveColor, dash, SHAPE_FILL_OPACITY, SHAPE_STROKE_WIDTH } from '@/engine/colors';
import type { PrimProps } from '@/engine/renderers/svg/types';

export default function Circle({ obj, scope, cx }: PrimProps) {
  const x = evalNumber(obj.x, scope);
  const y = evalNumber(obj.y, scope);
  const r = evalNumber(obj.r, scope);
  const px = cx.toX(x);
  const py = cx.toY(y);
  const rx = Math.abs(cx.toX(x + r) - px);
  const ry = Math.abs(cx.toY(y + r) - py);
  if (![px, py, rx, ry].every(Number.isFinite)) return null;

  const color = resolveColor(obj.color);
  return (
    <ellipse
      cx={px}
      cy={py}
      rx={rx}
      ry={ry}
      fill={color}
      fillOpacity={obj.opacity ?? SHAPE_FILL_OPACITY}
      stroke={color}
      strokeWidth={obj.strokeWidth ?? SHAPE_STROKE_WIDTH}
      strokeDasharray={dash(obj.style)}
    />
  );
}
