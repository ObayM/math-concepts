import { evalNumber, interpolate } from '@/engine/runtime/eval';
import { resolveColor, LABEL_HALO } from '@/engine/colors';
import { shortNum } from '@/engine/format';
import type { PrimProps } from '@/engine/renderers/svg/types';
import { useSceneText } from '@/engine/artex/context';

export default function Point({ obj, scope, cx, startDrag, keyDrag }: PrimProps) {
  const sceneText = useSceneText();
  const px = cx.toX(evalNumber(obj.x, scope));
  const py = cx.toY(evalNumber(obj.y, scope));
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
  const color = resolveColor(obj.color);
  const r = obj.r ?? 7;
  const draggable = !!obj.draggable;
  const onPointerDown = draggable ? startDrag(obj) : undefined;
  const x = evalNumber(obj.x, scope);
  const y = evalNumber(obj.y, scope);
  const where = `(${shortNum(x)}, ${shortNum(y)})`;
  const keys =
    draggable && keyDrag
      ? {
          tabIndex: 0,
          role: 'slider',
          'aria-label': obj.label ? interpolate(obj.label, scope) : obj.id,
          'aria-valuetext': where,
          'aria-valuenow': obj.draggable.axis === 'y' ? y : x,
          onKeyDown: keyDrag(obj),
        }
      : {};

  return (
    <g
      className={
        draggable
          ? 'cursor-grab active:cursor-grabbing outline-none [&:focus-visible>circle:first-child]:opacity-40'
          : undefined
      }
      {...keys}
    >
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
          {sceneText(interpolate(obj.label, scope))}
        </text>
      )}
    </g>
  );
}
