import { evalNumber } from '@/engine/runtime/eval';
import { resolveColor } from '@/engine/colors';
import type { PrimProps } from '@/engine/renderers/svg/types';

export default function Arc({ obj, scope, cx }: PrimProps) {
  const x = evalNumber(obj.x, scope);
  const y = evalNumber(obj.y, scope);
  const r = evalNumber(obj.r, scope);
  const start = (evalNumber(obj.start, scope) * Math.PI) / 180;
  const end = (evalNumber(obj.end, scope) * Math.PI) / 180;

  const px = cx.toX(x);
  const py = cx.toY(y);
  const rpx = Math.abs(cx.toX(x + r) - px);
  if (![px, py, rpx].every(Number.isFinite)) return null;

  // screen y is flipped, so subtract sin
  const sx = px + rpx * Math.cos(start);
  const sy = py - rpx * Math.sin(start);
  const ex = px + rpx * Math.cos(end);
  const ey = py - rpx * Math.sin(end);
  const largeArc = Math.abs(end - start) > Math.PI ? 1 : 0;
  const sweep = end > start ? 1 : 0;

  const color = resolveColor(obj.color);
  return (
    <path
      d={`M ${sx} ${sy} A ${rpx} ${rpx} 0 ${largeArc} ${sweep} ${ex} ${ey}`}
      fill="none"
      stroke={color}
      strokeWidth={obj.strokeWidth ?? 2}
    />
  );
}
