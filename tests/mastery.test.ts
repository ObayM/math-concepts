import { describe, it, expect } from 'vitest';
import {
  MASTERY_ALPHA,
  firstMasteryScore,
  nextMasteryScore,
  replayMastery,
} from '@/lib/db/progressService';

const seq = (...correct: boolean[]) => correct.map((c) => ({ correct: c }));

describe('the ewma', () => {
  it('seeds on the first attempt rather than decaying from zero', () => {
    expect(firstMasteryScore(true)).toBe(1);
    expect(firstMasteryScore(false)).toBe(0);
  });

  it('moves alpha of the way toward the new answer', () => {
    expect(nextMasteryScore(0, true)).toBeCloseTo(MASTERY_ALPHA, 12);
    expect(nextMasteryScore(1, false)).toBeCloseTo(1 - MASTERY_ALPHA, 12);
    expect(nextMasteryScore(0.5, true)).toBeCloseTo(0.5 * 0.7 + 0.3, 12);
  });

  it('stays inside [0, 1]', () => {
    let score = 0;
    for (let i = 0; i < 200; i++) {
      score = nextMasteryScore(score, i % 3 === 0);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it('is a fixed point at both ends', () => {
    expect(nextMasteryScore(1, true)).toBeCloseTo(1, 12);
    expect(nextMasteryScore(0, false)).toBeCloseTo(0, 12);
  });
});

describe('replayMastery', () => {
  it('is empty for no attempts', () => {
    expect(replayMastery([])).toEqual({ score: 0, attempts: 0, correct: 0 });
  });

  it('matches the write path exactly, which is what makes a rebuild safe', () => {
    const cases: boolean[][] = [
      [true],
      [false],
      [true, false],
      [false, true],
      [true, true, true],
      [false, false, true, true, false, true],
    ];

    for (const answers of cases) {
      const live = answers.reduce(
        (acc, correct, i) => ({
          score: i === 0 ? firstMasteryScore(correct) : nextMasteryScore(acc.score, correct),
          attempts: acc.attempts + 1,
          correct: acc.correct + (correct ? 1 : 0),
        }),
        { score: 0, attempts: 0, correct: 0 }
      );
      expect(replayMastery(seq(...answers)), answers.join(',')).toEqual(live);
    }
  });

  it('counts attempts and correct answers straight', () => {
    const r = replayMastery(seq(true, false, true, true, false));
    expect(r.attempts).toBe(5);
    expect(r.correct).toBe(3);
  });

  it('forgets old answers as newer ones arrive', () => {
    const rusty = replayMastery(seq(true, true, true, false, false, false));
    const sharpening = replayMastery(seq(false, false, false, true, true, true));
    expect(rusty.score).toBeLessThan(0.5);
    expect(sharpening.score).toBeGreaterThan(0.5);
    expect(rusty.correct).toBe(sharpening.correct);
  });

  it('drops a wrong run from the tail when those attempts are deleted', () => {
    const all = seq(true, true, false, false);
    const kept = all.slice(0, 2);
    expect(replayMastery(all).score).toBeLessThan(replayMastery(kept).score);
    expect(replayMastery(kept)).toEqual({ score: 1, attempts: 2, correct: 2 });
  });
});
