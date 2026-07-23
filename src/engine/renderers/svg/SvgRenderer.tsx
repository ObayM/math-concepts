'use client';
import React, { useRef, useState, useEffect } from 'react';
import { useScene } from '@/engine/runtime/SceneProvider';
import { evalNumber, evalBool } from '@/engine/runtime/eval';
import { applyDrag, type Draggable } from '@/engine/runtime/drag';
import { expandObjects } from '@/engine/runtime/expand';
import { svgPrimitives } from './registry';
import { resolveColor, GRID_LINE, AXIS_LINE, AXIS_LABEL, LABEL_HALO } from '@/engine/colors';
import { toDataCoords, PLOT_PAD } from './coords';
import InputLayer, { type InputLayerConfig } from './InputLayer';
import type { SceneIR } from '@/engine/ir/types';
import type { CoordSystem } from './types';

const DEFAULT_W = 640; // used until the container is measured (also SSR)
const ASPECT = 0.6; // height / width — comfortable landscape default

export default function SvgRenderer({
  ir,
  onTap,
  marker,
  revealed,
  inputLayer,
}: {
  ir: SceneIR;
  onTap?: (x: number, y: number) => void;
  marker?: { x: number; y: number; correct?: boolean };
  revealed?: boolean;
  inputLayer?: InputLayerConfig;
}) {
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
  const H = Math.min(Math.round(W * ASPECT), 460);

  if (!ir.space.yDomain) return null; // plane scenes must have yDomain
  const [xMin, xMax] = ir.space.xDomain;
  const [yMin, yMax] = ir.space.yDomain;

  const cx: CoordSystem = {
    toX: (x) => PLOT_PAD + ((x - xMin) / (xMax - xMin)) * (W - 2 * PLOT_PAD),
    toY: (y) => H - PLOT_PAD - ((y - yMin) / (yMax - yMin)) * (H - 2 * PLOT_PAD),
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
      const [dataX, dataY] = toDataCoords(
        svg,
        ev.clientX,
        ev.clientY,
        [xMin, xMax],
        [yMin, yMax],
        PLOT_PAD
      );
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

  const handleTap = (e: React.PointerEvent<SVGRectElement>) => {
    const svg = svgRef.current;
    if (!svg || !onTap) return;
    const [dataX, dataY] = toDataCoords(
      svg,
      e.clientX,
      e.clientY,
      [xMin, xMax],
      [yMin, yMax],
      PLOT_PAD
    );
    onTap(dataX, dataY);
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
    const sx = niceStep(xMax - xMin, clamp(Math.floor(W / 120), 3, 8));
    const sy = niceStep(yMax - yMin, clamp(Math.floor(H / 90), 2, 6));
    const axisXpx = cx.toX(clamp(0, xMin, xMax));
    const axisYpx = cx.toY(clamp(0, yMin, yMax));
    const xLabelY = axisYpx <= H - PLOT_PAD - 22 ? axisYpx + 17 : axisYpx - 10;
    const yLabelRight = axisXpx <= PLOT_PAD + 22;
    const yLabelX = yLabelRight ? axisXpx + 9 : axisXpx - 9;
    const yLabelAnchor = yLabelRight ? 'start' : 'end';
    for (let t = Math.ceil(xMin / sx) * sx, k = 0; t <= xMax + 1e-9; t += sx, k++) {
      const X = cx.toX(t);
      grid.push(
        <line key={`gx${k}`} x1={X} y1={PLOT_PAD} x2={X} y2={H - PLOT_PAD} stroke={GRID_LINE} />
      );
      if (Math.abs(t) > 1e-9)
        ticks.push(
          <text
            key={`tx${k}`}
            x={X}
            y={xLabelY}
            textAnchor="middle"
            fontSize={13}
            fill={AXIS_LABEL}
            stroke={LABEL_HALO}
            strokeWidth={3}
            paintOrder="stroke"
            style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-nunito)' }}
          >
            {fmt(t)}
          </text>
        );
    }
    for (let t = Math.ceil(yMin / sy) * sy, k = 0; t <= yMax + 1e-9; t += sy, k++) {
      const Y = cx.toY(t);
      grid.push(
        <line key={`gy${k}`} x1={PLOT_PAD} y1={Y} x2={W - PLOT_PAD} y2={Y} stroke={GRID_LINE} />
      );
      if (Math.abs(t) > 1e-9)
        ticks.push(
          <text
            key={`ty${k}`}
            x={yLabelX}
            y={Y}
            textAnchor={yLabelAnchor}
            dominantBaseline="central"
            fontSize={13}
            fill={AXIS_LABEL}
            stroke={LABEL_HALO}
            strokeWidth={3}
            paintOrder="stroke"
            style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-nunito)' }}
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
          y1={PLOT_PAD}
          x2={cx.toX(0)}
          y2={H - PLOT_PAD}
          stroke={AXIS_LINE}
          strokeWidth={1.5}
        />
      );
    if (yMin <= 0 && yMax >= 0)
      axes.push(
        <line
          key="ax"
          x1={PLOT_PAD}
          y1={cx.toY(0)}
          x2={W - PLOT_PAD}
          y2={cx.toY(0)}
          stroke={AXIS_LINE}
          strokeWidth={1.5}
        />
      );
  }

  return (
    <div
      ref={wrapRef}
      className="w-full bg-white rounded-2xl border border-neutral-100 card-soft overflow-hidden"
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
        {onTap && (
          <rect
            x={0}
            y={0}
            width={W}
            height={H}
            fill="transparent"
            style={{ cursor: 'crosshair' }}
            onPointerDown={handleTap}
          />
        )}
        {objects.map((obj, i) => {
          if (obj.phase === 'reveal' && !revealed) return null;
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
        {marker && (
          <g pointerEvents="none">
            <circle
              cx={cx.toX(marker.x)}
              cy={cx.toY(marker.y)}
              r={13}
              fill={resolveColor(
                marker.correct == null ? 'primary' : marker.correct ? 'success' : 'danger'
              )}
              opacity={0.16}
            />
            <circle
              cx={cx.toX(marker.x)}
              cy={cx.toY(marker.y)}
              r={7}
              fill={resolveColor(
                marker.correct == null ? 'primary' : marker.correct ? 'success' : 'danger'
              )}
              stroke={LABEL_HALO}
              strokeWidth={2.5}
            />
          </g>
        )}
        {inputLayer && <InputLayer cx={cx} svgRef={svgRef} {...inputLayer} />}
      </svg>
    </div>
  );
}
