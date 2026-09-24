import { evalNumber, drawOf } from '@/engine/runtime/eval';
import { resolveColor, dash, STROKE } from '@/engine/colors';
import type { PrimProps } from '@/engine/renderers/svg/types';

export default function Vector({ obj, scope, cx }: PrimProps) {
  const k = drawOf(obj, scope);
  const dx1 = evalNumber(obj.x1, scope);
  const dy1 = evalNumber(obj.y1, scope);
  const x1 = cx.toX(dx1);
  const y1 = cx.toY(dy1);
  const x2 = cx.toX(dx1 + (evalNumber(obj.x2, scope) - dx1) * k);
  const y2 = cx.toY(dy1 + (evalNumber(obj.y2, scope) - dy1) * k);
  if (![x1, y1, x2, y2].every(Number.isFinite)) return null;

  const color = resolveColor(obj.color);
  const sw = obj.strokeWidth ?? STROKE.data;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = Math.max(10, sw * 3.6);
  const spread = Math.PI / 8;
  const a1x = x2 - head * Math.cos(angle - spread);
  const a1y = y2 - head * Math.sin(angle - spread);
  const a2x = x2 - head * Math.cos(angle + spread);
  const a2y = y2 - head * Math.sin(angle + spread);
  const nx = x2 - 0.72 * head * Math.cos(angle);
  const ny = y2 - 0.72 * head * Math.sin(angle);

  return (
    <g stroke={color} fill={color}>
      <line
        x1={x1}
        y1={y1}
        x2={nx}
        y2={ny}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={dash(obj.style)}
      />
      <polygon
        points={`${x2},${y2} ${a1x},${a1y} ${nx},${ny} ${a2x},${a2y}`}
        stroke="none"
        strokeLinejoin="round"
      />
    </g>
  );
}
