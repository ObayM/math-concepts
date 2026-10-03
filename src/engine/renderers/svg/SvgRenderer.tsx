'use client';
import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { useScene, type Attention } from '@/engine/runtime/SceneProvider';
import { evalNumber, evalBool, alphaOf, drawOf } from '@/engine/runtime/eval';
import { applyDrag, type Draggable } from '@/engine/runtime/drag';
import { expandObjects } from '@/engine/runtime/expand';
import { ROLE_EVENT } from '@/engine/runtime/roleEvent';
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
import { toDataCoords, planeCoords, PLOT_PAD } from './coords';
import {
  centerCursor,
  moveCursor,
  isCommitKey,
  type Cursor,
} from '@/engine/runtime/keyboardCursor';
import InputLayer, { type InputLayerConfig } from './InputLayer';
import KeyboardCrosshair from './KeyboardCrosshair';
import type { SceneIR, Scope } from '@/engine/ir/types';
import type { CoordSystem } from './types';
import { useSceneText } from '@/engine/artex/context';

const DEFAULT_W = 640;
const ASPECT = 0.6;
const MAX_H = 460;
const MIN_H = 220;

const ABS_MIN_H = 150;
const VIEWPORT_SHARE = 0.42;

const DEFAULT_TAP_LABEL =
  'Tap the diagram to answer, or use the arrow keys to move the crosshair and Enter to drop it. Hold shift to move faster.';

export default function SvgRenderer({
  ir,
  onTap,
  marker,
  revealed,
  inputLayer,
  tapLabel = DEFAULT_TAP_LABEL,
}: {
  ir: SceneIR;
  onTap?: (x: number, y: number) => void;
  marker?: { x: number; y: number; correct?: boolean };
  revealed?: boolean;
  inputLayer?: InputLayerConfig;
  tapLabel?: string;
}) {
  const { scope, set, attention, traces } = useScene();
  const sceneText = useSceneText();
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);
  useEffect(() => {
    const onRole = (e: Event) => setHoveredRole((e as CustomEvent<string | null>).detail);
    document.addEventListener(ROLE_EVENT, onRole);
    return () => document.removeEventListener(ROLE_EVENT, onRole);
  }, []);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

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
  const xDomain = liveDomain(ir.space.xView, ir.space.xDomain, scope);
  const yDomain = liveDomain(ir.space.yView, ir.space.yDomain, scope);
  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;

  const cx: CoordSystem = planeCoords(xDomain, yDomain, W, H, ir.space.aspect);

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
      const [dataX, dataY] = toDataCoords(svg, ev.clientX, ev.clientY, cx);
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

  const keyDrag = (obj: SceneObjectLike) => (e: React.KeyboardEvent) => {
    const d = obj.draggable;
    const dir = ARROWS[e.key];
    if (!d || !dir) return;
    e.preventDefault();
    const fast = e.shiftKey ? 5 : 1;
    if (d.along) {
      const ref = ir.objects.find((o) => o.id === d.along!.ref);
      const cur = Number(scope[d.bind] ?? 0);
      const sign = dir[0] || dir[1];
      if (ref?.type === 'circle') {
        const a = cur + (Math.PI / 36) * fast * sign;
        set(d.bind, ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI);
      } else {
        set(d.bind, Math.max(0, Math.min(1, cur + 0.05 * fast * sign)));
      }
      return;
    }
    const [sx, sy] = keySteps(d.snap, [xMin, xMax], [yMin, yMax]);
    const px = evalNumber(obj.x as never, scope);
    const py = evalNumber(obj.y as never, scope);
    const patch = applyDrag(d, px + dir[0] * sx * fast, py + dir[1] * sy * fast, ir, scope);
    for (const key in patch) set(key, patch[key]);
  };

  const handleTap = (e: React.PointerEvent<SVGRectElement>) => {
    const svg = svgRef.current;
    if (!svg || !onTap) return;
    const [dataX, dataY] = toDataCoords(svg, e.clientX, e.clientY, cx);
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
  const fmt = (v: number, step: number) =>
    String(Number(v.toFixed(Math.min(12, Math.max(0, -Math.floor(Math.log10(step)) + 1)))));

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
      if (Math.abs(t) > sx * 1e-6)
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
            {sceneText(fmt(t, sx))}
          </text>
        );
    }
    for (let t = Math.ceil(yMin / sy) * sy, k = 0; t <= yMax + 1e-9; t += sy, k++) {
      const Y = cx.toY(t);
      grid.push(
        <line key={`gy${k}`} x1={PLOT_PAD} y1={Y} x2={W - PLOT_PAD} y2={Y} stroke={GRID_LINE} />
      );
      if (Math.abs(t) > sy * 1e-6)
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
            {sceneText(fmt(t, sy))}
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
      className="w-full bg-card rounded-2xl border border-neutral-100 card-soft overflow-hidden"
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role={ir.space.alt ? 'group' : undefined}
        aria-label={ir.space.alt}
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
            aria-label={tapLabel}
            onPointerDown={handleTap}
            onKeyDown={handleTapKey}
          />
        )}
        {Object.entries(traces).map(([id, path]) => {
          const owner = objects.find((o) => o.id === id);
          if (!owner || path.length < 2) return null;
          return (
            <polyline
              key={`trace-${id}`}
              points={path.map(([x, y]) => `${cx.toX(x)},${cx.toY(y)}`).join(' ')}
              fill="none"
              stroke={resolveColor(owner.color)}
              strokeOpacity={0.45}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents="none"
            />
          );
        })}
        {objects.flatMap((obj) => {
          const ghost = obj.ghost;
          if (!ghost || (obj.phase === 'reveal' && !revealed)) return [];
          const Prim = svgPrimitives[obj.type];
          if (!Prim) return [];
          const { draggable: _drag, ...still } = obj as typeof obj & { draggable?: unknown };
          return ghost.values.map((v: number) => (
            <g key={`ghost-${obj.id}-${v}`} opacity={0.28} pointerEvents="none">
              <Prim
                obj={still}
                scope={{ ...scope, [ghost.param]: v }}
                cx={cx}
                points={points}
                startDrag={startDrag}
              />
            </g>
          ));
        })}
        {objects.map((obj, i) => {
          if (obj.phase === 'reveal' && !revealed) return null;
          if (obj.visibleIf && !evalBool(obj.visibleIf, scope)) return null;
          const Prim = svgPrimitives[obj.type];
          if (!Prim) return null;
          const alpha = alphaOf(obj, scope);
          if (alpha !== null && alpha < 0.01) return null;
          if (obj.draw !== undefined && drawOf(obj, scope) <= 0) return null;
          return (
            <g
              key={obj.id || i}
              className="scene-obj"
              data-obj={obj.id}
              data-attention={attentionOf(obj, attention, hoveredRole)}
              opacity={alpha === null || alpha > 0.99 ? undefined : alpha}
            >
              <Prim
                obj={obj}
                scope={scope}
                cx={cx}
                points={points}
                startDrag={startDrag}
                keyDrag={keyDrag}
              />
            </g>
          );
        })}
        {attention.surround?.map((id) => (
          <Surround key={`surround-${id}`} id={id} svgRef={svgRef} scope={scope} />
        ))}
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

