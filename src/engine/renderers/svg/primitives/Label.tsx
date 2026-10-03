import katex from 'katex';
import { evalNumber, interpolate } from '@/engine/runtime/eval';
import { resolveColor, LABEL_HALO, texColors } from '@/engine/colors';
import type { PrimProps } from '@/engine/renderers/svg/types';
import { arabicMath } from '@/engine/artex';
import { useMathNotation, useSceneText } from '@/engine/artex/context';

export default function Label({ obj, scope, cx }: PrimProps) {
  const arabic = useMathNotation() === 'ar';
  const sceneText = useSceneText();
  const px = cx.toX(evalNumber(obj.x, scope));
  const py = cx.toY(evalNumber(obj.y, scope));
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;

  if (obj.tex) {
    const fontSize = obj.fontSize ?? 18;
    const raw = interpolate(obj.text, scope);
    const html = arabic
      ? arabicMath(raw, false).html
      : katex.renderToString(texColors(raw), { throwOnError: false });

    const narrow = cx.W < 420;
    const estW = raw.replace(/\\[a-zA-Z]+|[{}\s]/g, '').length * fontSize * 0.62 + 12;
    const boxW = narrow ? Math.max(60, Math.min(360, cx.W)) : 360;
    const shift = obj.anchor === 'middle' ? estW / 2 : obj.anchor === 'end' ? estW : 0;
    const anchored = px - shift;
    const boxX = narrow ? Math.max(0, Math.min(anchored, cx.W - Math.min(estW, cx.W))) : anchored;
    return (
      <foreignObject
        x={boxX}
        y={py - fontSize}
        width={boxW}
        height={fontSize * 3}
        overflow="visible"
      >
        <div
          dir={arabic ? 'rtl' : 'ltr'}
          style={{
            fontSize,
            color: resolveColor(obj.color ?? 'neutral'),
            whiteSpace: 'nowrap',
            unicodeBidi: 'isolate',
            lineHeight: 1.35,
            display: 'inline-block',
            background: 'rgba(255, 255, 255, 0.82)',
            padding: '1px 5px',
            borderRadius: 4,
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </foreignObject>
    );
  }

  return (
    // the scene is an ltr island whatever the page direction, so `start` keeps
    // meaning the left edge and a label never reflows into its own diagram
    <text
      x={px}
      y={py}
      direction="ltr"
      style={{ unicodeBidi: 'isolate' }}
      textAnchor={obj.anchor ?? 'start'}
      fontSize={obj.fontSize ?? 16}
      fontWeight={600}
      fill={resolveColor(obj.color ?? 'neutral')}
      stroke={LABEL_HALO}
      strokeWidth={3}
      paintOrder="stroke"
    >
      {sceneText(interpolate(obj.text, scope))}
    </text>
  );
}
