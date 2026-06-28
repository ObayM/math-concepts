import { evalNumber } from '@/engine/runtime/eval';
import { resolveColor, dash } from '@/engine/colors';
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
  const color = resolveColor(obj.color);

  return (
    <rect
      x={px}
      y={py}
      width={width}
      height={height}
      fill={color}
      fillOpacity={obj.opacity ?? 0.2}
      stroke={color}
      strokeWidth={obj.strokeWidth ?? 1.5}
      strokeDasharray={dash(obj.style)}
    />
  );
}
