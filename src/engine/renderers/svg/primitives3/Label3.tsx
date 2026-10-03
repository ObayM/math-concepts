import { evalNumber, interpolate } from '@/engine/runtime/eval';
import { resolveColor, LABEL_HALO } from '@/engine/colors';
import type { Prim3Props } from '@/engine/renderers/svg/types';
import { useSceneText } from '@/engine/artex/context';

export default function Label3({ obj, scope, cx }: Prim3Props) {
  const sceneText = useSceneText();
  const x = evalNumber(obj.x, scope);
  const y = evalNumber(obj.y, scope);
  const z = evalNumber(obj.z, scope);
  if (![x, y, z].every(Number.isFinite)) return null;
  const [px, py] = cx.project3(x, y, z);
  if (![px, py].every(Number.isFinite)) return null;

  return (
    <text
      x={px}
      y={py}
      direction="ltr"
      style={{ unicodeBidi: 'isolate' }}
      textAnchor="middle"
      fontSize={obj.fontSize ?? 15}
      fontWeight={600}
      fill={resolveColor(obj.color)}
      stroke={LABEL_HALO}
      strokeWidth={3}
      paintOrder="stroke"
    >
      {sceneText(interpolate(obj.text, scope))}
    </text>
  );
}
