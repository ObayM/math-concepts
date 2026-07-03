import { describe, it, expect } from 'vitest';
import { exercises } from '../src/components/lesson/exercises';

// the v2 checkable registry — operates on a whole slide, reading slide.exercise.

describe('exercises.quiz', () => {
  const slide = { exercise: { kind: 'quiz', correct: 1 } };

  it('starts null, completes once an option is picked', () => {
    expect(exercises.quiz.initial()).toBeNull();
    expect(exercises.quiz.isComplete(slide, null)).toBe(false);
    expect(exercises.quiz.isComplete(slide, 0)).toBe(true);
  });

  it('checks against exercise.correct', () => {
    expect(exercises.quiz.check(slide, 1)).toBe(true);
    expect(exercises.quiz.check(slide, 0)).toBe(false);
  });
});

describe('exercises.numeric', () => {
  const slide = { exercise: { kind: 'numeric', answers: [64 / 3], tolerance: 0.05 } };

  it('starts empty, completes once a parseable number is typed', () => {
    expect(exercises.numeric.initial()).toBe('');
    expect(exercises.numeric.isComplete(slide, '')).toBe(false);
    expect(exercises.numeric.isComplete(slide, 'abc')).toBe(false);
    expect(exercises.numeric.isComplete(slide, '21')).toBe(true);
  });

  it('accepts anything within tolerance of a listed answer', () => {
    expect(exercises.numeric.check(slide, '21.33')).toBe(true);
    expect(exercises.numeric.check(slide, '21.2')).toBe(false); // 0.13 off, outside 0.05
    expect(exercises.numeric.check(slide, 'nope')).toBe(false);
  });

  it('accepts any of several listed answers', () => {
    const multi = { exercise: { kind: 'numeric', answers: [2, -2], tolerance: 0 } };
    expect(exercises.numeric.check(multi, '2')).toBe(true);
    expect(exercises.numeric.check(multi, '-2')).toBe(true);
    expect(exercises.numeric.check(multi, '3')).toBe(false);
  });
});

describe('exercises.build', () => {
  const slide = {
    exercise: {
      kind: 'build',
      slots: 3,
      answers: [
        ['x', '+', '2'],
        ['2', '+', 'x'],
      ],
    },
  };

  it('completes only when all slots are filled', () => {
    expect(exercises.build.initial()).toEqual([]);
    expect(exercises.build.isComplete(slide, ['x'])).toBe(false);
    expect(exercises.build.isComplete(slide, ['x', '+', '2'])).toBe(true);
  });

  it('accepts any listed ordering, rejects wrong ones', () => {
    expect(exercises.build.check(slide, ['x', '+', '2'])).toBe(true);
    expect(exercises.build.check(slide, ['2', '+', 'x'])).toBe(true);
    expect(exercises.build.check(slide, ['x', '2', '+'])).toBe(false);
  });

  it('survives a null value', () => {
    expect(exercises.build.isComplete(slide, null)).toBeFalsy();
    expect(exercises.build.check(slide, null)).toBeFalsy();
  });
});
