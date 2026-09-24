import { describe, it, expect } from 'vitest';
import { compileLesson, CompileError } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import { exercises } from '../src/components/lesson/exercises';

function firstExercise(src: string) {
  const lesson = lessonSchema.parse(compileLesson(src));
  return lesson.slides[0].exercise!;
}

describe('sketch curve/points compile', () => {
  it('folds `near` targets and defaults tolerance for curve mode', () => {
    const ex = firstExercise(
      'lesson "L" {\n  slide "s" {\n    sketch curve {\n      ask "draw it"\n      near (1, -3)\n      near (1-sqrt(3), 0)\n    }\n  }\n}'
    );
    expect(ex.kind).toBe('sketch');
    if (ex.kind === 'sketch') {
      expect(ex.mode).toBe('curve');
      expect(ex.targets?.[0][0]).toBeCloseTo(1, 10);
      expect(ex.targets?.[1][0]).toBeCloseTo(1 - Math.sqrt(3), 10);
      expect(ex.tol).toBe(0.5);
    }
  });

  it('defaults tolerance tighter for points mode and carries an explicit tol', () => {
    const ex = firstExercise(
      'lesson "L" {\n  slide "s" {\n    sketch points {\n      ask "tap them"\n      near (1, 0)\n      near (-1, 0)\n      tol: 0.3\n    }\n  }\n}'
    );
    if (ex.kind === 'sketch') {
      expect(ex.mode).toBe('points');
      expect(ex.targets).toHaveLength(2);
      expect(ex.tol).toBe(0.3);
    }
  });

  it('rejects sketch curve/points with no near targets', () => {
    expect(() =>
      compileLesson(
        'lesson "L" {\n  slide "s" {\n    sketch curve {\n      ask "draw it"\n    }\n  }\n}'
      )
    ).toThrow(/at least one near/);
  });

  it('carries hint/explanation like every other exercise', () => {
    const ex = firstExercise(
      'lesson "L" {\n  slide "s" {\n    sketch curve {\n      ask "q"\n      near (0, 0)\n      hint "a hint"\n      ! "because reasons"\n    }\n  }\n}'
    );
    expect(ex.hints).toEqual(['a hint']);
    expect(ex.explanation).toBe('because reasons');
  });
});

describe('sketch line compile', () => {
  it('folds through/slope and defaults both tolerances', () => {
    const ex = firstExercise(
      'lesson "L" {\n  slide "s" {\n    sketch line {\n      ask "draw the tangent"\n      through (2, 4)\n      slope: 4\n    }\n  }\n}'
    );
    if (ex.kind === 'sketch') {
      expect(ex.mode).toBe('line');
      expect(ex.through).toEqual([2, 4]);
      expect(ex.slope).toBe(4);
      expect(ex.tol).toBe(0.4);
      expect(ex.slopeTol).toBe(0.5);
    }
  });

  it('rejects sketch line missing through', () => {
    expect(() =>
      compileLesson(
        'lesson "L" {\n  slide "s" {\n    sketch line {\n      ask "q"\n      slope: 1\n    }\n  }\n}'
      )
    ).toThrow(/through \(x, y\)/);
  });

  it('rejects sketch line missing slope', () => {
    expect(() =>
      compileLesson(
        'lesson "L" {\n  slide "s" {\n    sketch line {\n      ask "q"\n      through (0, 0)\n    }\n  }\n}'
      )
    ).toThrow(/slope:/);
  });

  it('rejects an unknown sketch mode', () => {
    expect(() =>
      compileLesson('lesson "L" {\n  slide "s" {\n    sketch blob {\n      ask "q"\n    }\n  }\n}')
    ).toThrow(CompileError);
  });
});

