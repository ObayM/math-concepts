import { evalNumber, evalBool, drawOf } from '@/engine/runtime/eval';
import { resolveColor, dash, STROKE } from '@/engine/colors';
import { PLOT_PAD } from '@/engine/renderers/svg/coords';
import type { PrimProps } from '@/engine/renderers/svg/types';
import { MAX_CURVE_STEPS } from '@/engine/ir/schema';

const SAMPLES = 240;

export default function Curve({ obj, scope, cx }: PrimProps) {
  const parametric = obj.xExpr !== undefined;
  const n = Math.min(MAX_CURVE_STEPS, Math.max(2, obj.tSteps ?? SAMPLES));
  const [aMin, aMax] = parametric ? obj.tDomain : cx.xDomain;
  const step = (aMax - aMin) / n;

  const last = Math.round(n * drawOf(obj, scope));
  let d = '';
  let penDown = false;
  let prevY: number | undefined;
  for (let i = 0; i <= last; i++) {
    const a = aMin + i * step;
    let x: number, y: number;
    if (parametric) {
      x = evalNumber(obj.xExpr, { ...scope, t: a });
      y = evalNumber(obj.yExpr, { ...scope, t: a });
    } else {
      x = a;
      // `where` gates each sample so a curve can cover only part of the domain
      if (obj.where && !evalBool(obj.where, { ...scope, x: a })) {
        penDown = false;
        prevY = undefined;
        continue;
      }
      y = evalNumber(obj.expr, { ...scope, x: a });
    }
    if (!isFinite(x) || !isFinite(y)) {
      penDown = false;
      prevY = undefined;
      continue;
    }
    const X = cx.toX(x);
    const Y = cx.toY(y);
    const crossesAsymptote = prevY !== undefined && Math.abs(Y - prevY) > cx.H - 2 * PLOT_PAD;
    d +=
      penDown && !crossesAsymptote
        ? ` L ${X.toFixed(2)} ${Y.toFixed(2)}`
        : ` M ${X.toFixed(2)} ${Y.toFixed(2)}`;
    penDown = true;
    prevY = Y;
  }

  return (
    <path
      d={d}
      fill="none"
      stroke={resolveColor(obj.color)}
      strokeWidth={obj.strokeWidth ?? STROKE.hero}
      strokeLinejoin="round"
      strokeLinecap="round"
      strokeDasharray={dash(obj.style)}
    />
  );
}
