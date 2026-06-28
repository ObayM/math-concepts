import { evalNumber } from '@/engine/runtime/eval';
import { resolveColor, dash } from '@/engine/colors';
import type { PrimProps } from '@/engine/renderers/svg/types';

const SAMPLES = 240;

export default function Curve({ obj, scope, cx }: PrimProps) {
  const [xMin, xMax] = cx.xDomain;
  const step = (xMax - xMin) / SAMPLES;

  let d = '';
  let penDown = false;
  for (let i = 0; i <= SAMPLES; i++) {
    const x = xMin + i * step;
    const y = evalNumber(obj.expr, { ...scope, x });
    if (!isFinite(y)) {
      penDown = false;
      continue;
    }
    const X = cx.toX(x);
    const Y = cx.toY(y);
    d += penDown ? ` L ${X.toFixed(2)} ${Y.toFixed(2)}` : ` M ${X.toFixed(2)} ${Y.toFixed(2)}`;
    penDown = true;
  }

  return (
    <path
      d={d}
      fill="none"
      stroke={resolveColor(obj.color)}
      strokeWidth={obj.strokeWidth ?? 3}
      strokeLinejoin="round"
      strokeLinecap="round"
      strokeDasharray={dash(obj.style)}
    />
  );
}
