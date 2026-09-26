import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import { sketchGap, type Pt } from '@/engine/checks/geometry';

const lesson = (body: string) =>
  `lesson "L" {\n  slide "s" {\n    scene plane {\n      x: [-4, 4]\n      y: [-4, 4]\n    }\n    ${body}\n  }\n}`;

const exerciseOf = (body: string) =>
  lessonSchema.parse(compileLesson(lesson(body))).slides[0].exercise!;

describe('sketch curve overlay compile', () => {
  it('carries the flag into the IR next to follows:', () => {
    const ex = exerciseOf(
      'sketch curve {\n      ask "draw it"\n      follows: x^2\n      over: [-2, 2]\n      overlay\n    }'
    );
    expect(ex.kind === 'sketch' && ex.overlay).toBe(true);
    expect(ex.kind === 'sketch' && ex.over).toEqual([-2, 2]);
  });

  it('leaves it out when not asked for', () => {
    const ex = exerciseOf(
      'sketch curve {\n      ask "draw it"\n      follows: x^2\n      over: [-2, 2]\n    }'
    );
    expect(ex.kind === 'sketch' && 'overlay' in ex).toBe(false);
  });

  it.each([
    [
      'sketch curve {\n      ask "q"\n      near (0, 0)\n      near (1, 1)\n      overlay\n    }',
      /overlay needs a follows:/,
    ],
    [
      'sketch points {\n      ask "q"\n      near (0, 0)\n      overlay\n    }',
      /overlay only works on sketch curve/,
    ],
    [
      'sketch line {\n      ask "q"\n      through (0, 0)\n      slope: 1\n      overlay\n    }',
      /overlay only works on sketch curve/,
    ],
  ])('refuses %j', (body, msg) => {
    expect(() => compileLesson(lesson(body))).toThrow(msg);
  });
});

describe('sketchGap', () => {
  const line = (f: (x: number) => number, from: number, to: number): Pt[] => {
    const pts: Pt[] = [];
    for (let x = from; x <= to + 1e-9; x += 0.25) pts.push([x, f(x)]);
    return pts;
  };

  it('traces the true curve across the whole range', () => {
    const { truth } = sketchGap(null, 0, [0, 2], 0.5, 4);
    expect(truth).toEqual([
      [
        [0, 0],
        [0.5, 0],
        [1, 0],
        [1.5, 0],
        [2, 0],
      ],
    ]);
  });

  it('is one shaded band inside tolerance for an honest sketch', () => {
    const gap = sketchGap(
      line(() => 0.2, 0, 2),
      0,
      [0, 2],
      0.5,
      8
    );
    expect(gap.within).toBe(1);
    expect(gap.bands).toHaveLength(1);
    expect(gap.bands[0].off).toBe(false);
    expect(gap.bands[0].pts).toHaveLength(18);
    expect(gap.bands[0].pts[0]).toEqual([0, 0.2]);
    expect(gap.bands[0].pts[17]).toEqual([0, 0]);
  });

  it('splits the gap where the sketch drifts off, and the bands share their edge', () => {
    const gap = sketchGap(
      line((x) => (x < 1 ? 0 : 2), 0, 2),
      0,
      [0, 2],
      0.5,
      8
    );
    expect(gap.bands.map((b) => b.off)).toEqual([false, true]);
    const [near, far] = gap.bands;
    const nearDrawnEnd = near.pts[near.pts.length / 2 - 1];
    expect(far.pts[0]).toEqual(nearDrawnEnd);
    expect(gap.within).toBeCloseTo(4 / 9, 5);
  });

  it('counts the part of the range the sketch never reached as missed', () => {
    const gap = sketchGap(
      line(() => 0, 0, 1),
      0,
      [0, 2],
      0.5,
      8
    );
    expect(gap.within).toBeCloseTo(5 / 9, 5);
    expect(gap.bands).toHaveLength(1);
  });

  it('breaks the true curve where it is undefined', () => {
    const ir = lessonSchema.parse(
      compileLesson(
        lesson('sketch curve {\n      ask "q"\n      follows: 1 / x\n      over: [-2, 2]\n    }')
      )
    ).slides[0].exercise!;
    if (ir.kind !== 'sketch' || !ir.follows) throw new Error('no follows');
    const { truth } = sketchGap(null, ir.follows, [-2, 2], 0.5, 4);
    expect(truth).toHaveLength(2);
  });
});
