'use client';
import React, { useRef, useState } from 'react';
import { toDataCoords, PLOT_PAD } from './coords';
import { simplify } from '@/engine/runtime/rdp';
import {
  centerCursor,
  moveCursor,
  isCommitKey,
  type Cursor,
} from '@/engine/runtime/keyboardCursor';
import KeyboardCrosshair from './KeyboardCrosshair';
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

  const [keyCursor, setKeyCursor] = useState<Cursor | null>(null);

  const commit = (p: Cursor) => {
    const current = value ?? [];
    if (mode === 'points' && current.length >= maxPoints) return;
    if (mode === 'curve' && current.length && p.x <= current[current.length - 1][0]) return;
    onChange([...current, [p.x, p.y]]);
  };

  const handleKey = (e: React.KeyboardEvent<SVGRectElement>) => {
    const here = keyCursor ?? centerCursor(cx.xDomain, cx.yDomain);
    if (isCommitKey(e.key)) {
      e.preventDefault();
      setKeyCursor(here);
      commit(here);
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const current = value ?? [];
      if (!current.length) return;
      e.preventDefault();
      onChange(current.slice(0, -1));
      return;
    }
    const next = moveCursor(here, e.key, cx.xDomain, cx.yDomain, e.shiftKey);
    if (!next) return;
    e.preventDefault();
    setKeyCursor(next);
  };

  const shown = draft.length ? draft : (value ?? []);
  const color = resolveColor('primary');
  const keyHelp =
    mode === 'points'
      ? 'Plot points: drag with a pointer, or move the crosshair with the arrow keys and press Enter to drop each point. Backspace removes the last one. Hold shift to move faster.'
      : 'Draw a curve: drag with a pointer, or move the crosshair with the arrow keys and press Enter to drop each point, left to right. Backspace removes the last one. Hold shift to move faster.';

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
          tabIndex={0}
          role="application"
          aria-label={keyHelp}
          onPointerDown={handleDown}
          onKeyDown={handleKey}
        />
      )}
      {keyCursor && !disabled && <KeyboardCrosshair cx={cx} x={keyCursor.x} y={keyCursor.y} />}
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
