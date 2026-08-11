import { describe, it, expect } from 'vitest';
import { planeCoords, PLOT_PAD } from '@/engine/renderers/svg/coords';
import { compile } from '@/engine/lang';

const W = 640;
const H = 384;

describe('plane coordinates round-trip', () => {
  for (const aspect of [undefined, 'equal'] as const) {
    it(`inverts itself with aspect ${aspect ?? 'default'}`, () => {
      const cx = planeCoords([-3, 5], [-2, 6], W, H, aspect);
      for (const x of [-3, -1.25, 0, 2.5, 5]) {
        expect(cx.fromX(cx.toX(x))).toBeCloseTo(x, 9);
      }
      for (const y of [-2, 0, 1.75, 6]) {
        expect(cx.fromY(cx.toY(y))).toBeCloseTo(y, 9);
      }
    });
  }
});

describe('default aspect', () => {
  const cx = planeCoords([-4, 4], [-1, 1], W, H);

  it('stretches each axis to fill the padded box', () => {
    expect(cx.toX(-4)).toBeCloseTo(PLOT_PAD, 9);
    expect(cx.toX(4)).toBeCloseTo(W - PLOT_PAD, 9);
    expect(cx.toY(-1)).toBeCloseTo(H - PLOT_PAD, 9);
    expect(cx.toY(1)).toBeCloseTo(PLOT_PAD, 9);
  });
});

describe('aspect: equal', () => {
  it('uses one scale for both axes so a circle stays round', () => {
    const cx = planeCoords([-2, 2], [-2, 2], W, H, 'equal');
    const perUnitX = cx.toX(1) - cx.toX(0);
    const perUnitY = cx.toY(0) - cx.toY(1);
    expect(perUnitX).toBeCloseTo(perUnitY, 9);
  });

  it('keeps that scale as the width changes', () => {
    const wide = planeCoords([-2, 2], [-2, 2], 1200, H, 'equal');
    const narrow = planeCoords([-2, 2], [-2, 2], 320, H, 'equal');
    for (const cx of [wide, narrow]) {
      expect(cx.toX(1) - cx.toX(0)).toBeCloseTo(cx.toY(0) - cx.toY(1), 9);
    }
  });

  it('centres the letterboxed plot in the box', () => {
    const cx = planeCoords([-2, 2], [-2, 2], W, H, 'equal');
    expect(cx.toX(0)).toBeCloseTo(W / 2, 9);
    expect(cx.toY(0)).toBeCloseTo(H / 2, 9);
  });

  it('fits the tighter axis inside the padded box', () => {
    const cx = planeCoords([-10, 10], [-1, 1], W, H, 'equal');
    expect(cx.toY(1)).toBeGreaterThanOrEqual(PLOT_PAD - 1e-9);
    expect(cx.toY(-1)).toBeLessThanOrEqual(H - PLOT_PAD + 1e-9);
    expect(cx.toX(-10)).toBeCloseTo(PLOT_PAD, 9);
    expect(cx.toX(10)).toBeCloseTo(W - PLOT_PAD, 9);
  });
});

describe('aspect in the language', () => {
  it('lands on the compiled space', () => {
    const ir = compile('scene plane {\n  x: [-2, 2]\n  y: [-2, 2]\n  aspect: equal\n}');
    expect(ir.space.aspect).toBe('equal');
  });

  it('is absent unless asked for', () => {
    const ir = compile('scene plane {\n  x: [-2, 2]\n  y: [-2, 2]\n}');
    expect(ir.space.aspect).toBeUndefined();
  });

  it('rejects any value other than equal', () => {
    expect(() => compile('scene plane {\n  x: [-2, 2]\n  y: [-2, 2]\n  aspect: square\n}')).toThrow(
      /aspect must be "equal"/
    );
  });

  it('rejects it on a numberline', () => {
    expect(() => compile('scene numberline {\n  x: [-2, 2]\n  aspect: equal\n}')).toThrow(
      /no meaning on a numberline/
    );
  });
});
