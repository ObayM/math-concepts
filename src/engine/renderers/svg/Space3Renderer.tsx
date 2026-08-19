'use client';
import React, { useRef, useState, useEffect } from 'react';
import { useScene } from '@/engine/runtime/SceneProvider';
import { evalNumber, evalBool } from '@/engine/runtime/eval';
import { expandObjects } from '@/engine/runtime/expand';
import { space3Primitives } from './registry3';
import { AXIS_LINE, AXIS_LABEL, LABEL_HALO, AXIS_LABEL_SIZE } from '@/engine/colors';
import { spaceCoords3 } from './coords3';
import type { SceneIR } from '@/engine/ir/types';
import type { Coord3 } from './types';

const DEFAULT_W = 640;
const ASPECT = 0.72;
const MAX_H = 460;
const MIN_H = 240;
const ABS_MIN_H = 170;
const VIEWPORT_SHARE = 0.42;

const DEFAULT_CAMERA: [number, number] = [55, 26];

const round3 = (v: number) => Math.round(v * 1e3) / 1e3;

// world coordinates a 3d object occupies, used only to sort it back to front
function depthOf(obj: Record<string, any>, scope: any, cx: Coord3): number {
  const at = (x: unknown, y: unknown, z: unknown) =>
    cx.project3(
      evalNumber(x as never, scope),
      evalNumber(y as never, scope),
      evalNumber(z as never, scope)
    )[2];
  switch (obj.type) {
    case 'point3':
    case 'label3':
      return at(obj.x, obj.y, obj.z);
    case 'segment3':
      return (at(obj.x1, obj.y1, obj.z1) + at(obj.x2, obj.y2, obj.z2)) / 2;
    case 'plane3':
      return at(obj.through[0], obj.through[1], obj.through[2]);
    case 'polygon3': {
      const ds = obj.points.map((p: unknown[]) => at(p[0], p[1], p[2]));
      return ds.reduce((a: number, b: number) => a + b, 0) / (ds.length || 1);
    }
    default:
      return 0;
  }
}

export default function Space3Renderer({ ir }: { ir: SceneIR }) {
  const { scope } = useScene();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [measuredW, setMeasuredW] = useState<number | null>(null);
  const [roomH, setRoomH] = useState<number | null>(null);

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

  const { xDomain, yDomain, zDomain, camera } = ir.space;
  if (!yDomain || !zDomain) return null;

  const az = camera ? evalNumber(camera[0], scope) : DEFAULT_CAMERA[0];
  const el = camera ? evalNumber(camera[1], scope) : DEFAULT_CAMERA[1];
  const cx = spaceCoords3(
    xDomain,
    yDomain,
    zDomain,
    W,
    H,
    Number.isFinite(az) ? az : DEFAULT_CAMERA[0],
    Number.isFinite(el) ? el : DEFAULT_CAMERA[1]
  );

  const visible = expandObjects(ir.objects as never, scope).filter(
    (o: Record<string, any>) => !o.visibleIf || evalBool(o.visibleIf, scope)
  );
  const painted = visible
    .map((o: Record<string, any>, i: number) => ({ o, i, d: depthOf(o, scope, cx) }))
    .sort((a, b) => a.d - b.d || a.i - b.i);

  return (
    <div
      ref={wrapRef}
      className="w-full bg-white rounded-2xl border border-neutral-100 card-soft overflow-hidden"
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        className="w-full select-none"
        style={{ touchAction: 'none' }}
      >
        {ir.space.axes !== false && <Axes3 cx={cx} />}
        {painted.map(({ o, i }) => {
          const Prim = space3Primitives[o.type];
          if (!Prim) return null;
          return <Prim key={o.id ?? i} obj={o} scope={scope} cx={cx} />;
        })}
      </svg>
    </div>
  );
}

function Axes3({ cx }: { cx: Coord3 }) {
  const axes: { to: [number, number, number]; from: [number, number, number]; name: string }[] = [
    { from: [cx.xDomain[0], 0, 0], to: [cx.xDomain[1], 0, 0], name: 'x' },
    { from: [0, cx.yDomain[0], 0], to: [0, cx.yDomain[1], 0], name: 'y' },
    { from: [0, 0, cx.zDomain[0]], to: [0, 0, cx.zDomain[1]], name: 'z' },
  ];

  return (
    <g>
      {axes.map(({ from, to, name }) => {
        const [ax, ay] = cx.project3(...from);
        const [bx, by] = cx.project3(...to);
        if (![ax, ay, bx, by].every(Number.isFinite)) return null;
        const angle = Math.round(Math.atan2(by - ay, bx - ax) * 1e6) / 1e6;
        const head = 9;
        const spread = Math.PI / 8;
        return (
          <g key={name}>
            <line x1={ax} y1={ay} x2={bx} y2={by} stroke={AXIS_LINE} strokeWidth={1.5} />
            <polygon
              points={[
                `${bx},${by}`,
                `${round3(bx - head * Math.cos(angle - spread))},${round3(by - head * Math.sin(angle - spread))}`,
                `${round3(bx - head * Math.cos(angle + spread))},${round3(by - head * Math.sin(angle + spread))}`,
              ].join(' ')}
              fill={AXIS_LINE}
            />
            <text
              x={Math.round((bx + 12 * Math.cos(angle)) * 1e3) / 1e3}
              y={Math.round((by + 12 * Math.sin(angle) + 4) * 1e3) / 1e3}
              direction="ltr"
              textAnchor="middle"
              fontSize={AXIS_LABEL_SIZE}
              fontWeight={700}
              fill={AXIS_LABEL}
              stroke={LABEL_HALO}
              strokeWidth={3}
              paintOrder="stroke"
            >
              {name}
            </text>
            <Ticks cx={cx} axis={name} />
          </g>
        );
      })}
    </g>
  );
}

// unit marks along each axis: without them a projected axis gives no sense of scale
function Ticks({ cx, axis }: { cx: Coord3; axis: string }) {
  const domain = axis === 'x' ? cx.xDomain : axis === 'y' ? cx.yDomain : cx.zDomain;
  const [lo, hi] = domain;
  const span = hi - lo;
  const stepSize = span > 12 ? 5 : span > 6 ? 2 : 1;
  const marks: number[] = [];
  for (let v = Math.ceil(lo / stepSize) * stepSize; v <= hi + 1e-9; v += stepSize) {
    if (Math.abs(v) > 1e-9) marks.push(v);
  }

  return (
    <g>
      {marks.map((v) => {
        const at: [number, number, number] =
          axis === 'x' ? [v, 0, 0] : axis === 'y' ? [0, v, 0] : [0, 0, v];
        const [px, py] = cx.project3(...at);
        if (![px, py].every(Number.isFinite)) return null;
        return <circle key={v} cx={px} cy={py} r={2} fill={AXIS_LINE} />;
      })}
    </g>
  );
}
