import katex from 'katex';
import { evalNumber, interpolate } from '@/engine/runtime/eval';
import { resolveColor, LABEL_HALO } from '@/engine/colors';
import type { PrimProps } from '@/engine/renderers/svg/types';

export default function Label({ obj, scope, cx }: PrimProps) {
  const px = cx.toX(evalNumber(obj.x, scope));
  const py = cx.toY(evalNumber(obj.y, scope));
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;

  if (obj.tex) {
    const fontSize = obj.fontSize ?? 18;
    const raw = interpolate(obj.text, scope);
    const html = katex.renderToString(raw, { throwOnError: false });

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
          style={{
            fontSize,
            color: resolveColor(obj.color ?? 'neutral'),
            whiteSpace: 'nowrap',
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
    <text
      x={px}
      y={py}
      textAnchor={obj.anchor ?? 'start'}
      fontSize={obj.fontSize ?? 16}
      fontWeight={600}
      fill={resolveColor(obj.color ?? 'neutral')}
      stroke={LABEL_HALO}
      strokeWidth={3}
      paintOrder="stroke"
    >
      {interpolate(obj.text, scope)}
    </text>
  );
}
