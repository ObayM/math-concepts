import { describe, it, expect } from 'vitest';
import { compileLesson, CompileError } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import { exercises } from '../src/components/lesson/exercises';

function firstExercise(src: string) {
  const lesson = lessonSchema.parse(compileLesson(src));
  return lesson.slides[0].exercise!;
}

describe('table exercise compile', () => {
  it('folds plain cells and blank(...) cells, keeps header', () => {
    const ex = firstExercise(
      'lesson "L" {\n  slide "s" {\n    table {\n      ask "fill it"\n      header: ["x", "f(x)"]\n      row: -1, blank(0)\n      row: 0, blank(-1)\n      row: 1, blank(0)\n    }\n  }\n}'
    );
    expect(ex.kind).toBe('table');
    if (ex.kind === 'table') {
      expect(ex.header).toEqual(['x', 'f(x)']);
      expect(ex.rows).toEqual([
        [{ value: -1 }, { blank: true, answer: 0 }],
        [{ value: 0 }, { blank: true, answer: -1 }],
        [{ value: 1 }, { blank: true, answer: 0 }],
      ]);
      expect(ex.tolerance).toBeCloseTo(1e-6);
    }
  });

  it('folds expressions inside blank(...)', () => {
    const ex = firstExercise(
      'lesson "L" {\n  slide "s" {\n    table {\n      ask "fill it"\n      row: 1, blank(1/3)\n    }\n  }\n}'
    );
    if (ex.kind === 'table') {
      expect(ex.rows[0][1]).toEqual({ blank: true, answer: 1 / 3 });
    }
  });

  it('accepts an explicit tolerance', () => {
    const ex = firstExercise(
      'lesson "L" {\n  slide "s" {\n    table {\n      ask "fill it"\n      row: 1, blank(1)\n      tolerance: 0.1\n    }\n  }\n}'
    );
    if (ex.kind === 'table') expect(ex.tolerance).toBe(0.1);
  });

  it('rejects a table with no blank cell', () => {
    expect(() =>
      compileLesson(
        'lesson "L" {\n  slide "s" {\n    table {\n      ask "fill it"\n      row: 1, 2\n    }\n  }\n}'
      )
    ).toThrow(/at least one blank/);
  });

  it('rejects a header whose length does not match the rows', () => {
    expect(() =>
      compileLesson(
        'lesson "L" {\n  slide "s" {\n    table {\n      ask "fill it"\n      header: ["x"]\n      row: 1, blank(1)\n    }\n  }\n}'
      )
    ).toThrow(/header length/);
  });

  it('rejects rows of mismatched width', () => {
    expect(() =>
      compileLesson(
        'lesson "L" {\n  slide "s" {\n    table {\n      ask "fill it"\n      row: 1, blank(1)\n      row: 2\n    }\n  }\n}'
      )
    ).toThrow(/same number of cells/);
  });

  it('rejects a table with no rows', () => {
    expect(() =>
      compileLesson('lesson "L" {\n  slide "s" {\n    table {\n      ask "fill it"\n    }\n  }\n}')
    ).toThrow(CompileError);
  });
});

describe('exercises.table', () => {
  const slide = {
    exercise: {
      kind: 'table',
      header: ['x', 'f(x)'],
      rows: [
        [{ value: -1 }, { blank: true, answer: 0 }],
        [{ value: 0 }, { blank: true, answer: -1 }],
      ],
      tolerance: 1e-6,
    },
  };

  it('starts as an empty string per blank', () => {
    expect(exercises.table.initial(slide)).toEqual(['', '']);
  });

  it('is incomplete until every blank has a numeric value', () => {
    expect(exercises.table.isComplete(slide, ['', ''])).toBe(false);
    expect(exercises.table.isComplete(slide, ['0', ''])).toBe(false);
    expect(exercises.table.isComplete(slide, ['0', '-1'])).toBe(true);
    expect(exercises.table.isComplete(slide, ['abc', '-1'])).toBe(false);
  });

  it('checks every blank against its answer within tolerance', () => {
    expect(exercises.table.check(slide, ['0', '-1'])).toBe(true);
    expect(exercises.table.check(slide, ['0', '-2'])).toBe(false);
    expect(exercises.table.check(slide, ['', ''])).toBe(false);
  });
});
