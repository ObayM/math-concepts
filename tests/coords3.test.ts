import { describe, it, expect } from 'vitest';
import { cameraBasis, spaceCoords3 } from '@/engine/renderers/svg/coords3';

const D: [number, number] = [-1, 1];
const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe('the camera basis', () => {
  it('is orthonormal at every angle, or the picture shears', () => {
    for (const az of [0, 35, 90, 217, 359]) {
      for (const el of [-40, 0, 25, 80]) {
        const { right, up, view } = cameraBasis(az, el);
        for (const v of [right, up, view]) {
          near(Math.hypot(...v), 1);
        }
        const dot = (a: readonly number[], b: readonly number[]) =>
          a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
        near(dot(right, up), 0);
        near(dot(right, view), 0);
        near(dot(up, view), 0);
      }
    }
  });

  it('keeps the world z axis pointing up the screen', () => {
    const { right, up } = cameraBasis(35, 25);
    near(right[2], 0);
    expect(up[2]).toBeGreaterThan(0);
  });
});

describe('spaceCoords3', () => {
  const cx = () => spaceCoords3(D, D, D, 400, 300, 35, 25);

  it('puts the origin inside the viewport', () => {
    const [px, py] = cx().project3(0, 0, 0);
    expect(px).toBeGreaterThan(0);
    expect(px).toBeLessThan(400);
    expect(py).toBeGreaterThan(0);
    expect(py).toBeLessThan(300);
  });

  it('fits the whole box at any camera angle, so spinning never clips', () => {
    for (const az of [0, 45, 120, 300]) {
      const c = spaceCoords3(D, D, D, 400, 300, az, 25);
      for (const x of D)
        for (const y of D)
          for (const z of D) {
            const [px, py] = c.project3(x, y, z);
            expect(px, `az=${az}`).toBeGreaterThanOrEqual(-0.001);
            expect(px, `az=${az}`).toBeLessThanOrEqual(400.001);
            expect(py, `az=${az}`).toBeGreaterThanOrEqual(-0.001);
            expect(py, `az=${az}`).toBeLessThanOrEqual(300.001);
          }
    }
  });

  it('scales both screen axes equally, so a cube is not stretched', () => {
    const c = cx();
    const [ox, oy] = c.project3(0, 0, 0);
    const [zx, zy] = c.project3(0, 0, 1);
    const [, ,] = c.project3(1, 0, 0);
    // a unit step up z at elevation 25 is cos(25) tall on screen
    const zLen = Math.hypot(zx - ox, zy - oy);
    const c2 = spaceCoords3(D, D, D, 400, 300, 125, 25);
    const [o2x, o2y] = c2.project3(0, 0, 0);
    const [z2x, z2y] = c2.project3(0, 0, 1);
    near(zLen, Math.hypot(z2x - o2x, z2y - o2y));
  });

  it('reports depth so faces can be painted back to front', () => {
    const c = cx();
    const near0 = c.project3(1, 1, 1)[2];
    const far = c.project3(-1, -1, -1)[2];
    expect(near0).toBeGreaterThan(far);
  });

  it('moves a point on screen when the camera turns', () => {
    const a = spaceCoords3(D, D, D, 400, 300, 0, 25).project3(1, 0, 0);
    const b = spaceCoords3(D, D, D, 400, 300, 90, 25).project3(1, 0, 0);
    expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(1);
  });

  it('survives a degenerate domain instead of dividing by zero', () => {
    const c = spaceCoords3([0, 0], [0, 0], [0, 0], 400, 300, 35, 25);
    expect(c.project3(0, 0, 0).every(Number.isFinite)).toBe(true);
  });
});

describe('projection determinism', () => {
  // Math.sin/cos are only specified to within an ulp, so node and the browser
  // disagree in the last digits. unrounded output reaches the dom as an
  // attribute and react reports it as a hydration mismatch.
  it('rounds screen coordinates so ssr and the browser agree', () => {
    const c = spaceCoords3(D, D, D, 400, 300, 37, 23);
    for (const p of [
      [1, 1, 1],
      [-0.37, 0.81, 0.5],
      [0.123456, -0.98765, 0.4242],
    ] as [number, number, number][]) {
      const [px, py, d] = c.project3(...p);
      expect(px).toBe(Math.round(px * 1e3) / 1e3);
      expect(py).toBe(Math.round(py * 1e3) / 1e3);
      expect(d).toBe(Math.round(d * 1e6) / 1e6);
    }
  });

  it('keeps enough precision to be visually exact', () => {
    const c = spaceCoords3(D, D, D, 400, 300, 37, 23);
    const [ax] = c.project3(0, 0, 0);
    const [bx] = c.project3(0.001, 0, 0);
    expect(Math.abs(ax - bx)).toBeLessThan(1);
  });
});
