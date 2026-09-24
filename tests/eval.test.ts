import { describe, it, expect } from 'vitest';
import { evaluate, evalNumber, evalBool, interpolate } from '@/engine/runtime/eval';
import type { ExprIR } from '@/engine/expr';

// the runtime evaluator now walks the expression AST (see expr.test.ts for the
// exhaustive coverage). these tests cover the thin runtime wrappers: number
// fast-path, tree delegation, Text interpolation, and the dead v1 string path.

const n = (v: number): ExprIR => ({ k: 'num', v });
const id = (name: string): ExprIR => ({ k: 'id', name });
const bin = (op: any, l: ExprIR, r: ExprIR): ExprIR => ({ k: 'bin', op, l, r });

describe('evaluate', () => {
  it('passes numbers through', () => {
    expect(evaluate(42, {})).toBe(42);
  });

  it('walks expression trees against scope', () => {
    expect(evaluate(bin('+', id('a'), bin('*', id('b'), n(2))), { a: 1, b: 3 })).toBe(7);
    expect(evaluate(bin('^', id('t'), n(2)), { t: 3 })).toBe(9);
  });

  it('returns booleans for comparisons', () => {
    expect(evaluate(bin('>', id('t'), n(1)), { t: 2 })).toBe(true);
    expect(evaluate(bin('>', id('t'), n(1)), { t: 0 })).toBe(false);
  });

  it('a broken tree degrades to 0 rather than throwing', () => {
    expect(evaluate(id('missing'), {})).toBe(0);
  });
});

describe('evalNumber / evalBool wrappers', () => {
  it('evalNumber coerces booleans to 0/1', () => {
    expect(evalNumber(bin('>', id('t'), n(1)), { t: 2 })).toBe(1);
    expect(evalNumber(bin('>', id('t'), n(1)), { t: 0 })).toBe(0);
  });

  it('evalBool treats nonzero as true', () => {
    expect(evalBool(n(3), {})).toBe(true);
    expect(evalBool(n(0), {})).toBe(false);
  });
});

describe('interpolate (v2 Text {parts})', () => {
  it('renders parts with 2dp rounding', () => {
    const text = { parts: ['slope = ', bin('*', n(2), id('t'))] };
    expect(interpolate(text, { t: 1.2345 })).toBe('slope = 2.47');
  });

  it('renders non-finite values as a question mark', () => {
    const text = { parts: ['v = ', bin('/', n(1), id('t'))] };
    expect(interpolate(text, { t: 0 })).toBe('v = ?');
  });

  it('a plain string with no parts passes through', () => {
    expect(interpolate('just text', {})).toBe('just text');
  });
});

describe('legacy v1 string path is dead (P0.6)', () => {
  it('string expressions no longer evaluate — they return 0', () => {
    expect(evaluate('a + b * 2', { a: 1, b: 3 })).toBe(0);
    expect(evaluate('t^2', { t: 3 })).toBe(0);
  });
});
