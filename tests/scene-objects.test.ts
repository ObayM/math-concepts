import { describe, it, expect } from 'vitest';
import { compile } from '@/engine/lang';
import { sceneSchema } from '@/engine/ir/schema';

// P2.17 scene objects: parametric curve + shaded area.

const wrap = (body: string) => `scene plane {\n  x: [-3, 3]\n  y: [-3, 3]\n  ${body}\n}`;
const objectsOf = (src: string) => sceneSchema.parse(compile(src)).objects;

describe('parametric curve', () => {
  it('a (x(t), y(t)) pair compiles to xExpr/yExpr with a t range', () => {
    const [c] = objectsOf(wrap('curve circle = (cos(t), sin(t)) { t: [0, 2*PI] }'));
    expect(c.type).toBe('curve');
    if (c.type === 'curve') {
      expect(c.xExpr).toBeDefined();
      expect(c.yExpr).toBeDefined();
      expect(c.expr).toBeUndefined();
      expect(c.tDomain?.[0]).toBe(0);
      expect(c.tDomain?.[1]).toBeCloseTo(Math.PI * 2, 6);
    }
  });

  it('a plain y = f(x) curve still emits expr only', () => {
    const [c] = objectsOf(wrap('curve f = x^2'));
    if (c.type === 'curve') {
      expect(c.expr).toBeDefined();
      expect(c.xExpr).toBeUndefined();
    }
  });

  it('rejects a parametric curve with no t range', () => {
    expect(() => compile(wrap('curve c = (cos(t), sin(t))'))).toThrow(/t: \[start, end\]/);
  });

  it('carries a `where` predicate for piecewise branches', () => {
    const [c] = objectsOf(
      wrap('param k = 1 { range: [-2, 2] }\n  curve left = x + 2 { where: x < k }')
    );
    if (c.type === 'curve') {
      expect(c.where).toBeDefined();
      expect(typeof c.where).toBe('object'); // a boolean expr tree in x
    }
  });
});

describe('area', () => {
  it('shades under a curve with from/to bounds', () => {
    const [a] = objectsOf(wrap('area a = x^2 { from: -1, to: 2, opacity: 0.1 }'));
    expect(a.type).toBe('area');
    if (a.type === 'area') {
      expect(a.expr).toBeDefined();
      expect(a.from).toBe(-1);
      expect(a.to).toBe(2);
      expect(a.opacity).toBe(0.1);
    }
  });

  it('supports a lower boundary curve', () => {
    const [a] = objectsOf(wrap('area band = x^2 { lower: -1 }'));
    if (a.type === 'area') expect(a.lower).toBeDefined();
  });

  it('from/to may bind to state so a slider can sweep the region', () => {
    const [a] = objectsOf(wrap('param b = 1 { range: [0, 3] }\n  area a = x^2 { from: 0, to: b }'));
    if (a.type === 'area') expect(typeof a.to).toBe('object'); // an expr tree, not a constant
  });
});
