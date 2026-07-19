import { describe, it, expect } from 'vitest';
import { compile } from '@/engine/lang';
import { expandObjects } from '@/engine/runtime/expand';

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
