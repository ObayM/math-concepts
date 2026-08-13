export const GRID = 1000;

export const toGrid = (px, py, width) => [
  Math.round((px / width) * GRID),
  Math.round((py / width) * GRID),
];

export const fromGrid = (gx, gy, width) => [(gx * width) / GRID, (gy * width) / GRID];

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function strokeHit(stroke, gx, gy, radius) {
  const pts = stroke.points;
  if (pts.length === 1) return Math.hypot(gx - pts[0][0], gy - pts[0][1]) <= radius;

  for (let i = 1; i < pts.length; i++) {
    if (distToSegment(gx, gy, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) <= radius) {
      return true;
    }
  }
  return false;
}

export const eraseAt = (strokes, gx, gy, radius) =>
  strokes.filter((s) => !strokeHit(s, gx, gy, radius));

export const countPoints = (strokes) => strokes.reduce((n, s) => n + s.points.length, 0);

export function drawStrokes(ctx, strokes, width, { color, lineWidth }) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  for (const stroke of strokes) {
    const pts = stroke.points;
    ctx.beginPath();
    if (pts.length === 1) {
      const [x, y] = fromGrid(pts[0][0], pts[0][1], width);
      ctx.arc(x, y, lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      continue;
    }
    pts.forEach(([gx, gy], i) => {
      const [x, y] = fromGrid(gx, gy, width);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}
