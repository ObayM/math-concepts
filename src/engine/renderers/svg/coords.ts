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

  const box = svg.viewBox?.baseVal;
  const padX = box?.width ? (pad * rect.width) / box.width : pad;
  const padY = box?.height ? (pad * rect.height) / box.height : pad;
  const dataX = xMin + ((clientX - rect.left - padX) / (rect.width - 2 * padX)) * (xMax - xMin);
  const dataY = yMax - ((clientY - rect.top - padY) / (rect.height - 2 * padY)) * (yMax - yMin);
  return [dataX, dataY];
}
