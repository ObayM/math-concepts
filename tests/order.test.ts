import { describe, it, expect } from 'vitest';
import { compileLesson, CompileError } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import { exercises } from '../src/components/lesson/exercises';

function firstExercise(src: string) {
  const lesson = lessonSchema.parse(compileLesson(src));
  return lesson.slides[0].exercise!;
}

describe('order exercise compile', () => {
  it('collects items in declared order, plus decoys', () => {
    const ex = firstExercise(
      'lesson "L" {\n  slide "s" {\n    order {\n      ask "order them"\n      item "first"\n      item "second"\n      item "third"\n      decoy "extra"\n    }\n  }\n}'
    );
    expect(ex.kind).toBe('order');
    if (ex.kind === 'order') {
      expect(ex.items).toEqual(['first', 'second', 'third']);
      expect(ex.decoys).toEqual(['extra']);
    }
  });

  it('omits decoys when none are given', () => {
    const ex = firstExercise(
      'lesson "L" {\n  slide "s" {\n    order {\n      ask "order them"\n      item "a"\n      item "b"\n    }\n  }\n}'
    );
    if (ex.kind === 'order') expect(ex.decoys).toBeUndefined();
  });

  it('rejects an order with fewer than 2 items', () => {
    expect(() =>
      compileLesson(
        'lesson "L" {\n  slide "s" {\n    order {\n      ask "order them"\n      item "a"\n    }\n  }\n}'
      )
    ).toThrow(/at least 2 item/);
  });

  it('rejects an order with no ask', () => {
    expect(() =>
      compileLesson(
        'lesson "L" {\n  slide "s" {\n    order {\n      item "a"\n      item "b"\n    }\n  }\n}'
      )
    ).toThrow(CompileError);
  });
});

describe('exercises.order', () => {
  const slide = {
    exercise: { kind: 'order', items: ['a', 'b', 'c'], decoys: ['z'] },
  };

  it('starts empty', () => {
    expect(exercises.order.initial()).toEqual([]);
  });

  it('is incomplete until every slot is filled', () => {
    expect(exercises.order.isComplete(slide, [])).toBe(false);
    expect(exercises.order.isComplete(slide, [0, 1])).toBe(false);
    expect(exercises.order.isComplete(slide, [0, 1, 2])).toBe(true);
  });

  it('checks the placed indices resolve to the correct sequence', () => {
    // bank = ['a', 'b', 'c', 'z'] - indices 0,1,2 are the correct order
    expect(exercises.order.check(slide, [0, 1, 2])).toBe(true);
    expect(exercises.order.check(slide, [1, 0, 2])).toBe(false);
    expect(exercises.order.check(slide, [3, 0, 1])).toBe(false);
    expect(exercises.order.check(slide, null)).toBeFalsy();
  });
});
