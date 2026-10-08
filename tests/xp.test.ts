import { describe, it, expect } from 'vitest';
import {
  xpForAttempts,
  goalProgress,
  warmupXp,
  XP_CORRECT,
  XP_ATTEMPT,
  XP_LESSON_COMPLETE,
  DAILY_GOAL_XP,
  XP_WARMUP_CORRECT,
  WARMUP_DAILY_XP_CAP,
  XP_BANK_CORRECT,
  BANK_XP_CAP,
  lessonXpCap,
  completionXp,
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

describe('warmupXp', () => {
  it('pays nothing for nothing', () => {
    expect(warmupXp(0, 0)).toBe(0);
  });

  it('pays a fraction of what a real question pays', () => {
    expect(XP_WARMUP_CORRECT).toBeGreaterThan(0);
    expect(XP_WARMUP_CORRECT).toBeLessThan(XP_ATTEMPT);
    expect(warmupXp(1, 0)).toBe(XP_WARMUP_CORRECT);
  });

  it('pays per correct answer up to the daily cap', () => {
    expect(warmupXp(10, 0)).toBe(10);
    expect(warmupXp(WARMUP_DAILY_XP_CAP, 0)).toBe(WARMUP_DAILY_XP_CAP);
  });

  it('stops paying once the day is capped, however many more they answer', () => {
    expect(warmupXp(WARMUP_DAILY_XP_CAP + 1, 0)).toBe(WARMUP_DAILY_XP_CAP);
    expect(warmupXp(500, 0)).toBe(WARMUP_DAILY_XP_CAP);
    expect(warmupXp(1, WARMUP_DAILY_XP_CAP)).toBe(0);
    expect(warmupXp(50, WARMUP_DAILY_XP_CAP)).toBe(0);
  });

  it('pays only the remainder when a later session crosses the cap', () => {
    expect(warmupXp(20, 25)).toBe(WARMUP_DAILY_XP_CAP - 25);
  });

  it('never goes negative if more was somehow already awarded than the cap', () => {
    expect(warmupXp(10, 999)).toBe(0);
  });

  it('ignores a negative count rather than clawing xp back', () => {
    expect(warmupXp(-5, 0)).toBe(0);
  });

  it('cannot clear the daily goal on its own', () => {
    expect(warmupXp(10_000, 0)).toBeLessThan(DAILY_GOAL_XP);
    expect(goalProgress(warmupXp(10_000, 0)).met).toBe(false);
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

describe('banks', () => {
  it('pays a little for each right answer and nothing for a wrong one', () => {
    expect(xpForAttempts([{ correct: true }, { correct: false }], 'bank')).toBe(XP_BANK_CORRECT);
  });

  it('has a flat cap that does not grow with the number of questions', () => {
    expect(lessonXpCap(10, 'bank')).toBe(BANK_XP_CAP);
    expect(lessonXpCap(150, 'bank')).toBe(BANK_XP_CAP);
    expect(lessonXpCap(150)).toBeGreaterThan(BANK_XP_CAP);
  });

  it('gives no completion bonus', () => {
    expect(completionXp('bank')).toBe(0);
    expect(completionXp(null)).toBe(XP_LESSON_COMPLETE);
  });
});
