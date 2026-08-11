import { describe, it, expect } from 'vitest';
import { compile } from '@/engine/lang';
import { expandObjects } from '@/engine/runtime/expand';
import { evalNumber } from '@/engine/runtime/eval';

describe('repeat expansion is bounded', () => {
  const ir = compile(
    'scene plane {\n' +
      '  x: [-1, 1]\n' +
      '  y: [-1, 1]\n' +
      '  param n = 50\n' +
      '  repeat i in range(0, n) {\n' +
      '    repeat j in range(0, n) {\n' +
      '      point p = (0, 0)\n' +
      '    }\n' +
      '  }\n' +
      '}'
  );

  it('caps a nested repeat well below the multiplicative blowup', () => {
    const expanded = expandObjects(ir.objects, { n: 50 });
    expect(expanded.length).toBeGreaterThan(0);
    expect(expanded.length).toBeLessThanOrEqual(2000);
  });
});

describe('a nested repeat sees both loop variables', () => {
  const ir = compile(
    'scene plane {\n' +
      '  x: [-1, 4]\n' +
      '  y: [-1, 4]\n' +
      '  repeat i in range(0, 3) {\n' +
      '    repeat j in range(0, 2) {\n' +
      '      point p = (i, j)\n' +
      '    }\n' +
      '  }\n' +
      '}'
  );
  const expanded = expandObjects(ir.objects, {});

  it('substitutes the outer variable into the inner body', () => {
    const at = expanded.map((o) => {
      const p = o as unknown as { x: never; y: never };
      return [evalNumber(p.x, {}), evalNumber(p.y, {})];
    });
    expect(at).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
      [2, 1],
    ]);
  });

  it('gives every instance a unique id', () => {
    const ids = expanded.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('repeat variable shadowing', () => {
  it('is a compile error rather than an ambiguous substitution', () => {
    const src =
      'scene plane {\n' +
      '  x: [-1, 1]\n' +
      '  y: [-1, 1]\n' +
      '  repeat i in range(0, 3) {\n' +
      '    repeat i in range(0, 2) {\n' +
      '      point p = (i, 0)\n' +
      '    }\n' +
      '  }\n' +
      '}';
    expect(() => compile(src)).toThrow(/already used by an enclosing repeat/);
  });
});
