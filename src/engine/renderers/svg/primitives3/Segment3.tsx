import { evalNumber, interpolate } from '@/engine/runtime/eval';
import { resolveColor, dash, LABEL_HALO, STROKE } from '@/engine/colors';
import type { Prim3Props } from '@/engine/renderers/svg/types';
import { useSceneText } from '@/engine/artex/context';

export default function Segment3({ obj, scope, cx }: Prim3Props) {
  const sceneText = useSceneText();
  const a = ['x1', 'y1', 'z1'].map((k) => evalNumber(obj[k], scope));
  const b = ['x2', 'y2', 'z2'].map((k) => evalNumber(obj[k], scope));
  if (![...a, ...b].every(Number.isFinite)) return null;

  const [x1, y1] = cx.project3(a[0], a[1], a[2]);
  const [x2, y2] = cx.project3(b[0], b[1], b[2]);
  if (![x1, y1, x2, y2].every(Number.isFinite)) return null;

  const color = resolveColor(obj.color);
  const sw = obj.strokeWidth ?? STROKE.data;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = obj.arrow ? Math.max(10, sw * 3.6) : 0;
  const nx = x2 - 0.72 * head * Math.cos(angle);
  const ny = y2 - 0.72 * head * Math.sin(angle);

  return (
    <g stroke={color} fill={color}>
      <line
        x1={x1}
        y1={y1}
        x2={obj.arrow ? nx : x2}
        y2={obj.arrow ? ny : y2}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={dash(obj.style)}
      />
      {obj.arrow && (
        <polygon
          points={[
            `${x2},${y2}`,
            `${x2 - head * Math.cos(angle - Math.PI / 8)},${y2 - head * Math.sin(angle - Math.PI / 8)}`,
            `${nx},${ny}`,
            `${x2 - head * Math.cos(angle + Math.PI / 8)},${y2 - head * Math.sin(angle + Math.PI / 8)}`,
          ].join(' ')}
          stroke="none"
          strokeLinejoin="round"
        />
      )}
      {obj.label && (
        <text
          x={(x1 + x2) / 2 + 8}
          y={(y1 + y2) / 2 - 6}
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
