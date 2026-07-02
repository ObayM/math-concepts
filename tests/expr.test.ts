import { describe, it, expect } from 'vitest';
import {
  evalExpr,
  evalNum,
  evalBool,
  evalText,
  ExprError,
  exprIRSchema,
  BUILTIN_NAMES,
} from '@/engine/expr';
import type { BinOp, ExprIR, Scope } from '@/engine/expr';

// helpers to build trees without the noise
const n = (v: number): ExprIR => ({ k: 'num', v });
const id = (name: string): ExprIR => ({ k: 'id', name });
const bin = (op: BinOp, l: ExprIR, r: ExprIR): ExprIR => ({ k: 'bin', op, l, r });
const call = (fn: string, ...args: ExprIR[]): ExprIR => ({ k: 'call', fn, args });

describe('evalExpr basics', () => {
  it('literals pass through', () => {
    expect(evalExpr(n(42), {})).toBe(42);
    expect(evalExpr({ k: 'bool', v: true }, {})).toBe(true);
    expect(evalExpr({ k: 'str', v: 'hi' }, {})).toBe('hi');
  });

  it('ids resolve from scope, then constants', () => {
    expect(evalExpr(id('t'), { t: 3 })).toBe(3);
    expect(evalExpr(id('PI'), {})).toBeCloseTo(Math.PI);
  });

  it('scope shadows constants', () => {
    expect(evalExpr(id('PI'), { PI: 1 })).toBe(1);
  });

  it('unknown identifier throws (the old evaluator returned 0)', () => {
    expect(() => evalExpr(id('raduis'), { radius: 5 })).toThrow(ExprError);
    expect(() => evalExpr(id('raduis'), { radius: 5 })).toThrow(/raduis/);
  });

  it('a state var named after a builtin works in id position (the old min/sin bug)', () => {
    expect(evalExpr(bin('*', id('min'), n(2)), { min: 5 })).toBe(10);
    expect(evalExpr(bin('+', id('sin'), n(1)), { sin: 2 })).toBe(3);
  });

  it('...while call position still hits the builtin', () => {
    expect(evalExpr(call('min', n(7), n(3)), { min: 99 })).toBe(3);
  });
});

describe('operators', () => {
  const s: Scope = { a: 6, b: 4 };

  it('arithmetic', () => {
    expect(evalExpr(bin('+', id('a'), id('b')), s)).toBe(10);
    expect(evalExpr(bin('-', id('a'), id('b')), s)).toBe(2);
    expect(evalExpr(bin('*', id('a'), id('b')), s)).toBe(24);
    expect(evalExpr(bin('/', id('a'), id('b')), s)).toBe(1.5);
    expect(evalExpr(bin('%', id('a'), id('b')), s)).toBe(2);
    expect(evalExpr(bin('^', n(2), n(10)), s)).toBe(1024);
  });

  it('unary', () => {
    expect(evalExpr({ k: 'un', op: '-', e: id('a') }, s)).toBe(-6);
    expect(evalExpr({ k: 'un', op: 'not', e: { k: 'bool', v: false } }, s)).toBe(true);
    expect(evalExpr({ k: 'un', op: 'not', e: n(0) }, s)).toBe(true);
  });

  it('comparisons', () => {
    expect(evalExpr(bin('<', id('b'), id('a')), s)).toBe(true);
    expect(evalExpr(bin('>=', id('b'), id('a')), s)).toBe(false);
    expect(evalExpr(bin('==', n(1), n(1)), s)).toBe(true);
    expect(evalExpr(bin('!=', { k: 'str', v: 'x' }, { k: 'str', v: 'y' }), s)).toBe(true);
  });

  it('and/or short-circuit — the right side never evaluates', () => {
    // id "boom" would throw if evaluated
    expect(evalExpr(bin('and', { k: 'bool', v: false }, id('boom')), {})).toBe(false);
    expect(evalExpr(bin('or', { k: 'bool', v: true }, id('boom')), {})).toBe(true);
  });

  it('strings in arithmetic throw', () => {
    expect(() => evalExpr(bin('+', { k: 'str', v: 'a' }, n(1)), {})).toThrow(ExprError);
  });
});

describe('builtins', () => {
  it('math functions', () => {
    expect(evalExpr(call('sqrt', n(16)), {})).toBe(4);
    expect(evalExpr(call('atan2', n(1), n(1)), {})).toBeCloseTo(Math.PI / 4);
  });

  it('clamp and lerp', () => {
    expect(evalExpr(call('clamp', n(12), n(0), n(10)), {})).toBe(10);
    expect(evalExpr(call('lerp', n(0), n(10), n(0.25)), {})).toBe(2.5);
  });

  it('unknown function throws', () => {
    expect(() => evalExpr(call('hack', n(1)), {})).toThrow(/unknown function/);
  });
});

