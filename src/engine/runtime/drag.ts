import type { SceneIR, Scope } from '@/engine/ir/types';
import { evalNumber } from './eval';

export type Draggable = {
  axis?: 'x' | 'y' | 'xy';
  bind: string;
  bindY?: string;
  snap?: number | [number, number] | 'grid';
  along?: { ref: string };
};

// pure so drag math is unit-testable without pointer events or the DOM. takes
// the click point in data coords and returns the state patch to apply.
export function applyDrag(
  draggable: Draggable,
  dataX: number,
  dataY: number,
  ir: SceneIR,
  scope: Scope
): Record<string, number> {
  if (draggable.along)
    return applyAlongDrag(draggable.along, draggable.bind, dataX, dataY, ir, scope);

  const [snapX, snapY] = snapSteps(draggable.snap);
  const x = snapX ? snapRound(dataX, snapX) : dataX;
  const y = snapY ? snapRound(dataY, snapY) : dataY;

  const out: Record<string, number> = {};
  if (draggable.axis === 'x' || draggable.axis === 'xy') out[draggable.bind] = x;
  if (draggable.axis === 'y') out[draggable.bind] = y;
  if (draggable.axis === 'xy' && draggable.bindY) out[draggable.bindY] = y;
  return out;
}

function snapRound(v: number, step: number): number {
  return Math.round(v / step) * step;
}

function snapSteps(snap: Draggable['snap']): [number | null, number | null] {
  if (snap == null) return [null, null];
  if (snap === 'grid') return [1, 1];
  if (Array.isArray(snap)) return [snap[0], snap[1]];
  return [snap, snap];
}

// angle-drag on a circle, or 0..1 projection onto a segment. no inverse curve
// projection needed — the dragged point's own position is already an
// expression of this param, so we just need the param, not the point.
function applyAlongDrag(
  along: { ref: string },
  bind: string,
  dataX: number,
  dataY: number,
  ir: SceneIR,
  scope: Scope
): Record<string, number> {
  const ref = ir.objects.find((o) => o.id === along.ref);
  if (!ref) return {};

  if (ref.type === 'circle') {
    const cx = evalNumber(ref.x, scope);
    const cy = evalNumber(ref.y, scope);
    return { [bind]: Math.atan2(dataY - cy, dataX - cx) };
  }

  if (ref.type === 'line' && ref.x1 != null && ref.y1 != null && ref.x2 != null && ref.y2 != null) {
    const x1 = evalNumber(ref.x1, scope);
    const y1 = evalNumber(ref.y1, scope);
    const x2 = evalNumber(ref.x2, scope);
    const y2 = evalNumber(ref.y2, scope);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : ((dataX - x1) * dx + (dataY - y1) * dy) / len2;
    return { [bind]: Math.max(0, Math.min(1, t)) };
  }

  return {};
}
