import { describe, it, expect } from 'vitest';
import { rotateAbout } from '@/engine/renderers/svg/primitives/rotate';
import { compile } from '@/engine/lang';
import { sceneSchema } from '@/engine/ir/schema';

describe('rotateAbout', () => {
  it('leaves the pivot alone', () => {
    expect(rotateAbout(2, 3, 2, 3, 57)).toEqual([2, 3]);
  });

  it('is the identity at zero degrees', () => {
    expect(rotateAbout(5, 1, 0, 0, 0)).toEqual([5, 1]);
  });

  it('turns counter-clockwise', () => {
    const [x, y] = rotateAbout(1, 0, 0, 0, 90);
    expect(x).toBeCloseTo(0, 10);
    expect(y).toBeCloseTo(1, 10);
  });

  it('preserves distance from the pivot', () => {
    const ox = -1;
    const oy = 2;
    for (const deg of [17, 90, 180, 275, -40]) {
      const [x, y] = rotateAbout(3, 5, ox, oy, deg);
      expect(Math.hypot(x - ox, y - oy)).toBeCloseTo(Math.hypot(3 - ox, 5 - oy), 10);
    }
  });

  it('composes: two half turns come back', () => {
    const once = rotateAbout(4, -2, 1, 1, 180);
    const twice = rotateAbout(once[0], once[1], 1, 1, 180);
    expect(twice[0]).toBeCloseTo(4, 10);
    expect(twice[1]).toBeCloseTo(-2, 10);
  });

  it('puts a ramp angle where the trig says it should', () => {
    const [x, y] = rotateAbout(1, 0, 0, 0, 30);
    expect(x).toBeCloseTo(Math.cos(Math.PI / 6), 10);
    expect(y).toBeCloseTo(Math.sin(Math.PI / 6), 10);
  });
});

describe('rotate: in the language', () => {
  it('lands on rect and polygon and survives the schema', () => {
    const ir = compile(
      'scene plane {\n' +
        '  x: [-3, 3]\n' +
        '  y: [-3, 3]\n' +
        '  param a = 25 { range: [0, 60] }\n' +
        '  rect block = (1, 0) { w: 1, h: 0.5, rotate: a }\n' +
        '  polygon tri = [(0,0), (2,0), (1,1)] { rotate: 15 }\n' +
        '}'
    );
    const parsed = sceneSchema.parse(ir);
    const rect = parsed.objects.find((o) => o.type === 'rect');
    const poly = parsed.objects.find((o) => o.type === 'polygon');
    expect(rect && 'rotate' in rect && rect.rotate).toBeTruthy();
    expect(poly && 'rotate' in poly && poly.rotate).toBe(15);
  });

  it('stays absent when not asked for', () => {
    const ir = compile(
      'scene plane {\n  x: [-3, 3]\n  y: [-3, 3]\n  rect r = (0, 0) { w: 1, h: 1 }\n}'
    );
    const rect = ir.objects.find((o) => o.type === 'rect') as Record<string, unknown>;
    expect(rect.rotate).toBeUndefined();
  });
});
