import { evalNumber } from '@/engine/runtime/eval';
import { resolveColor } from '@/engine/colors';
import type { PrimProps } from '@/engine/renderers/svg/types';

export default function Vector({ obj, scope, cx }: PrimProps) {
  const x1 = cx.toX(evalNumber(obj.x1, scope));
  const y1 = cx.toY(evalNumber(obj.y1, scope));
  const x2 = cx.toX(evalNumber(obj.x2, scope));
  const y2 = cx.toY(evalNumber(obj.y2, scope));
  if (![x1, y1, x2, y2].every(Number.isFinite)) return null;

  const color = resolveColor(obj.color);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 11;
  const spread = Math.PI / 7;
  const a1x = x2 - head * Math.cos(angle - spread);
  const a1y = y2 - head * Math.sin(angle - spread);
  const a2x = x2 - head * Math.cos(angle + spread);
  const a2y = y2 - head * Math.sin(angle + spread);

  return (
    <g stroke={color} fill={color}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        strokeWidth={obj.strokeWidth ?? 2.5}
        strokeLinecap="round"
      />
      <polygon points={`${x2},${y2} ${a1x},${a1y} ${a2x},${a2y}`} stroke="none" />
    </g>
  );
}
