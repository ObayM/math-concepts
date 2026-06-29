import katex from 'katex';
import { evalNumber, interpolate } from '@/engine/runtime/eval';
import { resolveColor } from '@/engine/colors';
import type { PrimProps } from '@/engine/renderers/svg/types';

export default function Label({ obj, scope, cx }: PrimProps) {
  const px = cx.toX(evalNumber(obj.x, scope));
  const py = cx.toY(evalNumber(obj.y, scope));
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;

  if (obj.tex) {
    const fontSize = obj.fontSize ?? 16;
    const html = katex.renderToString(interpolate(obj.text, scope), { throwOnError: false });
    return (
      <foreignObject x={px} y={py - fontSize} width={360} height={fontSize * 3} overflow="visible">
        <div
          style={{
            fontSize,
            color: resolveColor(obj.color ?? 'neutral'),
            whiteSpace: 'nowrap',
            lineHeight: 1.2,
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
      fontSize={obj.fontSize ?? 14}
      fontWeight={600}
      fill={resolveColor(obj.color ?? 'neutral')}
      stroke="white"
      strokeWidth={3}
      paintOrder="stroke"
    >
      {interpolate(obj.text, scope)}
    </text>
  );
}
