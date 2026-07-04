import { describe, it, expect } from 'vitest';
import { simplify } from '@/engine/runtime/rdp';

describe('simplify (RDP)', () => {
  it('leaves 0/1/2-point strokes untouched', () => {
    expect(simplify([], 0.1)).toEqual([]);
    expect(simplify([[0, 0]], 0.1)).toEqual([[0, 0]]);
    expect(
      simplify(
        [
          [0, 0],
          [1, 1],
        ],
        0.1
      )
    ).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });

  it('collapses a straight line (with noisy midpoints) to its endpoints', () => {
    const line: [number, number][] = [
      [0, 0],
      [1, 1.001],
      [2, 2],
      [3, 2.999],
      [4, 4],
    ];
    const out = simplify(line, 0.05);
    expect(out[0]).toEqual([0, 0]);
    expect(out[out.length - 1]).toEqual([4, 4]);
    expect(out.length).toBeLessThan(line.length);
  });

  it('keeps a real corner that exceeds epsilon', () => {
    const v: [number, number][] = [
      [0, 0],
      [2, 5],
      [4, 0],
    ];
    const out = simplify(v, 0.5);
    expect(out).toEqual(v);
  });

  it('preserves endpoints no matter what', () => {
    const stroke: [number, number][] = Array.from({ length: 20 }, (_, i) => [i, Math.sin(i)]);
    const out = simplify(stroke, 0.2);
    expect(out[0]).toEqual(stroke[0]);
    expect(out[out.length - 1]).toEqual(stroke[stroke.length - 1]);
  });

  it('a larger epsilon simplifies at least as aggressively as a smaller one', () => {
    const stroke: [number, number][] = Array.from({ length: 30 }, (_, i) => [
      i * 0.3,
      Math.sin(i * 0.3) * 3,
    ]);
    const tight = simplify(stroke, 0.05);
    const loose = simplify(stroke, 0.5);
    expect(loose.length).toBeLessThanOrEqual(tight.length);
  });
});
