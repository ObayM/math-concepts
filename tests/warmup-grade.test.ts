import { describe, it, expect } from 'vitest';
import { normalizeAnswer, gradeAnswer } from '@/lib/warmup/grade';

describe('normalizeAnswer', () => {
  const cases: [unknown, string][] = [
    ['5', '5'],
    ['  5  ', '5'],
    ['05', '5'],
    ['5.0', '5'],
    ['+5', '5'],
    ['-5', '-5'],
    ['−5', '-5'],
    ['–5', '-5'],
    ['—5', '-5'],
    ['-0', '0'],
    ['0', '0'],
    ['1,200', '1200'],
    ['.5', '0.5'],
    ['5.', '5'],
    ['-.5', '-0.5'],
    [5, '5'],
    [-12, '-12'],
    ['', ''],
    ['-', ''],
    ['.', ''],
    ['abc', ''],
    ['5x', ''],
    ['5-3', ''],
    ['1e3', ''],
    ['Infinity', ''],
    ['NaN', ''],
    [null, ''],
    [undefined, ''],
    [{}, ''],
  ];

  for (const [input, expected] of cases) {
    it(`turns ${JSON.stringify(input)} into ${JSON.stringify(expected)}`, () => {
      expect(normalizeAnswer(input)).toBe(expected);
    });
  }
});

describe('gradeAnswer', () => {
  const q = { answer: '56' };

  it('accepts the exact answer', () => {
    expect(gradeAnswer(q, '56')).toBe(true);
  });

  it('accepts a sloppily typed version of the right answer', () => {
    for (const given of [' 56 ', '056', '56.0', '+56']) {
      expect(gradeAnswer(q, given), given).toBe(true);
    }
  });

  it('rejects a wrong answer', () => {
    expect(gradeAnswer(q, '54')).toBe(false);
    expect(gradeAnswer(q, '-56')).toBe(false);
  });

  it('treats blank and unparseable input as wrong, never as right', () => {
    for (const given of ['', '   ', '-', 'abc', null, undefined]) {
      expect(gradeAnswer(q, given), JSON.stringify(given)).toBe(false);
    }
  });

  it('never marks a blank answer correct even against a blank expectation', () => {
    expect(gradeAnswer({ answer: '' }, '')).toBe(false);
  });

  it('handles negative and zero answers', () => {
    expect(gradeAnswer({ answer: '-21' }, '−21')).toBe(true);
    expect(gradeAnswer({ answer: '0' }, '-0')).toBe(true);
    expect(gradeAnswer({ answer: '0' }, '')).toBe(false);
  });
});
