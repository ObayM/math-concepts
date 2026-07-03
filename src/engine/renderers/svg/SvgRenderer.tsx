'use client';
import React, { useRef, useState, useEffect } from 'react';
import { useScene } from '@/engine/runtime/SceneProvider';
import { evalNumber, evalBool } from '@/engine/runtime/eval';
import { applyDrag, type Draggable } from '@/engine/runtime/drag';
import { expandObjects } from '@/engine/runtime/expand';
import { svgPrimitives } from './registry';
import type { SceneIR } from '@/engine/ir/types';
import type { CoordSystem } from './types';

const DEFAULT_W = 640; // used until the container is measured (also SSR)
const ASPECT = 0.6; // height / width — comfortable landscape default

export default function SvgRenderer({ ir }: { ir: SceneIR }) {
  const { scope, set } = useScene();
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // measure the container so W/H are real pixels — text and touch targets stay
  // physically sized on any screen instead of scaling with a fixed viewBox
  const [measuredW, setMeasuredW] = useState<number | null>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setMeasuredW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = Math.max(240, Math.round(measuredW ?? DEFAULT_W));
  const H = Math.round(W * ASPECT);

  if (!ir.space.yDomain) return null; // plane scenes must have yDomain
  const [xMin, xMax] = ir.space.xDomain;
  const [yMin, yMax] = ir.space.yDomain;

  const cx: CoordSystem = {
    toX: (x) => ((x - xMin) / (xMax - xMin)) * W,
    toY: (y) => H - ((y - yMin) / (yMax - yMin)) * H,
    W,
    H,
    xDomain: ir.space.xDomain,
    yDomain: ir.space.yDomain,
  };

  const objects = expandObjects(ir.objects, scope);

  // grab point positions so a "line through: <id>" can latch onto them
  const points: Record<string, { x: number; y: number }> = {};
  for (const o of objects) {
    if (o.type === 'point') points[o.id] = { x: evalNumber(o.x, scope), y: evalNumber(o.y, scope) };
  }

  const startDrag = (obj: { draggable?: Draggable }) => (e: React.PointerEvent) => {
    if (!obj.draggable) return;
    e.preventDefault();
    const draggable = obj.draggable;
    const move = (ev: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dataX = xMin + ((ev.clientX - rect.left) / rect.width) * (xMax - xMin);
      const dataY = yMax - ((ev.clientY - rect.top) / rect.height) * (yMax - yMin);
      const patch = applyDrag(draggable, dataX, dataY, ir, scope);
      for (const key in patch) set(key, patch[key]);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // pick a "nice" tick spacing (1/2/5 × 10^k) so grid + numbers aren't cramped
  const niceStep = (range: number, target: number) => {
    const raw = range / target;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / pow;
    return (n >= 5 ? 5 : n >= 2 ? 2 : 1) * pow;
  };
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const fmt = (v: number) => String(Math.round(v * 1000) / 1000);

  const grid: React.ReactNode[] = [];
  const ticks: React.ReactNode[] = [];
  if (ir.space.grid) {
    // fewer ticks on narrow screens so labels never crowd
    const sx = niceStep(xMax - xMin, clamp(Math.floor(W / 70), 4, 12));
    const sy = niceStep(yMax - yMin, clamp(Math.floor(H / 50), 3, 10));
    const axisXpx = cx.toX(clamp(0, xMin, xMax));
    const axisYpx = cx.toY(clamp(0, yMin, yMax));
    for (let t = Math.ceil(xMin / sx) * sx, k = 0; t <= xMax + 1e-9; t += sx, k++) {
      const X = cx.toX(t);
      grid.push(<line key={`gx${k}`} x1={X} y1={0} x2={X} y2={H} stroke="#eef2f7" />);
      if (Math.abs(t) > 1e-9)
        ticks.push(
          <text
            key={`tx${k}`}
            x={X}
            y={axisYpx + 14}
            textAnchor="middle"
            fontSize={11}
            fill="#94a3b8"
            stroke="white"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {fmt(t)}
          </text>
        );
    }
    for (let t = Math.ceil(yMin / sy) * sy, k = 0; t <= yMax + 1e-9; t += sy, k++) {
      const Y = cx.toY(t);
      grid.push(<line key={`gy${k}`} x1={0} y1={Y} x2={W} y2={Y} stroke="#eef2f7" />);
      if (Math.abs(t) > 1e-9)
        ticks.push(
          <text
            key={`ty${k}`}
            x={axisXpx - 7}
            y={Y + 4}
            textAnchor="end"
            fontSize={11}
            fill="#94a3b8"
            stroke="white"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {fmt(t)}
          </text>
        );
    }
  }

  const axes: React.ReactNode[] = [];
  if (ir.space.axes !== false) {
    if (xMin <= 0 && xMax >= 0)
      axes.push(
        <line
          key="ay"
          x1={cx.toX(0)}
          y1={0}
          x2={cx.toX(0)}
          y2={H}
          stroke="#cbd5e1"
          strokeWidth={1.5}
        />
      );
    if (yMin <= 0 && yMax >= 0)
      axes.push(
        <line
          key="ax"
          x1={0}
          y1={cx.toY(0)}
          x2={W}
          y2={cx.toY(0)}
          stroke="#cbd5e1"
          strokeWidth={1.5}
        />
      );
  }

  return (
    <div
      ref={wrapRef}
      className="w-full bg-white rounded-2xl border border-neutral-100 overflow-hidden"
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        style={{ touchAction: 'none' }}
      >
        {grid}
        {axes}
        {ticks}
        {objects.map((obj, i) => {
          if (obj.visibleIf && !evalBool(obj.visibleIf, scope)) return null;
          const Prim = svgPrimitives[obj.type];
          if (!Prim) return null;
          return (
            <Prim
              key={obj.id || i}
              obj={obj}
              scope={scope}
              cx={cx}
              points={points}
              startDrag={startDrag}
            />
          );
        })}
      </svg>
    </div>
  );
}
