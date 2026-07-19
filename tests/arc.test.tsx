import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { compile } from '@/engine/lang';
import { Scene } from '@/engine';

function arcPath(source: string) {
  const html = renderToStaticMarkup(React.createElement(Scene, { ir: compile(source) }));
  const m = html.match(
    /d="M ([\d.-]+) ([\d.-]+) A ([\d.-]+) [\d.-]+ 0 ([01]) ([01]) ([\d.-]+) ([\d.-]+)"/
  );
  if (!m) throw new Error(`no arc path found in:\n${html}`);
  const [, sx, sy, r, largeArc, sweep, ex, ey] = m;
  return {
    start: [Number(sx), Number(sy)] as const,
    end: [Number(ex), Number(ey)] as const,
    r: Number(r),
    largeArc: Number(largeArc),
    sweep: Number(sweep),
  };
}

// SVG endpoint-to-center for a non-rotated circle (rx = ry = r). recovers the
// arc's center from its endpoints and flags. the sweep flag decides which of the
// two candidate centers is chosen, so an inverted flag lands the center on the
// mirror side of the chord, which is exactly the arc-render bug this guards.
function centerOf(
  start: readonly [number, number],
  end: readonly [number, number],
  r: number,
  fa: number,
  fs: number
) {
  const [x1, y1] = start;
  const [x2, y2] = end;
  const x1p = (x1 - x2) / 2;
  const y1p = (y1 - y2) / 2;
  const num = r * r - x1p * x1p - y1p * y1p;
  const den = x1p * x1p + y1p * y1p;
  const coef = Math.sqrt(Math.max(0, num / den)) * (fa !== fs ? 1 : -1);
  const cxp = coef * y1p;
  const cyp = -coef * x1p;
  return [cxp + (x1 + x2) / 2, cyp + (y1 + y2) / 2] as const;
}

describe('arc renders on the correct side of its chord', () => {
  // from 0 to 90 deg: start point is right of center, end point is above it,
  // so the true center sits at (end.x, start.y).
  const arc = arcPath(
    'scene plane {\n  x: [-3, 3]\n  y: [-3, 3]\n  arc a = (0, 0) { r: 2, from: 0, to: 90 }\n}'
  );

  it('places the center where the endpoints imply, not mirrored', () => {
    const [cx, cy] = centerOf(arc.start, arc.end, arc.r, arc.largeArc, arc.sweep);
    expect(cx).toBeCloseTo(arc.end[0], 1);
    expect(cy).toBeCloseTo(arc.start[1], 1);
  });
});
