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