function liveDomain(
  view: [unknown, unknown] | undefined,
  fallback: [number, number],
  scope: Scope
): [number, number] {
  if (!view) return fallback;
  const lo = evalNumber(view[0] as never, scope);
  const hi = evalNumber(view[1] as never, scope);
  return Number.isFinite(lo) && Number.isFinite(hi) && hi > lo ? [lo, hi] : fallback;
}

const baseId = (id: string | undefined) => (id ?? '').split('#')[0];

function attentionOf(
  obj: { id?: string; role?: string },
  attention: Attention,
  hoveredRole: string | null
): 'indicate' | 'dim' | undefined {
  const id = baseId(obj.id);
  if (hoveredRole && obj.role === hoveredRole) return 'indicate';
  if (attention.indicate?.includes(id)) return 'indicate';
  if (attention.focus?.length && !attention.focus.includes(id)) return 'dim';
  return undefined;
}

function Surround({
  id,
  svgRef,
  scope,
}: {
  id: string;
  svgRef: React.RefObject<SVGSVGElement | null>;
  scope: Scope;
}) {
  const ref = useRef<SVGRectElement>(null);
  useLayoutEffect(() => {
    const rect = ref.current;
    const target = svgRef.current?.querySelector<SVGGraphicsElement>(
      `[data-obj="${CSS.escape(id)}"]`
    );
    if (!rect || !target || typeof target.getBBox !== 'function') return;
    const b = target.getBBox();
    const pad = 8;
    rect.setAttribute('x', String(b.x - pad));
    rect.setAttribute('y', String(b.y - pad));
    rect.setAttribute('width', String(b.width + 2 * pad));
    rect.setAttribute('height', String(b.height + 2 * pad));
  }, [id, svgRef, scope]);
  return (
    <rect
      ref={ref}
      rx={10}
      fill="none"
      stroke={resolveColor('warning')}
      strokeWidth={2.5}
      strokeDasharray="6 5"
      pointerEvents="none"
      className="animate-pop-in"
    />
  );
}

type SceneObjectLike = { x?: unknown; y?: unknown; draggable?: Draggable };

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

function keySteps(
  snap: Draggable['snap'],
  xDomain: [number, number],
  yDomain: [number, number]
): [number, number] {
  if (snap === 'grid') return [1, 1];
  if (Array.isArray(snap)) return [snap[0], snap[1]];
  if (typeof snap === 'number') return [snap, snap];
  return [(xDomain[1] - xDomain[0]) / 40, (yDomain[1] - yDomain[0]) / 40];
}
