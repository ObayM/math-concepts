import { PLOT_PAD } from './coords';
import type { Coord3 } from './types';

const RAD = Math.PI / 180;

// Math.sin/cos are only implementation-defined to within an ulp, so node and the
// browser disagree in the last two digits and react calls that a hydration
// mismatch. svg has no use for sub-milli-pixel precision anyway.
const round = (v: number, dp: number) => {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};

// orthographic turntable camera: azimuth spins around the world z axis,
// elevation lifts the eye above the xy plane. no perspective on purpose, a
// textbook diagram of a solid is drawn axonometrically.
export function cameraBasis(azimuthDeg: number, elevationDeg: number) {
  const a = azimuthDeg * RAD;
  const e = elevationDeg * RAD;
  const sa = Math.sin(a);
  const ca = Math.cos(a);
  const se = Math.sin(e);
  const ce = Math.cos(e);
  return {
    right: [-sa, ca, 0] as const,
    up: [-ca * se, -sa * se, ce] as const,
    view: [ca * ce, sa * ce, se] as const,
  };
}

export function spaceCoords3(
  xDomain: [number, number],
  yDomain: [number, number],
  zDomain: [number, number],
  W: number,
  H: number,
  azimuthDeg: number,
  elevationDeg: number
): Coord3 {
  const { right, up, view } = cameraBasis(azimuthDeg, elevationDeg);

  const flat = (x: number, y: number, z: number) =>
    [
      x * right[0] + y * right[1] + z * right[2],
      x * up[0] + y * up[1] + z * up[2],
      x * view[0] + y * view[1] + z * view[2],
    ] as [number, number, number];

  // fit the whole bounding box at this camera angle, so spinning never clips
  let uMin = Infinity;
  let uMax = -Infinity;
  let vMin = Infinity;
  let vMax = -Infinity;
  for (const x of xDomain) {
    for (const y of yDomain) {
      for (const z of zDomain) {
        const [u, v] = flat(x, y, z);
        if (u < uMin) uMin = u;
        if (u > uMax) uMax = u;
        if (v < vMin) vMin = v;
        if (v > vMax) vMax = v;
      }
    }
  }

  const innerW = W - 2 * PLOT_PAD;
  const innerH = H - 2 * PLOT_PAD;
  const spanU = uMax - uMin || 1;
  const spanV = vMax - vMin || 1;
  // one scale for both axes: a cube has to look like a cube
  const s = Math.min(innerW / spanU, innerH / spanV);
  const padX = PLOT_PAD + (innerW - s * spanU) / 2;
  const padY = PLOT_PAD + (innerH - s * spanV) / 2;

  const project3 = (x: number, y: number, z: number): [number, number, number] => {
    const [u, v, d] = flat(x, y, z);
    // depth is rounded too, so the painter's sort cannot order faces one way on
    // the server and the other way in the browser
    return [round(padX + (u - uMin) * s, 3), round(H - padY - (v - vMin) * s, 3), round(d, 6)];
  };

  return {
    project3,
    // the 2d fallbacks read the z = 0 plane, which is what a tap or a marker means here
    toX: (x) => project3(x, 0, 0)[0],
    toY: (y) => project3(0, y, 0)[1],
    fromX: (px) => px,
    fromY: (py) => py,
    W,
    H,
    xDomain,
    yDomain,
    zDomain,
  };
}
