import { evalNumber, evalBool } from '@/engine/runtime/eval';
import { resolveColor, dash } from '@/engine/colors';
import type { PrimProps } from '@/engine/renderers/svg/types';

const SAMPLES = 240;

export default function Curve({ obj, scope, cx }: PrimProps) {
  // parametric (x(t), y(t)) over t, or the usual y = f(x) sampled across x
  const parametric = obj.xExpr !== undefined;
  const n = obj.tSteps ?? SAMPLES;
  const [aMin, aMax] = parametric ? obj.tDomain : cx.xDomain;
  const step = (aMax - aMin) / n;

  let d = '';
  let penDown = false;
  let prevY: number | undefined;
  for (let i = 0; i <= n; i++) {
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
    // a vertical asymptote never actually hits +/-Infinity at a sampled point,
    // it shows up as consecutive samples both finite but a viewport-spanning
    // jump between them — break the stroke there instead of drawing a spike.
    const crossesAsymptote = prevY !== undefined && Math.abs(Y - prevY) > cx.H;
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
      strokeWidth={obj.strokeWidth ?? 3}
      strokeLinejoin="round"
      strokeLinecap="round"
      strokeDasharray={dash(obj.style)}
    />
  );
}
