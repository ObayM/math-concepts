import { evalNumber } from '@/engine/runtime/eval';
import { resolveColor, dash, SHAPE_FILL_OPACITY, SHAPE_STROKE_WIDTH } from '@/engine/colors';
import type { PrimProps } from '@/engine/renderers/svg/types';

export default function Rect({ obj, scope, cx }: PrimProps) {
  const x = evalNumber(obj.x, scope);
  const y = evalNumber(obj.y, scope);
  const w = evalNumber(obj.w, scope);
  const h = evalNumber(obj.h, scope);

  const px = cx.toX(x);
  const py = cx.toY(y + h);
  const width = Math.abs(cx.toX(x + w) - px);
  const height = Math.abs(cx.toY(y) - py);
  if (![px, py, width, height].every(Number.isFinite)) return null;
  const color = resolveColor(obj.color);

  return (
    <rect
      x={px}
      y={py}
      width={width}
      height={height}
      rx={Math.min(4, Math.min(width, height) * 0.12)}
      fill={color}
      fillOpacity={obj.opacity ?? SHAPE_FILL_OPACITY}
      stroke={color}
      strokeWidth={obj.strokeWidth ?? SHAPE_STROKE_WIDTH}
      strokeLinejoin="round"
      strokeDasharray={dash(obj.style)}
    />
  );
}
