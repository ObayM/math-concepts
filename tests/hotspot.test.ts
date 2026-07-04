import { describe, it, expect } from 'vitest';
import { compileLesson, CompileError } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import { exercises } from '../src/components/lesson/exercises';

function firstExercise(src: string) {
  const lesson = lessonSchema.parse(compileLesson(src));
  return lesson.slides[0].exercise!;
}

describe('hotspot exercise compile', () => {
  it('folds a circle target to plain numbers', () => {
    const ex = firstExercise(
      'lesson "L" {\n  slide "s" {\n    hotspot {\n      ask "tap it"\n      target circle (2, 4) { r: 0.6 }\n    }\n  }\n}'
    );
    expect(ex.kind).toBe('hotspot');
    if (ex.kind === 'hotspot') {
      expect(ex.target).toEqual({ kind: 'circle', x: 2, y: 4, r: 0.6 });
    }
  });

  it('folds a rect target and expressions in its position/size', () => {
    const ex = firstExercise(
      'lesson "L" {\n  slide "s" {\n    hotspot {\n      ask "tap it"\n      target rect (1+1, 0) { w: 4/2, h: 1 }\n    }\n  }\n}'
    );
    if (ex.kind === 'hotspot') {
      expect(ex.target).toEqual({ kind: 'rect', x: 2, y: 0, w: 2, h: 1 });
    }
  });

  it('carries miss feedback alongside the usual hint/explanation', () => {
    const ex = firstExercise(
      'lesson "L" {\n  slide "s" {\n    hotspot {\n      ask "tap it"\n      target rect (0, 0) { w: 1, h: 1 }\n      miss "nope"\n      hint "a hint"\n      ! "because reasons"\n    }\n  }\n}'
    );
    if (ex.kind === 'hotspot') {
      expect(ex.miss).toBe('nope');
      expect(ex.hints).toEqual(['a hint']);
      expect(ex.explanation).toBe('because reasons');
    }
  });

  it('rejects a hotspot with no target', () => {
    expect(() =>
      compileLesson('lesson "L" {\n  slide "s" {\n    hotspot {\n      ask "tap it"\n    }\n  }\n}')
    ).toThrow(CompileError);
  });

  it('rejects a rect target missing w/h', () => {
    expect(() =>
      compileLesson(
        'lesson "L" {\n  slide "s" {\n    hotspot {\n      ask "tap it"\n      target rect (0, 0) { w: 1 }\n    }\n  }\n}'
      )
    ).toThrow(/w: and h:/);
  });
});

describe('exercises.hotspot', () => {
  const slide = { exercise: { kind: 'hotspot', target: { kind: 'circle', x: 2, y: 4, r: 0.6 } } };

  it('starts null, completes once a point is tapped', () => {
    expect(exercises.hotspot.initial()).toBeNull();
    expect(exercises.hotspot.isComplete(slide, null)).toBe(false);
    expect(exercises.hotspot.isComplete(slide, [2, 4])).toBe(true);
  });

  it('checks the tap against the target region', () => {
    expect(exercises.hotspot.check(slide, [2, 4])).toBe(true);
    expect(exercises.hotspot.check(slide, [2.3, 4.2])).toBe(true);
    expect(exercises.hotspot.check(slide, [5, 5])).toBe(false);
    expect(exercises.hotspot.check(slide, null)).toBeFalsy();
  });

  it('works with a rect target too', () => {
    const rectSlide = {
      exercise: { kind: 'hotspot', target: { kind: 'rect', x: 1, y: 1, w: 2, h: 2 } },
    };
    expect(exercises.hotspot.check(rectSlide, [2, 2])).toBe(true);
    expect(exercises.hotspot.check(rectSlide, [0, 0])).toBe(false);
  });
});
