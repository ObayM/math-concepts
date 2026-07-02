import { describe, it, expect } from 'vitest';
import { evaluate, evalNumber, evalBool, interpolate } from '@/engine/runtime/eval';

// characterization of the CURRENT string evaluator, quirks included.
// P0.6 replaces it with a tree-walker over the expr AST — the happy-path cases
// here must keep passing; the ones marked "known bug" are expected to flip.

describe('evaluate — happy paths that must survive the evaluator swap', () => {
  it('passes numbers through', () => {
    expect(evaluate(42, {})).toBe(42);
  });

  it('does arithmetic over scope', () => {
    expect(evaluate('a + b * 2', { a: 1, b: 3 })).toBe(7);
  });

  it('treats ^ as power', () => {
    expect(evaluate('t^2', { t: 3 })).toBe(9);
    expect(evaluate('2^-2', { t: 0 })).toBe(0.25);
  });

  it('knows the math functions', () => {
    expect(evaluate('sqrt(16)', {})).toBe(4);
    expect(evaluate('sin(0)', {})).toBe(0);
    expect(evalNumber('max(2, 5)', {})).toBe(5);
    expect(evalNumber('atan2(1, 1)', {})).toBeCloseTo(Math.PI / 4);
  });

  it('knows PI and E', () => {
    expect(evaluate('PI', {})).toBeCloseTo(Math.PI);
    expect(evaluate('E', {})).toBeCloseTo(Math.E);
  });

  it('evaluates comparisons to booleans', () => {
    expect(evalBool('t > 1', { t: 2 })).toBe(true);
    expect(evalBool('t > 1', { t: 0 })).toBe(false);
  });

  it('evalNumber coerces booleans to 0/1', () => {
    expect(evalNumber('t > 1', { t: 2 })).toBe(1);
  });

  it('interpolates ${} with 2dp rounding', () => {
    expect(interpolate('slope = ${2*t}', { t: 1.2345 })).toBe('slope = 2.47');
  });

  it('interpolates non-finite values as an em dash', () => {
    expect(interpolate('v = ${1/t}', { t: 0 })).toBe('v = —');
  });
});

describe('evaluate — current quirks (characterized, will change in P0.6)', () => {
  it('silently returns 0 for unknown identifiers (known bug: should error)', () => {
    expect(evaluate('raduis * 2', { radius: 5 })).toBe(0);
  });

  it('state var named after a math fn gets clobbered (known bug: min → Math.min)', () => {
    // "min*2" becomes "Math.min*2" → NaN. the tree-walker fixes this.
    expect(Number.isNaN(evalNumber('min * 2', { min: 5 }))).toBe(true);
  });

  it('empty string evaluates to 0', () => {
    expect(evaluate('', { t: 1 })).toBe(0);
  });
});
