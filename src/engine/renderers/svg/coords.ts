import type { CoordSystem } from './types';

export const PLOT_PAD = 16;

export function planeCoords(
  xDomain: [number, number],
  yDomain: [number, number],
  W: number,
  H: number,
  aspect?: 'equal'
): CoordSystem {
  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;
  const innerW = W - 2 * PLOT_PAD;
  const innerH = H - 2 * PLOT_PAD;
  const equal = aspect === 'equal';
  const sx = equal
    ? Math.min(innerW / (xMax - xMin), innerH / (yMax - yMin))
    : innerW / (xMax - xMin);
  const sy = equal ? sx : innerH / (yMax - yMin);
  const padX = PLOT_PAD + (innerW - sx * (xMax - xMin)) / 2;
  const padY = PLOT_PAD + (innerH - sy * (yMax - yMin)) / 2;

  return {
    toX: (x) => padX + (x - xMin) * sx,
    toY: (y) => H - padY - (y - yMin) * sy,
    fromX: (px) => xMin + (px - padX) / sx,
    fromY: (py) => yMin + (H - padY - py) / sy,
    W,
    H,
    xDomain,
    yDomain,
  };
}

export function toDataCoords(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  cx: CoordSystem
): [number, number] {
  const rect = svg.getBoundingClientRect();
  const box = svg.viewBox?.baseVal;
  const sx = box?.width && rect.width ? box.width / rect.width : 1;
  const sy = box?.height && rect.height ? box.height / rect.height : 1;
  return [cx.fromX((clientX - rect.left) * sx), cx.fromY((clientY - rect.top) * sy)];
}
