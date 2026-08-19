import { describe, it, expect } from 'vitest';
import { compile } from '@/engine/lang';
import { CompileError } from '@/engine/lang/errors';
import { sceneSchema } from '@/engine/ir/schema';

const scene = (body: string) =>
  compile(`scene space3 {\n  x: [-4, 4]\n  y: [-4, 4]\n  z: [-4, 4]\n${body}\n}`);

describe('a space3 scene', () => {
  it('carries all three domains into the ir', () => {
    const ir = scene('  point3 A = (1, 2, 3)');
    expect(ir.space.type).toBe('space3');
    expect(ir.space.zDomain).toEqual([-4, 4]);
    expect(sceneSchema.safeParse(ir).success).toBe(true);
  });

  it('insists on a z domain', () => {
    expect(() => compile('scene space3 {\n  x: [-1, 1]\n  y: [-1, 1]\n}')).toThrow(/needs z/);
  });

  it('refuses z on a flat scene, so the mistake is caught not ignored', () => {
    expect(() => compile('scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  z: [-1, 1]\n}')).toThrow(
      /space3/
    );
  });

  it('refuses a camera on a flat scene', () => {
    expect(() =>
      compile('scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  camera: [30, 20]\n}')
    ).toThrow(/space3/);
  });

  it('takes a constant camera', () => {
    const ir = scene('  camera: [40, 20]\n  point3 A = (1, 1, 1)');
    expect(ir.space.camera).toEqual([40, 20]);
  });

  it('lets the camera bind to a param declared inside the scene', () => {
    const ir = scene('  param az = 30 { range: [0, 360] }\n  camera: [az, 20]');
    expect(ir.space.camera?.[0]).toMatchObject({ k: 'id', name: 'az' });
    expect(ir.space.camera?.[1]).toBe(20);
  });

  it('rejects a camera that is not two angles', () => {
    expect(() => scene('  camera: [30]')).toThrow(/azimuth, elevation/);
  });
});

describe('3d objects', () => {
  it('emits a point with its three coordinates and flags', () => {
    const ir = scene('  point3 A = (1, 2, 3) { guides, open, r: 4, label: "A" }');
    expect(ir.objects[0]).toMatchObject({
      type: 'point3',
      x: 1,
      y: 2,
      z: 3,
      guides: true,
      open: true,
      r: 4,
    });
  });

  it('needs a full triple, not a pair', () => {
    expect(() => scene('  point3 A = (1, 2)')).toThrow(/x, y, z/);
  });

  it('emits a segment from an arrow expression', () => {
    const ir = scene('  segment3 s = (0, 0, 0) -> (1, 2, 3) { arrow }');
    expect(ir.objects[0]).toMatchObject({
      type: 'segment3',
      x1: 0,
      z1: 0,
      x2: 1,
      z2: 3,
      arrow: true,
    });
  });

  it('tells you a segment needs the arrow form', () => {
    expect(() => scene('  segment3 s = (0, 0, 0)')).toThrow(/->/);
  });

  it('emits a face with every vertex', () => {
    const ir = scene('  polygon3 f = [(0,0,0), (1,0,0), (1,1,0)]');
    expect((ir.objects[0] as { points: unknown[] }).points).toHaveLength(3);
  });

  it('emits a plane from a normal and a point on it', () => {
    const ir = scene('  plane3 p { normal: (1, 2, 2), through: (0, 0, 1), size: 2 }');
    expect(ir.objects[0]).toMatchObject({ type: 'plane3', nx: 1, ny: 2, nz: 2, size: 2 });
  });

  it('refuses a plane with no normal', () => {
    expect(() => scene('  plane3 p { through: (0, 0, 0) }')).toThrow(/normal/);
  });

  it('refuses a plane with no point on it', () => {
    expect(() => scene('  plane3 p { normal: (1, 0, 0) }')).toThrow(/through/);
  });

  it('refuses a zero normal, which has no plane', () => {
    expect(() => scene('  plane3 p { normal: (0, 0, 0), through: (0, 0, 0) }')).toThrow(
      /zero vector/
    );
  });

  it('emits a label anchored in space', () => {
    const ir = scene('  label3 at (1, 1, 1) = "A"');
    expect(ir.objects[0]).toMatchObject({ type: 'label3', x: 1, y: 1, z: 1 });
  });

  it('interpolates live state into a 3d label', () => {
    const ir = scene(
      '  param t = 1 { range: [0, 3] }\n  point3 A = (t, 0, 0) { label: "x = ${t}" }'
    );
    expect(JSON.stringify(ir.objects[0])).toContain('parts');
  });

  it('still catches an undefined identifier inside a triple', () => {
    expect(() => scene('  point3 A = (nope, 0, 0)')).toThrow(CompileError);
  });

  it('validates against the scene schema for every 3d kind', () => {
    const ir = scene(
      [
        '  point3 A = (1, 1, 1) { guides }',
        '  segment3 s = (0,0,0) -> (1,1,1) { arrow }',
        '  polygon3 f = [(0,0,0), (1,0,0), (1,1,0)]',
        '  plane3 p { normal: (0, 0, 1), through: (0, 0, 0) }',
        '  label3 at (1, 1, 2) = "A"',
      ].join('\n')
    );
    const parsed = sceneSchema.safeParse(ir);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect(ir.objects.map((o) => o.type)).toEqual([
      'point3',
      'segment3',
      'polygon3',
      'plane3',
      'label3',
    ]);
  });
});
