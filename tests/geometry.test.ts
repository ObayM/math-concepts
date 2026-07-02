import { describe, it, expect } from 'vitest';
import {
  distToPolyline,
  curveNearPoints,
  curveMatchesExpr,
  pointInRegion,
  slope,
  approx,
  type Pt,
  type Region,
} from '@/engine/checks/geometry';
import type { ExprIR } from '@/engine/expr';

describe('distToPolyline', () => {
  const line: Pt[] = [
    [0, 0],
    [4, 0],
  ];

  it('is 0 for a point on the segment', () => {
    expect(distToPolyline([2, 0], line)).toBeCloseTo(0);
  });

  it('measures perpendicular distance', () => {
    expect(distToPolyline([2, 3], line)).toBeCloseTo(3);
  });

  it('clamps to the nearest endpoint past the segment', () => {
    expect(distToPolyline([-3, 0], line)).toBeCloseTo(3);
    expect(distToPolyline([7, 0], line)).toBeCloseTo(3);
  });

  it('handles a degenerate (single-point) line', () => {
    expect(distToPolyline([3, 4], [[0, 0]])).toBeCloseTo(5);
  });

  it('is Infinity for an empty line', () => {
    expect(distToPolyline([0, 0], [])).toBe(Infinity);
  });
});

describe('curveNearPoints', () => {
  const line: Pt[] = [
    [-3, 0],
    [0, 0],
    [3, 0],
  ];
  it('passes when every target is within tol', () => {
    expect(
      curveNearPoints(
        line,
        [
          [-2, 0.3],
          [1, -0.2],
        ],
        0.5
      )
    ).toBe(true);
  });
  it('fails when any target is too far', () => {
    expect(curveNearPoints(line, [[0, 2]], 0.5)).toBe(false);
  });
});

describe('curveMatchesExpr', () => {
  // y = x^2 as an AST
  const parabola: ExprIR = { k: 'bin', op: '^', l: { k: 'id', name: 'x' }, r: { k: 'num', v: 2 } };

  // a decent hand-drawn parabola over [-2, 2]
  const good: Pt[] = [];
  for (let x = -2; x <= 2.001; x += 0.25) good.push([x, x * x + (x === 0 ? 0.1 : 0)]);

  it('accepts a drawing that tracks the curve across the domain', () => {
    expect(curveMatchesExpr(good, parabola, [-2, 2], 0.4)).toBe(true);
  });

  it('rejects a flat line that ignores the curve', () => {
    const flat: Pt[] = [
      [-2, 0],
      [2, 0],
    ];
    expect(curveMatchesExpr(flat, parabola, [-2, 2], 0.4)).toBe(false);
  });

  it('rejects a drawing that only covers part of the domain', () => {
    const half: Pt[] = [
      [-2, 4],
      [-1, 1],
      [0, 0],
    ];
    expect(curveMatchesExpr(half, parabola, [-2, 2], 0.4)).toBe(false);
  });

  it('rejects too few points', () => {
    expect(curveMatchesExpr([[0, 0]], parabola, [-2, 2], 0.4)).toBe(false);
  });
});

describe('pointInRegion', () => {
  it('rect: inside vs outside', () => {
    const r: Region = { kind: 'rect', x: 0, y: 0, w: 2, h: 2 };
    expect(pointInRegion([1, 1], r)).toBe(true);
    expect(pointInRegion([3, 1], r)).toBe(false);
  });

  it('circle: inside, on the boundary, outside', () => {
    const c: Region = { kind: 'circle', x: 0, y: 0, r: 1 };
    expect(pointInRegion([0.5, 0.5], c)).toBe(true);
    expect(pointInRegion([1, 0], c)).toBe(true);
    expect(pointInRegion([1, 1], c)).toBe(false);
  });

  it('polygon: ray-cast for a triangle', () => {
    const tri: Region = {
      kind: 'polygon',
      points: [
        [0, 0],
        [4, 0],
        [2, 4],
      ],
    };
    expect(pointInRegion([2, 1], tri)).toBe(true);
    expect(pointInRegion([0, 4], tri)).toBe(false);
  });
});

describe('slope + approx', () => {
  it('computes slope', () => {
    expect(slope([0, 0], [2, 4])).toBe(2);
  });
  it('approx within tolerance', () => {
    expect(approx(1.98, 2, 0.05)).toBe(true);
    expect(approx(1.8, 2, 0.05)).toBe(false);
  });
});
