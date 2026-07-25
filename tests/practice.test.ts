import { describe, it, expect } from 'vitest';
import { slideSkill, slideWeight, weightedPick, weakestSkills } from '@/lib/practice';

const slide = (id: string, skill?: string) => ({
  id,
  exercise: skill ? { skill } : {},
});

function seeded(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('slideSkill', () => {
  it('prefers the exercise skill', () => {
    expect(slideSkill({ id: 'a', skill: 'slide-level', exercise: { skill: 'ex-level' } })).toBe(
      'ex-level'
    );
  });

  it('falls back to the slide skill', () => {
    expect(slideSkill({ id: 'a', skill: 'slide-level', exercise: {} })).toBe('slide-level');
  });

  it('is null when neither is tagged', () => {
    expect(slideSkill({ id: 'a' })).toBeNull();
  });
});

describe('slideWeight', () => {
  it('weights a weak skill far above a strong one', () => {
    const mastery = { weak: 0.1, strong: 0.95 };
    expect(slideWeight(slide('a', 'weak'), mastery)).toBeGreaterThan(
      slideWeight(slide('b', 'strong'), mastery)
    );
  });

  it('never drops to zero, so a mastered skill still shows up sometimes', () => {
    expect(slideWeight(slide('a', 'perfect'), { perfect: 1 })).toBeGreaterThan(0);
  });

  it('gives unseen skills a middling weight', () => {
    const w = slideWeight(slide('a', 'never-tried'), { other: 0.5 });
    expect(w).toBeGreaterThan(slideWeight(slide('b', 'other'), { other: 0.9 }));
    expect(w).toBeLessThan(slideWeight(slide('c', 'other'), { other: 0.1 }));
  });

  it('treats an untagged slide as unseen rather than crashing', () => {
    expect(slideWeight(slide('a'), {})).toBeGreaterThan(0);
  });
});

describe('weightedPick', () => {
  it('returns null on an empty pool', () => {
    expect(weightedPick([], {})).toBeNull();
  });

  it('returns the only slide even when it is excluded', () => {
    const only = slide('a', 's');
    expect(weightedPick([only], {}, Math.random, only)).toBe(only);
  });

  it('never repeats the excluded slide when others exist', () => {
    const pool = [slide('a', 's'), slide('b', 's')];
    for (let i = 0; i < 20; i++) {
      expect(weightedPick(pool, {}, Math.random, pool[0])).toBe(pool[1]);
    }
  });

  it('picks the weak skill far more often than the strong one', () => {
    const pool = [slide('strong', 'strong'), slide('weak', 'weak')];
    const mastery = { strong: 1, weak: 0 };
    let weak = 0;
    for (let i = 0; i < 1000; i++) {
      if (weightedPick(pool, mastery)?.id === 'weak') weak++;
    }
    expect(weak).toBeGreaterThan(900);
  });

  it('is deterministic with a seeded rng', () => {
    const pool = [slide('a', 'x'), slide('b', 'y'), slide('c', 'z')];
    const mastery = { x: 0.5, y: 0.5, z: 0.5 };
    expect(weightedPick(pool, mastery, seeded([0.0]))?.id).toBe('a');
    expect(weightedPick(pool, mastery, seeded([0.5]))?.id).toBe('b');
    expect(weightedPick(pool, mastery, seeded([0.99]))?.id).toBe('c');
  });

  it('still returns something when every weight would be equal', () => {
    const pool = [slide('a'), slide('b')];
    expect(weightedPick(pool, {}, seeded([0.7]))).toBeTruthy();
  });

  it('covers the whole pool given enough draws', () => {
    const pool = [slide('a', 'x'), slide('b', 'y'), slide('c', 'z')];
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(weightedPick(pool, { x: 0.9, y: 0.9, z: 0.9 })!.id);
    expect(seen.size).toBe(3);
  });
});

describe('weakestSkills', () => {
  it('ranks lowest mastery first', () => {
    expect(weakestSkills({ a: 0.9, b: 0.1, c: 0.5 })).toEqual(['b', 'c', 'a']);
  });

  it('respects the limit', () => {
    expect(weakestSkills({ a: 0.9, b: 0.1, c: 0.5 }, 2)).toEqual(['b', 'c']);
  });

  it('handles an empty map', () => {
    expect(weakestSkills({})).toEqual([]);
  });
});
