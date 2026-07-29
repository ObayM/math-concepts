'use client';
import { resolveColor, LABEL_HALO } from '@/engine/colors';
import type { CoordSystem } from './types';

export default function KeyboardCrosshair({ cx, x, y }: { cx: CoordSystem; x: number; y: number }) {
  const px = cx.toX(x);
  const py = cx.toY(y);
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
  const color = resolveColor('primary');

  return (
    <g pointerEvents="none">
      <line x1={px - 14} y1={py} x2={px + 14} y2={py} stroke={LABEL_HALO} strokeWidth={4} />
      <line x1={px} y1={py - 14} x2={px} y2={py + 14} stroke={LABEL_HALO} strokeWidth={4} />
      <line x1={px - 14} y1={py} x2={px + 14} y2={py} stroke={color} strokeWidth={2} />
      <line x1={px} y1={py - 14} x2={px} y2={py + 14} stroke={color} strokeWidth={2} />
      <circle cx={px} cy={py} r={5} fill="none" stroke={color} strokeWidth={2} />
    </g>
  );
}
