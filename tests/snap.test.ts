import { describe, it, expect } from 'vitest';
import { snapRound, applyDrag } from '@/engine/runtime/drag';
import { compile } from '@/engine/lang';

describe('snapping lands on the exact step value', () => {
  it.each([
    [0.3, 0.1, 0.3],
    [0.7, 0.1, 0.7],
    [1.05, 0.05, 1.05],
    [2.26, 0.25, 2.25],
    [17, 5, 15],
  ])('snapRound(%d, %d) is %d', (v, step, out) => {
    expect(snapRound(v, step)).toBe(out);
  });

  it('makes an == goal on a dragged point reachable', () => {
    const ir = compile(`scene plane {
  x: [-1, 1]
  y: [-1, 1]
  param a = 0 { range: [0, 1] }
  point p = (a, 0) { drag: x -> a, snap: 0.1 }
}`);
    const obj = ir.objects.find((o) => o.id === 'p') as {
      draggable: Parameters<typeof applyDrag>[0];
    };
    const patch = applyDrag(obj.draggable, 0.29, 0, ir, { a: 0 });
    expect(patch.a).toBe(0.3);
    expect(patch.a === 0.3).toBe(true);
  });
});

describe('curve steps', () => {
  it('refuses a step count that would hang the renderer', () => {
    expect(() =>
      compile(`scene plane {
  x: [-1, 1]
  y: [-1, 1]
  curve c = (cos(t), sin(t)) { t: [0, 6.28], steps: 1000000 }
}`)
    ).toThrow(/steps: must be a whole number from 2 to 2000/);
  });
});
