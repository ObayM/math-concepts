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

describe('reveal', () => {
  it('tags every object inside with phase: reveal', () => {
    const objects = objectsOf(
      wrap('reveal {\n    curve f = x^2\n    point p = (1, 1) { color: danger }\n  }')
    );
    expect(objects).toHaveLength(2);
    for (const o of objects) expect(o.phase).toBe('reveal');
  });

  it('objects outside reveal have no phase', () => {
    const [c] = objectsOf(wrap('curve f = x^2'));
    expect(c.phase).toBeUndefined();
  });

  it('rejects an empty reveal block', () => {
    expect(() => compile(wrap('reveal {\n  }'))).toThrow(/no objects/);
  });
});

describe('image', () => {
  const src =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

  it('compiles with x/y/w/h/src/alt', () => {
    const [img] = objectsOf(
      wrap(`image logo = (-1, -1) { w: 2, h: 2, src: "${src}", alt: "a square" }`)
    );
    expect(img.type).toBe('image');
    if (img.type === 'image') {
      expect(img.w).toBe(2);
      expect(img.h).toBe(2);
      expect(img.src).toBe(src);
      expect(img.alt).toBe('a square');
    }
  });

  it('rejects a missing w/h', () => {
    expect(() => compile(wrap(`image i = (0, 0) { src: "${src}", alt: "x" }`))).toThrow(
      /w: and h:/
    );
  });

  it('rejects a missing src', () => {
    expect(() => compile(wrap('image i = (0, 0) { w: 1, h: 1, alt: "x" }'))).toThrow(/src:/);
  });

  it('rejects a missing alt', () => {
    expect(() => compile(wrap(`image i = (0, 0) { w: 1, h: 1, src: "${src}" }`))).toThrow(/alt:/);
  });

  it('rejects a non-http(s)/data/relative src', () => {
    expect(() =>
      compile(wrap('image i = (0, 0) { w: 1, h: 1, src: "javascript:alert(1)", alt: "x" }'))
    ).toThrow(/http\(s\)/);
  });

  it('accepts opacity and w/h/x/y bound to state', () => {
    const [img] = objectsOf(
      wrap(
        `param t = 1 { range: [0, 3] }\n  image i = (0, t) { w: t, h: 1, src: "${src}", alt: "x", opacity: 0.5 }`
      )
    );
    if (img.type === 'image') {
      expect(typeof img.w).toBe('object'); // bound to state, not a constant
      expect(img.opacity).toBe(0.5);
    }
  });
});