describe('exercises.sketch', () => {
  it('curve: checks the drawn stroke passes near every target', () => {
    const slide = {
      exercise: {
        kind: 'sketch',
        mode: 'curve',
        targets: [
          [0, 0],
          [2, 4],
        ],
        tol: 0.3,
      },
    };
    expect(exercises.sketch.initial()).toBeNull();
    expect(exercises.sketch.isComplete(slide, null)).toBe(false);
    expect(exercises.sketch.isComplete(slide, [[0, 0]])).toBe(false);
    expect(
      exercises.sketch.check(slide, [
        [0, 0],
        [1, 2],
        [2, 4],
      ])
    ).toBe(true);
    expect(
      exercises.sketch.check(slide, [
        [0, 0],
        [1, 0],
        [2, 0],
      ])
    ).toBe(false);
  });

  it('points: every target needs some tapped point nearby (order-independent)', () => {
    const slide = {
      exercise: {
        kind: 'sketch',
        mode: 'points',
        targets: [
          [1, 0],
          [-1, 0],
        ],
        tol: 0.3,
      },
    };
    expect(exercises.sketch.isComplete(slide, [[1, 0]])).toBe(false);
    expect(
      exercises.sketch.isComplete(slide, [
        [1, 0],
        [-1, 0],
      ])
    ).toBe(true);
    expect(
      exercises.sketch.check(slide, [
        [-1, 0],
        [1, 0],
      ])
    ).toBe(true);
    expect(
      exercises.sketch.check(slide, [
        [1, 0],
        [5, 5],
      ])
    ).toBe(false);
  });

  it('line: checks slope and that it passes near the through point', () => {
    const slide = {
      exercise: {
        kind: 'sketch',
        mode: 'line',
        through: [2, 4],
        slope: 4,
        tol: 0.3,
        slopeTol: 0.5,
      },
    };
    expect(
      exercises.sketch.check(slide, [
        [1, 0],
        [2, 4],
      ])
    ).toBe(true);
    expect(
      exercises.sketch.check(slide, [
        [0, 0],
        [1, 1],
      ])
    ).toBe(false);
    expect(
      exercises.sketch.check(slide, [
        [0, 10],
        [1, 14],
      ])
    ).toBe(false);
  });

  it('survives a null/short value', () => {
    const slide = { exercise: { kind: 'sketch', mode: 'curve', targets: [[0, 0]], tol: 0.3 } };
    expect(exercises.sketch.check(slide, null)).toBeFalsy();
    expect(exercises.sketch.check(slide, [[0, 0]])).toBeFalsy();
  });
});

describe('sketch curve checks the shape, not just a few points', () => {
  const nearOnly = lessonSchema.parse(
    compileLesson(
      'lesson "L" {\n  slide "s" {\n    sketch curve {\n      ask "draw sin"\n      near (0, 0)\n      near (1.57, 1)\n      near (3.14, 0)\n      tol: 0.3\n    }\n  }\n}'
    )
  ).slides[0];

  const zigzag: [number, number][] = [];
  for (let x = -0.5; x <= 3.6; x += 0.05) zigzag.push([x, zigzag.length % 2 ? 3 : -3]);

  const sine: [number, number][] = [];
  for (let x = 0; x <= 3.2; x += 0.1) sine.push([x, Math.sin(x)]);

  it('refuses a zigzag that happens to cross every target', () => {
    expect(exercises.sketch.check(nearOnly, zigzag)).toBe(false);
  });

  it('still accepts an honest drawing', () => {
    expect(exercises.sketch.check(nearOnly, sine)).toBe(true);
  });

  const follows = lessonSchema.parse(
    compileLesson(
      'lesson "L" {\n  slide "s" {\n    sketch curve {\n      ask "draw sin"\n      follows: sin(x)\n      over: [0, 3.1]\n      tol: 0.3\n    }\n  }\n}'
    )
  ).slides[0];

  it('compiles follows: into the IR', () => {
    const ex = follows.exercise!;
    expect(ex.kind === 'sketch' && ex.over).toEqual([0, 3.1]);
  });

  it('grades against the function across the whole range', () => {
    expect(exercises.sketch.check(follows, sine)).toBe(true);
    const flat: [number, number][] = sine.map(([x]) => [x, 0]);
    expect(exercises.sketch.check(follows, flat)).toBe(false);
    expect(exercises.sketch.check(follows, zigzag)).toBe(false);
  });

  it('takes the range from the near points when over: is left out', () => {
    const ex = firstExercise(
      'lesson "L" {\n  slide "s" {\n    sketch curve {\n      ask "q"\n      near (0, 0)\n      near (2, 4)\n      follows: x^2\n    }\n  }\n}'
    );
    expect(ex.kind === 'sketch' && ex.over).toEqual([0, 2]);
  });

  it.each([
    ['follows: y + 1\n      over: [0, 1]', /follows: .*y/],
    ['follows: x\n', /needs an over/],
    ['follows: x\n      over: [2, 1]', /end must be bigger/],
    ['follows: sqrt(x)\n      over: [-5, -1]', /undefined over most/],
  ])('refuses %j', (body, msg) => {
    expect(() =>
      compileLesson(
        `lesson "L" {\n  slide "s" {\n    sketch curve {\n      ask "q"\n      ${body}\n    }\n  }\n}`
      )
    ).toThrow(msg);
  });
});
