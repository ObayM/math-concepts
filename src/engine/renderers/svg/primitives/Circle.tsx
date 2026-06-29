import { evalNumber } from '@/engine/runtime/eval';
import { resolveColor, dash } from '@/engine/colors';
import type { PrimProps } from '@/engine/renderers/svg/types';

export default function Circle({ obj, scope, cx }: PrimProps) {
  const x = evalNumber(obj.x, scope);
  const y = evalNumber(obj.y, scope);
  const r = evalNumber(obj.r, scope);
  const px = cx.toX(x);
  const py = cx.toY(y);
  // radius in scene units -> separate pixel radii (true to the coord system if scales differ)
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
      fillOpacity={obj.opacity ?? 0.15}
      stroke={color}
      strokeWidth={obj.strokeWidth ?? 2}
      strokeDasharray={dash(obj.style)}
    />
  );
}
