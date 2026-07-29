export type Domain = readonly [number, number];
export type Cursor = { x: number; y: number };

const STEPS = 40;
const FAST = 5;

const clamp = (v: number, [lo, hi]: Domain) => Math.min(hi, Math.max(lo, v));
const tidy = (v: number) => Math.round(v * 1e6) / 1e6;

export function centerCursor(xDomain: Domain, yDomain: Domain): Cursor {
  return {
    x: tidy((xDomain[0] + xDomain[1]) / 2),
    y: tidy((yDomain[0] + yDomain[1]) / 2),
  };
}

export function moveCursor(
  cursor: Cursor,
  key: string,
  xDomain: Domain,
  yDomain: Domain,
  fast = false
): Cursor | null {
  const scale = fast ? FAST : 1;
  const dx = ((xDomain[1] - xDomain[0]) / STEPS) * scale;
  const dy = ((yDomain[1] - yDomain[0]) / STEPS) * scale;

  let { x, y } = cursor;
  if (key === 'ArrowLeft') x -= dx;
  else if (key === 'ArrowRight') x += dx;
  else if (key === 'ArrowUp') y += dy;
  else if (key === 'ArrowDown') y -= dy;
  else return null;

  return { x: tidy(clamp(x, xDomain)), y: tidy(clamp(y, yDomain)) };
}

export function isCommitKey(key: string): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar';
}
