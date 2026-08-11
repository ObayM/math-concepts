import { describe, it, expect } from 'vitest';
import { compile } from '@/engine/lang';
import { sceneSchema } from '@/engine/ir/schema';

const scene = (body: string) => `scene plane {\n  x: [-3, 3]\n  y: [-3, 3]\n${body}\n}`;

describe('along() references are checked at compile time', () => {
  it('accepts a circle', () => {
    const ir = compile(
      scene(
        '  param th = 0 { range: [-3.15, 3.15] }\n' +
          '  circle c = (0, 0) { r: 2 }\n' +
          '  point p = (2*cos(th), 2*sin(th)) { drag: along(c) -> th }'
      )
    );
    const p = ir.objects.find((o: any) => o.id === 'p') as any;
    expect(p.draggable.along.ref).toBe('c');
  });

  it('accepts a two-point line', () => {
    const ir = compile(
      scene(
        '  param u = 0 { range: [0, 1] }\n' +
          '  line seg = (-2, 0) -> (2, 2)\n' +
          '  point p = (-2 + 4*u, 2*u) { drag: along(seg) -> u }'
      )
    );
    const p = ir.objects.find((o: any) => o.id === 'p') as any;
    expect(p.draggable.along.ref).toBe('seg');
  });

  it('rejects a reference to nothing, with a suggestion', () => {
    expect(() =>
      compile(
        scene(
          '  param th = 0\n' +
            '  circle circ = (0, 0) { r: 2 }\n' +
            '  point p = (0, 0) { drag: along(cicr) -> th }'
        )
      )
    ).toThrow(/no such object exists yet/);
  });

  it('rejects an object that cannot be traced along', () => {
    expect(() =>
      compile(
        scene(
          '  param th = 0\n' +
            '  rect r = (0, 0) { w: 1, h: 1 }\n' +
            '  point p = (0, 0) { drag: along(r) -> th }'
        )
      )
    ).toThrow(/needs a circle or a two-point line/);
  });

  it('rejects an infinite line, which has no endpoints to travel between', () => {
    expect(() =>
      compile(
        scene(
          '  param th = 0\n' +
            '  point a = (0, 0)\n' +
            '  line l { through: a, slope: 1 }\n' +
            '  point p = (1, 1) { drag: along(l) -> th }'
        )
      )
    ).toThrow(/two-point line/);
  });

  it('rejects a forward reference', () => {
    expect(() =>
      compile(
        scene(
          '  param th = 0\n' +
            '  point p = (0, 0) { drag: along(c) -> th }\n' +
            '  circle c = (0, 0) { r: 2 }'
        )
      )
    ).toThrow(/no such object exists yet/);
  });
});

describe('label anchor', () => {
  it('defaults to absent', () => {
    const ir = compile(scene('  label at (0, 0) = "hi"'));
    const l = ir.objects.find((o: any) => o.type === 'label') as any;
    expect(l.anchor).toBeUndefined();
  });

  it('carries through to the IR and passes the schema', () => {
    const ir = compile(scene('  label at (0, 0) = "120" { anchor: middle }'));
    const parsed = sceneSchema.parse(ir);
    const l = parsed.objects.find((o) => o.type === 'label') as any;
    expect(l.anchor).toBe('middle');
  });

  it('rejects anything that is not a text anchor', () => {
    expect(() => compile(scene('  label at (0, 0) = "x" { anchor: centre }'))).toThrow(
      /anchor must be start, middle, or end/
    );
  });
});
