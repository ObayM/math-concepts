import { evalNumber, interpolate } from '@/engine/runtime/eval';
import { resolveColor } from '@/engine/colors';
import type { PrimProps } from '@/engine/renderers/svg/types';

export default function Point({ obj, scope, cx, startDrag }: PrimProps) {
  const px = cx.toX(evalNumber(obj.x, scope));
  const py = cx.toY(evalNumber(obj.y, scope));
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
  const color = resolveColor(obj.color);
  const r = obj.r ?? 6;
  const draggable = !!obj.draggable;
  const onPointerDown = draggable ? startDrag(obj) : undefined;

  return (
    <g className={draggable ? 'cursor-grab active:cursor-grabbing' : undefined}>
      {/* soft halo signals "you can grab me" + a fat invisible hit area */}
      {draggable && (
        <>
          <circle cx={px} cy={py} r={r + 5} fill={color} opacity={0.18} />
          <circle cx={px} cy={py} r={r + 14} fill="transparent" onPointerDown={onPointerDown} />
        </>
      )}
      <circle
        cx={px}
        cy={py}
        r={r}
        fill={color}
        stroke="white"
        strokeWidth={2.5}
        onPointerDown={onPointerDown}
      />
      {obj.label && (
        <text
          x={px + r + 6}
          y={py - r - 2}
          fontSize={13}
          fontWeight={700}
          fill={color}
          stroke="white"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {interpolate(obj.label, scope)}
        </text>
      )}
    </g>
  );
}
