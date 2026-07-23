import { evalNumber, interpolate } from '@/engine/runtime/eval';
import { resolveColor, LABEL_HALO } from '@/engine/colors';
import type { PrimProps } from '@/engine/renderers/svg/types';

export default function Point({ obj, scope, cx, startDrag }: PrimProps) {
  const px = cx.toX(evalNumber(obj.x, scope));
  const py = cx.toY(evalNumber(obj.y, scope));
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
  const color = resolveColor(obj.color);
  const r = obj.r ?? 7;
  const draggable = !!obj.draggable;
  const onPointerDown = draggable ? startDrag(obj) : undefined;

  return (
    <g className={draggable ? 'cursor-grab active:cursor-grabbing' : undefined}>
      {draggable && (
        <>
          <circle cx={px} cy={py} r={r + 8} fill={color} opacity={0.12} />
          <circle
            cx={px}
            cy={py}
            r={r + 4}
            fill="none"
            stroke={color}
            strokeWidth={2}
            opacity={0.55}
          />
          <circle cx={px} cy={py} r={r + 16} fill="transparent" onPointerDown={onPointerDown} />
        </>
      )}
      <circle
        cx={px}
        cy={py}
        r={r}
        fill={obj.open ? 'white' : color}
        stroke={obj.open ? color : LABEL_HALO}
        strokeWidth={2.5}
        onPointerDown={onPointerDown}
      />
      {obj.label && (
        <text
          x={px + r + 7}
          y={py - r - 3}
          fontSize={15}
          fontWeight={600}
          fill={color}
          stroke={LABEL_HALO}
          strokeWidth={3}
          paintOrder="stroke"
        >
          {interpolate(obj.label, scope)}
        </text>
      )}
    </g>
  );
}
