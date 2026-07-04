export function toDataCoords(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  xDomain: [number, number],
  yDomain: [number, number]
): [number, number] {
  const rect = svg.getBoundingClientRect();
  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;
  const dataX = xMin + ((clientX - rect.left) / rect.width) * (xMax - xMin);
  const dataY = yMax - ((clientY - rect.top) / rect.height) * (yMax - yMin);
  return [dataX, dataY];
}
