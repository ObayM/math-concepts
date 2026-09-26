import type { ReactNode } from 'react';
import { sketchGap, type Pt } from '@/engine/checks/geometry';
import { resolveColor, STROKE, SHAPE_FILL_OPACITY } from '@/engine/colors';
import type { ExprIR } from '@/engine/expr';
import type { CoordSystem } from './types';

export interface SketchOverlayConfig {
  follows: ExprIR | number;
  over: [number, number];
  tol: number;
}

export default function SketchOverlay({
  cx,
  line,
  overlay,
  children,
}: {
  cx: CoordSystem;
  line: Pt[] | null;
  overlay: SketchOverlayConfig;
  children: ReactNode;
}) {
  const { truth, bands } = sketchGap(line, overlay.follows, overlay.over, overlay.tol);
  const [yMin, yMax] = cx.yDomain;
  const span = yMax - yMin;
  const screen = (pts: Pt[]) =>
    pts.map(([x, y]) => {
      const clamped = Math.max(yMin - span, Math.min(yMax + span, y));
      return `${cx.toX(x).toFixed(2)},${cx.toY(clamped).toFixed(2)}`;
    });

  return (
    <>
      <g data-overlay="gap" className="sketch-gap" pointerEvents="none">
        {bands.map((band, i) => (
          <polygon
            key={i}
            data-off={band.off ? 'true' : undefined}
            points={screen(band.pts).join(' ')}
            fill={resolveColor(band.off ? 'danger' : 'success')}
            fillOpacity={SHAPE_FILL_OPACITY}
            stroke="none"
          />
        ))}
      </g>
      {children}
      <g data-overlay="truth" pointerEvents="none">
        {truth.map((run, i) => (
          <path
            key={i}
            className="sketch-truth"
            pathLength={1}
            d={`M ${screen(run).join(' L ')}`}
            fill="none"
            stroke={resolveColor('success')}
            strokeWidth={STROKE.hero}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
    </>
  );
}
