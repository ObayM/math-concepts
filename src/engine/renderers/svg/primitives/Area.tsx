import { evalNumber } from '@/engine/runtime/eval';
import { resolveColor } from '@/engine/colors';
import type { PrimProps } from '@/engine/renderers/svg/types';

const SAMPLES = 240;

// a filled region between an upper curve y = expr and a lower boundary (default
// y = 0), clipped to x in [from, to] (default the scene's xDomain). the outline
// walks the top left→right, then the bottom right→left, and closes.
export default function Area({ obj, scope, cx }: PrimProps) {
  const [xMin, xMax] = cx.xDomain;
  const from = obj.from !== undefined ? evalNumber(obj.from, scope) : xMin;
  const to = obj.to !== undefined ? evalNumber(obj.to, scope) : xMax;
  const lo = Math.max(xMin, Math.min(from, to));
  const hi = Math.min(xMax, Math.max(from, to));
  if (!(hi > lo)) return null;

  const step = (hi - lo) / SAMPLES;
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const x = lo + i * step;
    const yTop = evalNumber(obj.expr, { ...scope, x });
    const yBot = obj.lower !== undefined ? evalNumber(obj.lower, { ...scope, x }) : 0;
    if (!isFinite(yTop) || !isFinite(yBot)) continue;
    const X = cx.toX(x);
    top.push(`${X.toFixed(2)} ${cx.toY(yTop).toFixed(2)}`);
    bottom.push(`${X.toFixed(2)} ${cx.toY(yBot).toFixed(2)}`);
  }
  if (top.length < 2) return null;

  const d = `M ${top.join(' L ')} L ${bottom.reverse().join(' L ')} Z`;
  return (
    <path d={d} fill={resolveColor(obj.color)} fillOpacity={obj.opacity ?? 0.15} stroke="none" />
  );
}
