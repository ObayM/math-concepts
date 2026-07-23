'use client';
import React, { useRef, useState } from 'react';
import { toDataCoords, PLOT_PAD } from './coords';
import { simplify } from '@/engine/runtime/rdp';
import { resolveColor } from '@/engine/colors';
import type { Pt } from '@/engine/checks/geometry';
import type { CoordSystem } from './types';

export type SketchMode = 'curve' | 'points' | 'line';

export interface InputLayerConfig {
  mode: SketchMode;
  value: Pt[] | null;
  onChange: (points: Pt[]) => void;
  disabled?: boolean;
  maxPoints?: number;
}

const SAMPLE_PX = 3;

export default function InputLayer({
  cx,
  svgRef,
  mode,
  value,
  onChange,
  disabled,
  maxPoints = Infinity,
}: InputLayerConfig & { cx: CoordSystem; svgRef: React.RefObject<SVGSVGElement | null> }) {
  const draftRef = useRef<Pt[]>([]);
  const lastScreenRef = useRef<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<Pt[]>([]);

  const getPoint = (clientX: number, clientY: number): Pt => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    return toDataCoords(svg, clientX, clientY, cx.xDomain, cx.yDomain, PLOT_PAD);
  };

  const handleDown = (e: React.PointerEvent<SVGRectElement>) => {
    e.preventDefault();
    const p = getPoint(e.clientX, e.clientY);

    if (mode === 'points') {
      const next = [...(value ?? [])];
      if (next.length < maxPoints) next.push(p);
      onChange(next);
      return;
    }

    draftRef.current = [p];
    lastScreenRef.current = { x: e.clientX, y: e.clientY };
    setDraft([p]);

    const move = (ev: PointerEvent) => {
      const last = lastScreenRef.current;
      if (last && Math.hypot(ev.clientX - last.x, ev.clientY - last.y) < SAMPLE_PX) return;
      lastScreenRef.current = { x: ev.clientX, y: ev.clientY };
      const q = getPoint(ev.clientX, ev.clientY);

      if (mode === 'line') {
        draftRef.current = [draftRef.current[0], q];
      } else {
        const prev = draftRef.current[draftRef.current.length - 1];
        if (q[0] <= prev[0]) return;
        draftRef.current = [...draftRef.current, q];
      }
      setDraft(draftRef.current);
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const raw = draftRef.current;
      draftRef.current = [];
      setDraft([]);
      if (raw.length < 2) return;
      const eps = (cx.xDomain[1] - cx.xDomain[0]) * 0.004;
      onChange(mode === 'curve' ? simplify(raw, eps) : raw);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const shown = draft.length ? draft : (value ?? []);
  const color = resolveColor('primary');

  return (
    <>
      {!disabled && (
        <rect
          x={0}
          y={0}
          width={cx.W}
          height={cx.H}
          fill="transparent"
          style={{ cursor: mode === 'points' ? 'pointer' : 'crosshair' }}
          onPointerDown={handleDown}
        />
      )}
      {mode === 'points'
        ? shown.map(([x, y], i) => (
            <circle
              key={i}
              cx={cx.toX(x)}
              cy={cx.toY(y)}
              r={7}
              fill={color}
              stroke="white"
              strokeWidth={2.5}
              pointerEvents="none"
            />
          ))
        : shown.length > 1 && (
            <polyline
              points={shown.map(([x, y]) => `${cx.toX(x)},${cx.toY(y)}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />
          )}
    </>
  );
}
