export const PLOT_PAD = 16;

export function toDataCoords(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  xDomain: [number, number],
  yDomain: [number, number],
  pad = 0
): [number, number] {
  const rect = svg.getBoundingClientRect();
  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;
  const dataX = xMin + ((clientX - rect.left - pad) / (rect.width - 2 * pad)) * (xMax - xMin);
  const dataY = yMax - ((clientY - rect.top - pad) / (rect.height - 2 * pad)) * (yMax - yMin);
  return [dataX, dataY];
}