describe('coercing wrappers', () => {
  it('evalNum: plain numbers fast-path, booleans coerce', () => {
    expect(evalNum(5, {})).toBe(5);
    expect(evalNum(bin('>', n(2), n(1)), {})).toBe(1);
  });

  it('evalBool: numbers coerce, 0 is false', () => {
    expect(evalBool(n(0), {})).toBe(false);
    expect(evalBool(3, {})).toBe(true);
  });

  it('evalText: 2dp rounding, em dash for non-finite', () => {
    expect(evalText({ parts: ['slope = ', bin('*', n(2), id('t'))] }, { t: 1.2345 })).toBe(
      'slope = 2.47'
    );
    expect(evalText({ parts: ['v = ', bin('/', n(1), id('t'))] }, { t: 0 })).toBe('v = —');
  });
});

describe('schema (the safety boundary)', () => {
  it('accepts a valid tree and round-trips through JSON', () => {
    const tree = bin('+', call('sin', id('t')), n(1));
    const parsed = exprIRSchema.parse(JSON.parse(JSON.stringify(tree)));
    expect(parsed).toEqual(tree);
  });

  it('rejects unknown functions', () => {
    expect(exprIRSchema.safeParse(call('fetch', n(1))).success).toBe(false);
  });

  it('rejects node bombs', () => {
    let e: ExprIR = n(1);
    for (let i = 0; i < 600; i++) e = bin('+', e, n(1));
    expect(exprIRSchema.safeParse(e).success).toBe(false);
  });

  it('rejects garbage shapes', () => {
    expect(exprIRSchema.safeParse({ k: 'exec', cmd: 'rm -rf' }).success).toBe(false);
  });
});

describe('differential test vs a reference evaluator', () => {
  // seeded prng so the run is reproducible
  let seed = 0xc0ffee;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const pick = <T>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)];

  const scope: Scope = { t: 1.5, a: -2, b: 3, n: 7 };
  const vars = Object.keys(scope);
  const fns = ['sin', 'cos', 'sqrt', 'abs', 'min', 'max'];
  const ops = ['+', '-', '*', '/', '^'] as const;

  function gen(depth: number): ExprIR {
    if (depth <= 0 || rnd() < 0.3) {
      // + 0 normalizes -0, which would stringify as 0 in toJs but stay -0 in the tree
      return rnd() < 0.5 ? n(Math.round(rnd() * 20 - 10) / 2 + 0) : id(pick(vars));
    }
    const r = rnd();
    if (r < 0.15) return { k: 'un', op: '-', e: gen(depth - 1) };
    if (r < 0.3) {
      const fn = pick(fns);
      const arity = fn === 'min' || fn === 'max' ? 2 : 1;
      return { k: 'call', fn, args: Array.from({ length: arity }, () => gen(depth - 1)) };
    }
    return bin(pick([...ops]), gen(depth - 1), gen(depth - 1));
  }

  function toJs(e: ExprIR): string {
    switch (e.k) {
      case 'num':
        return `(${e.v})`;
      case 'id':
        return e.name;
      case 'un':
        return `(-${toJs(e.e)})`;
      case 'bin':
        return e.op === '^'
          ? `(${toJs(e.l)} ** ${toJs(e.r)})`
          : `(${toJs(e.l)} ${e.op} ${toJs(e.r)})`;
      case 'call':
        return `Math.${e.fn}(${e.args.map(toJs).join(',')})`;
      default:
        throw new Error('unreachable in this generator');
    }
  }

  it('matches new Function semantics on 300 random numeric trees', () => {
    for (let i = 0; i < 300; i++) {
      const tree = gen(4);
      const ref = new Function(...vars, `return ${toJs(tree)};`)(
        ...vars.map((v) => scope[v])
      ) as number;
      const got = evalNum(tree, scope);
      if (Number.isNaN(ref)) {
        expect(Number.isNaN(got)).toBe(true);
      } else {
        expect(got).toBeCloseTo(ref, 10);
      }
    }
  });

  it('BUILTIN_NAMES is stable (schema enum depends on it)', () => {
    expect(BUILTIN_NAMES).toContain('clamp');
    expect(BUILTIN_NAMES).toContain('atan2');
    expect(new Set(BUILTIN_NAMES).size).toBe(BUILTIN_NAMES.length);
  });
});
