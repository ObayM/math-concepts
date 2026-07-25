import { describe, it, expect } from 'vitest';
import {
  xpForAttempts,
  goalProgress,
  XP_CORRECT,
  XP_ATTEMPT,
  XP_LESSON_COMPLETE,
  DAILY_GOAL_XP,
} from '@/lib/xp';

describe('xpForAttempts', () => {
  it('is zero for no attempts', () => {
    expect(xpForAttempts([])).toBe(0);
  });

  it('pays full for a correct answer', () => {
    expect(xpForAttempts([{ correct: true }])).toBe(XP_CORRECT);
  });

  it('still pays something for a wrong answer, so trying counts', () => {
    expect(xpForAttempts([{ correct: false }])).toBe(XP_ATTEMPT);
    expect(XP_ATTEMPT).toBeGreaterThan(0);
    expect(XP_ATTEMPT).toBeLessThan(XP_CORRECT);
  });

  it('adds up a mixed run', () => {
    expect(xpForAttempts([{ correct: true }, { correct: false }, { correct: true }])).toBe(
      XP_CORRECT * 2 + XP_ATTEMPT
    );
  });

  it('a full lesson of correct answers plus the bonus clears the daily goal', () => {
    const lesson = Array.from({ length: 5 }, () => ({ correct: true }));
    expect(xpForAttempts(lesson) + XP_LESSON_COMPLETE).toBeGreaterThanOrEqual(DAILY_GOAL_XP);
  });
});

describe('goalProgress', () => {
  it('reports an untouched day', () => {
    const g = goalProgress(0);
    expect(g).toMatchObject({ xp: 0, pct: 0, met: false, remaining: DAILY_GOAL_XP });
  });

  it('reports partial progress', () => {
    const g = goalProgress(25, 50);
    expect(g.pct).toBe(50);
    expect(g.met).toBe(false);
    expect(g.remaining).toBe(25);
  });

  it('marks the goal met exactly on the line', () => {
    const g = goalProgress(50, 50);
    expect(g.met).toBe(true);
    expect(g.pct).toBe(100);
    expect(g.remaining).toBe(0);
  });

  it('caps the bar at 100% and never goes negative on remaining', () => {
    const g = goalProgress(500, 50);
    expect(g.pct).toBe(100);
    expect(g.remaining).toBe(0);
    expect(g.met).toBe(true);
  });

  it('falls back to the default goal if handed a nonsense one', () => {
    expect(goalProgress(10, 0).goal).toBe(DAILY_GOAL_XP);
    expect(goalProgress(10, -5).goal).toBe(DAILY_GOAL_XP);
  });
});
