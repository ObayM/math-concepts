import { evalNumber } from '@/engine/runtime/eval';
import { resolveColor, dash } from '@/engine/colors';
import type { PrimProps } from '@/engine/renderers/svg/types';

export default function Line({ obj, scope, cx, points }: PrimProps) {
  let x1: number, y1: number, x2: number, y2: number;

  if (obj.through && obj.slope != null) {
    const anchor = points[obj.through];
    if (!anchor) return null;
    const m = evalNumber(obj.slope, scope);
    const [xMin, xMax] = cx.xDomain;
    x1 = xMin;
    y1 = anchor.y + m * (xMin - anchor.x);
    x2 = xMax;
    y2 = anchor.y + m * (xMax - anchor.x);
  } else {
    x1 = evalNumber(obj.x1 ?? 0, scope);
    y1 = evalNumber(obj.y1 ?? 0, scope);
    x2 = evalNumber(obj.x2 ?? 0, scope);
    y2 = evalNumber(obj.y2 ?? 0, scope);
  }

  const X1 = cx.toX(x1);
  const Y1 = cx.toY(y1);
  const X2 = cx.toX(x2);
  const Y2 = cx.toY(y2);
  if (![X1, Y1, X2, Y2].every(Number.isFinite)) return null;

  return (
    <line
      x1={X1}
      y1={Y1}
      x2={X2}
      y2={Y2}
      stroke={resolveColor(obj.color)}
      strokeWidth={obj.strokeWidth ?? 2}
      strokeDasharray={dash(obj.style)}
      strokeLinecap="round"
    />
  );
}
