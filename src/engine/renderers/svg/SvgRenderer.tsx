'use client';
import React, { useRef, useState, useEffect } from 'react';
import { useScene } from '@/engine/runtime/SceneProvider';
import { evalNumber, evalBool } from '@/engine/runtime/eval';
import { applyDrag, type Draggable } from '@/engine/runtime/drag';
import { expandObjects } from '@/engine/runtime/expand';
import { svgPrimitives } from './registry';
import {
  resolveColor,
  GRID_LINE,
  AXIS_LINE,
  AXIS_LABEL,
  LABEL_HALO,
  AXIS_LABEL_SIZE,
  AXIS_LABEL_WEIGHT,
} from '@/engine/colors';
import { toDataCoords, PLOT_PAD } from './coords';
import {
  centerCursor,
  moveCursor,
  isCommitKey,
  type Cursor,
} from '@/engine/runtime/keyboardCursor';
import InputLayer, { type InputLayerConfig } from './InputLayer';
import KeyboardCrosshair from './KeyboardCrosshair';
import type { SceneIR } from '@/engine/ir/types';
import type { CoordSystem } from './types';

const DEFAULT_W = 640; // used until the container is measured (also SSR)
const ASPECT = 0.6; // height / width — comfortable landscape default
const MAX_H = 460;
const MIN_H = 220;
// a landscape phone is shorter than MIN_H allows for, and the fold guard has to
// win there or the scene buries its own controls
const ABS_MIN_H = 150;
// a scene that eats the whole viewport pushes its own sliders below the fold,
// which is fatal when the prose says "drag the slider"
const VIEWPORT_SHARE = 0.42;

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
  const [roomH, setRoomH] = useState<number | null>(null);
  const [keyCursor, setKeyCursor] = useState<Cursor | null>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setRoomH(Math.round(window.innerHeight * VIEWPORT_SHARE));
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setMeasuredW(w);
      measure();
    });
    ro.observe(el);
    measure();
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const W = Math.max(240, Math.round(measuredW ?? DEFAULT_W));
  const H = Math.max(
    ABS_MIN_H,
    Math.min(Math.max(MIN_H, Math.min(Math.round(W * ASPECT), MAX_H)), roomH ?? MAX_H)
  );

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
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
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
    setKeyCursor(null);
  };

  const handleTapKey = (e: React.KeyboardEvent<SVGRectElement>) => {
    if (!onTap) return;
    const here = keyCursor ?? centerCursor([xMin, xMax], [yMin, yMax]);
    if (isCommitKey(e.key)) {
      e.preventDefault();
      setKeyCursor(here);
      onTap(here.x, here.y);
      return;
    }
    const next = moveCursor(here, e.key, [xMin, xMax], [yMin, yMax], e.shiftKey);
    if (!next) return;
    e.preventDefault();
    setKeyCursor(next);
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
            fontSize={AXIS_LABEL_SIZE}
            fontWeight={AXIS_LABEL_WEIGHT}
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
            fontSize={AXIS_LABEL_SIZE}
            fontWeight={AXIS_LABEL_WEIGHT}
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
          y1={H - PLOT_PAD}
          x2={cx.toX(0)}
          y2={PLOT_PAD}
          stroke={AXIS_LINE}
          strokeWidth={1.5}
          markerEnd="url(#mathly-axis-arrow)"
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
          markerEnd="url(#mathly-axis-arrow)"
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
        className="w-full select-none [&_[role=application]:focus-visible]:outline-2 [&_[role=application]:focus-visible]:outline-offset-[-3px] [&_[role=application]:focus-visible]:outline-primary-500"
        style={{ touchAction: 'none' }}
      >
        <defs>
          <marker
            id="mathly-axis-arrow"
            markerUnits="userSpaceOnUse"
            markerWidth={12}
            markerHeight={12}
            refX={10}
            refY={6}
            orient="auto"
          >
            <polygon points="2,2 10,6 2,10" fill={AXIS_LINE} />
          </marker>
        </defs>
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
            tabIndex={0}
            role="application"
            aria-label="Tap the diagram to answer, or use the arrow keys to move the crosshair and Enter to drop it. Hold shift to move faster."
            onPointerDown={handleTap}
            onKeyDown={handleTapKey}
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
        {keyCursor && !marker && <KeyboardCrosshair cx={cx} x={keyCursor.x} y={keyCursor.y} />}
        {inputLayer && <InputLayer cx={cx} svgRef={svgRef} {...inputLayer} />}
      </svg>
    </div>
  );
}
