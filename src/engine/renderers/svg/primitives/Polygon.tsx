import { evalNumber } from '@/engine/runtime/eval';
import { resolveColor, dash } from '@/engine/colors';
import type { PrimProps } from '@/engine/renderers/svg/types';

export default function Polygon({ obj, scope, cx }: PrimProps) {
  const pts = obj.points.map(([xe, ye]: [string | number, string | number]) => [
    cx.toX(evalNumber(xe, scope)),
    cx.toY(evalNumber(ye, scope)),
  ]);
  if (pts.some(([a, b]: number[]) => !Number.isFinite(a) || !Number.isFinite(b))) return null;

  const color = resolveColor(obj.color);
  return (
    <polygon
      points={pts.map((p: number[]) => p.join(',')).join(' ')}
      fill={color}
      fillOpacity={obj.opacity ?? 0.15}
      stroke={color}
      strokeWidth={obj.strokeWidth ?? 2}
      strokeLinejoin="round"
      strokeDasharray={dash(obj.style)}
    />
  );
}
