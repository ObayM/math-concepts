import { describe, it, expect } from 'vitest';
import {
  factLabel,
  accuracyPct,
  paceMs,
  median,
  struggleScore,
  rankWeakSpots,
  formatPace,
  formatDuration,
} from '@/lib/warmup/stats';

describe('accuracyPct', () => {
  it('is zero for an untouched session rather than NaN', () => {
    expect(accuracyPct(0, 0)).toBe(0);
  });

  it('rounds to whole percents', () => {
    expect(accuracyPct(47, 50)).toBe(94);
    expect(accuracyPct(1, 3)).toBe(33);
  });

  it('reports a perfect run as 100', () => {
    expect(accuracyPct(20, 20)).toBe(100);
  });
});

describe('paceMs', () => {
  it('is zero for an untouched session rather than NaN', () => {
    expect(paceMs(0, 0)).toBe(0);
    expect(paceMs(5000, 0)).toBe(0);
  });

  it('averages time across answers', () => {
    expect(paceMs(32000, 20)).toBe(1600);
  });
});

describe('median', () => {
  it('is zero for nothing', () => {
    expect(median([])).toBe(0);
  });

  it('picks the middle of an odd list', () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it('averages the middle pair of an even list', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('does not mutate its input', () => {
    const values = [5, 1, 3];
    median(values);
    expect(values).toEqual([5, 1, 3]);
  });
});

describe('struggleScore', () => {
  const row = (misses: number, avgMs: number) => ({
    factKey: 'mul:7x8',
    attempts: 10,
    misses,
    avgMs,
  });

  it('is zero for a fact answered right and at pace', () => {
    expect(struggleScore(row(0, 1500), 1500)).toBe(0);
  });

  it('rises with misses', () => {
    expect(struggleScore(row(5, 1500), 1500)).toBeGreaterThan(struggleScore(row(1, 1500), 1500));
  });

  it('rises with slowness even when nothing is missed', () => {
    expect(struggleScore(row(0, 3000), 1500)).toBeGreaterThan(0);
  });

  it('weighs a miss more heavily than being merely slow', () => {
    const missed = struggleScore(row(5, 1500), 1500);
    const slow = struggleScore(row(0, 2250), 1500);
    expect(missed).toBeGreaterThan(slow);
  });

  it('caps the slowness term so one stall cannot dominate', () => {
    expect(struggleScore(row(0, 1_000_000), 1500)).toBe(2);
  });

  it('does not divide by zero on an empty reference', () => {
    expect(struggleScore(row(0, 1500), 0)).toBe(0);
    expect(struggleScore({ factKey: 'x', attempts: 0, misses: 0, avgMs: 0 }, 0)).toBe(0);
  });
});

describe('rankWeakSpots', () => {
  const rows = [
    { factKey: 'mul:7x8', attempts: 12, misses: 5, avgMs: 4100 },
    { factKey: 'mul:6x9', attempts: 10, misses: 2, avgMs: 3800 },
    { factKey: 'mul:2x3', attempts: 20, misses: 0, avgMs: 900 },
    { factKey: 'mul:5x5', attempts: 15, misses: 0, avgMs: 1000 },
  ];

  it('puts the worst fact first', () => {
    expect(rankWeakSpots(rows)[0].factKey).toBe('mul:7x8');
  });

  it('drops facts that are neither missed nor slow', () => {
    const keys = rankWeakSpots(rows).map((r) => r.factKey);
    expect(keys).toContain('mul:7x8');
    expect(keys).not.toContain('mul:2x3');
  });

  it('ignores facts with too few attempts to judge', () => {
    const thin = [{ factKey: 'mul:11x12', attempts: 1, misses: 1, avgMs: 9000 }];
    expect(rankWeakSpots(thin)).toEqual([]);
    expect(rankWeakSpots(thin, { minAttempts: 1 })).toHaveLength(1);
  });

  it('returns nothing for no data', () => {
    expect(rankWeakSpots([])).toEqual([]);
  });

  it('respects the limit', () => {
    expect(rankWeakSpots(rows, { limit: 1 })).toHaveLength(1);
  });

  it('attaches the score it sorted by', () => {
    for (const r of rankWeakSpots(rows)) expect(r.score).toBeGreaterThan(0);
  });

  it('does not mutate the rows it was handed', () => {
    const copy = structuredClone(rows);
    rankWeakSpots(rows);
    expect(rows).toEqual(copy);
  });
});

describe('formatPace', () => {
  it('reads in seconds to one decimal', () => {
    expect(formatPace(1600)).toBe('1.6s');
    expect(formatPace(950)).toBe('1.0s');
  });

  it('shows a dash instead of a fake zero', () => {
    expect(formatPace(0)).toBe('--');
    expect(formatPace(-5)).toBe('--');
  });
});

describe('formatDuration', () => {
  it('reads as minutes and seconds', () => {
    expect(formatDuration(134_000)).toBe('2:14');
    expect(formatDuration(9_000)).toBe('0:09');
    expect(formatDuration(0)).toBe('0:00');
  });

  it('adds an hour field for a long sitting', () => {
    expect(formatDuration(3_754_000)).toBe('1:02:34');
  });

  it('does not go negative', () => {
    expect(formatDuration(-100)).toBe('0:00');
  });
});

describe('factLabel', () => {
  it('shows the exact fact when the key already is one', () => {
    expect(factLabel('mul:7x8', '7 × 8')).toBe('7 × 8');
    expect(factLabel('add:5+8', '8 + 5')).toBe('8 + 5');
    expect(factLabel('div:56/7', '56 ÷ 7')).toBe('56 ÷ 7');
    expect(factLabel('neg:-7×3', '-7 × 3')).toBe('-7 × 3');
  });

  it('shows a pattern for keys that cover many questions, not one misleading sample', () => {
    expect(factLabel('mix:mul-add', '9 × 4 + 9')).toBe('a × b + c');
    expect(factLabel('mix:mul-sub', '7 × 8 - 3')).toBe('a × b - c');
    expect(factLabel('mix:add-mul', '4 + 7 × 3')).toBe('a + b × c');
    expect(factLabel('mix:div-add', '56 ÷ 8 + 5')).toBe('a ÷ b + c');
  });

  it('generalises fractions and percents over the number they act on', () => {
    expect(factLabel('frac:1/4', '1/4 of 20')).toBe('1/4 of n');
    expect(factLabel('pct:25%', '25% of 36')).toBe('25% of n');
  });

  it('generalises equations over their right hand side', () => {
    expect(factLabel('eq1:x+7', 'x + 7 = 12')).toBe('x + 7 = n');
    expect(factLabel('eq1:3x', '3x = 12')).toBe('3x = n');
    expect(factLabel('eq1:x÷3', 'x ÷ 3 = 4')).toBe('x ÷ 3 = n');
    expect(factLabel('eq2:3x-4', '3x - 4 = 11')).toBe('3x - 4 = n');
  });

  it('falls back to something readable when there is no prompt', () => {
    expect(factLabel('mul:7x8')).toBe('mul:7x8');
    expect(factLabel('nonsense')).toBe('nonsense');
    expect(factLabel('mix:unknown', '1 + 1')).toBe('unknown');
  });
});
