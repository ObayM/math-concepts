import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';

// the numeric exercise: free-entry number answers, folded from expressions.

function firstExercise(src: string) {
  const lesson = lessonSchema.parse(compileLesson(src));
  return lesson.slides[0].exercise!;
}

describe('numeric exercise compile', () => {
  it('folds an expression answer and defaults tolerance to a tiny epsilon', () => {
    const ex = firstExercise(
      'lesson "L" {\n  slide "s" {\n    numeric {\n      ask "value?"\n      answer: 64/3\n    }\n  }\n}'
    );
    expect(ex.kind).toBe('numeric');
    if (ex.kind === 'numeric') {
      expect(ex.answers[0]).toBeCloseTo(64 / 3, 10);
      expect(ex.tolerance).toBeLessThan(1e-3);
      expect(ex.tolerance).toBeGreaterThanOrEqual(0);
    }
  });

  it('carries tolerance, unit, and multiple accepted answers', () => {
    const ex = firstExercise(
      'lesson "L" {\n  slide "s" {\n    numeric {\n      ask "x?"\n      answer: 2\n      answer: -2\n      tolerance: 0.1\n      unit: "cm"\n    }\n  }\n}'
    );
    if (ex.kind === 'numeric') {
      expect(ex.answers).toEqual([2, -2]);
      expect(ex.tolerance).toBe(0.1);
      expect(ex.unit).toBe('cm');
    }
  });

  it('keeps ask/hint/explanation like every other exercise', () => {
    const ex = firstExercise(
      'lesson "L" {\n  slide "s" {\n    numeric {\n      ask "q"\n      answer: 1\n      hint "a hint"\n      ! "because reasons"\n    }\n  }\n}'
    );
    if (ex.kind === 'numeric') {
      expect(ex.prompt).toBe('q');
      expect(ex.hints).toEqual(['a hint']);
      expect(ex.explanation).toBe('because reasons');
    }
  });
});
