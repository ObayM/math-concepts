import { describe, it, expect } from 'vitest';
import { checkable } from '../src/components/lesson/checkable';

// pins the checkable contract before it grows to {correct, score, feedback} in P1.

describe('checkable.quiz', () => {
  const slide = { correctOption: 1 };

  it('starts null and is incomplete until an option is picked', () => {
    expect(checkable.quiz.initial()).toBeNull();
    expect(checkable.quiz.isComplete(slide, null)).toBe(false);
    expect(checkable.quiz.isComplete(slide, 0)).toBe(true);
  });

  it('checks against correctOption', () => {
    expect(checkable.quiz.check(slide, 1)).toBe(true);
    expect(checkable.quiz.check(slide, 0)).toBe(false);
  });
});

describe('checkable.build', () => {
  const slide = {
    slots: 3,
    answer: [
      ['x', '+', '2'],
      ['2', '+', 'x'],
    ],
  };

  it('starts empty and completes when all slots are filled', () => {
    expect(checkable.build.initial()).toEqual([]);
    expect(checkable.build.isComplete(slide, ['x'])).toBe(false);
    expect(checkable.build.isComplete(slide, ['x', '+', '2'])).toBe(true);
  });

  it('accepts any listed answer variant', () => {
    expect(checkable.build.check(slide, ['x', '+', '2'])).toBe(true);
    expect(checkable.build.check(slide, ['2', '+', 'x'])).toBe(true);
    expect(checkable.build.check(slide, ['x', '2', '+'])).toBe(false);
  });

  it('survives a null value (the old crash)', () => {
    expect(checkable.build.isComplete(slide, null)).toBeFalsy();
    expect(checkable.build.check(slide, null)).toBeFalsy();
  });
});
