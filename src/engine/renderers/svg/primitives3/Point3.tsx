import { evalNumber, interpolate } from '@/engine/runtime/eval';
import { resolveColor, LABEL_HALO, STROKE } from '@/engine/colors';
import type { Prim3Props } from '@/engine/renderers/svg/types';
import { useSceneText } from '@/engine/artex/context';

export default function Point3({ obj, scope, cx }: Prim3Props) {
  const sceneText = useSceneText();
  const x = evalNumber(obj.x, scope);
  const y = evalNumber(obj.y, scope);
  const z = evalNumber(obj.z, scope);
  if (![x, y, z].every(Number.isFinite)) return null;

  const [px, py] = cx.project3(x, y, z);
  if (![px, py].every(Number.isFinite)) return null;

  const color = resolveColor(obj.color);
  const r = obj.r ?? 5;

  return (
    <g>
      {obj.guides && <Guides x={x} y={y} z={z} cx={cx} color={color} />}
      <circle
        cx={px}
        cy={py}
        r={r}
        fill={obj.open ? LABEL_HALO : color}
        stroke={color}
        strokeWidth={STROKE.data}
      />
      {obj.label && (
        <text
          x={px + r + 6}
          y={py - r - 3}
          direction="ltr"
          style={{ unicodeBidi: 'isolate' }}
          fontSize={14}
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

// the dropped rails that say "this is where the point lives": down to the xy
// plane, then along to each axis
function Guides({
  x,
  y,
  z,
  cx,
  color,
}: {
  x: number;
  y: number;
  z: number;
  cx: Prim3Props['cx'];
  color: string;
}) {
  const legs: [number, number, number][][] = [
    [
      [x, y, z],
      [x, y, 0],
    ],
    [
      [x, y, 0],
      [x, 0, 0],
    ],
    [
      [x, y, 0],
      [0, y, 0],
    ],
  ];
  return (
    <g stroke={color} strokeWidth={1.5} strokeDasharray="4 4" opacity={0.55} fill="none">
      {legs.map(([a, b], i) => {
        const [ax, ay] = cx.project3(...a);
        const [bx, by] = cx.project3(...b);
        if (![ax, ay, bx, by].every(Number.isFinite)) return null;
        return <line key={i} x1={ax} y1={ay} x2={bx} y2={by} />;
      })}
    </g>
  );
}
