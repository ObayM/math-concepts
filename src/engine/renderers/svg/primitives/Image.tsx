import { evalNumber } from '@/engine/runtime/eval';
import type { PrimProps } from '@/engine/renderers/svg/types';

export default function Image({ obj, scope, cx }: PrimProps) {
  const x = evalNumber(obj.x, scope);
  const y = evalNumber(obj.y, scope);
  const w = evalNumber(obj.w, scope);
  const h = evalNumber(obj.h, scope);

  const px = cx.toX(x);
  const py = cx.toY(y + h);
  const width = Math.abs(cx.toX(x + w) - px);
  const height = Math.abs(cx.toY(y) - py);
  if (![px, py, width, height].every(Number.isFinite)) return null;

  return (
    <image
      x={px}
      y={py}
      width={width}
      height={height}
      href={obj.src}
      opacity={obj.opacity}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={obj.alt}
    />
  );
}
