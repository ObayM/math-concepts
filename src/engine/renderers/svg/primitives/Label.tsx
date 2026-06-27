import { evalNumber, interpolate } from '../../../runtime/eval';
import { resolveColor } from '../../../colors';
import type { PrimProps } from '../types';

export default function Label({ obj, scope, cx }: PrimProps) {
  const px = cx.toX(evalNumber(obj.x, scope));
  const py = cx.toY(evalNumber(obj.y, scope));
  return (
    <text
      x={px}
      y={py}
      fontSize={obj.fontSize ?? 14}
      fontWeight={600}
      fill={resolveColor(obj.color ?? 'neutral')}
    >
      {interpolate(obj.text, scope)}
    </text>
  );
}
