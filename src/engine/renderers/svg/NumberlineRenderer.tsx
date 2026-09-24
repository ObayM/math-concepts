'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useScene } from '@/engine/runtime/SceneProvider';
import { evalNumber, evalBool, interpolate, alphaOf } from '@/engine/runtime/eval';
import { expandObjects } from '@/engine/runtime/expand';
import { resolveColor, AXIS_LINE, AXIS_LABEL } from '@/engine/colors';
import type { SceneIR } from '@/engine/ir/types';
import type { CoordSystem } from './types';
import type { InputLayerConfig } from './InputLayer';

const DEFAULT_W = 640;
const H = 120;
const Y_MID = H / 2;

export default function NumberlineRenderer({
  ir,
  revealed,
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

  if (!ir.space.xDomain) return null;
  const [xMin, xMax] = ir.space.xDomain;

  const cx: CoordSystem = {
    toX: (x) => ((x - xMin) / (xMax - xMin)) * W,
    toY: () => Y_MID,
    fromX: (px) => xMin + (px / W) * (xMax - xMin),
    fromY: () => 0,
    W,
    H,
    xDomain: ir.space.xDomain,
    yDomain: [0, 1], // dummy for type compat
  };

  const niceStep = (range: number, target: number) => {
    const raw = range / target;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / pow;
    return (n >= 5 ? 5 : n >= 2 ? 2 : 1) * pow;
  };

  const fmt = (v: number) => String(Math.round(v * 1000) / 1000);

  const ticks: React.ReactNode[] = [];
  const step = niceStep(xMax - xMin, Math.max(3, Math.min(8, Math.floor(W / 120))));
  for (let t = Math.ceil(xMin / step) * step, k = 0; t <= xMax + 1e-9; t += step, k++) {
    const X = cx.toX(t);
    ticks.push(
      <g key={`tick${k}`}>
        <line x1={X} y1={Y_MID - 6} x2={X} y2={Y_MID + 6} stroke={AXIS_LINE} strokeWidth={1.5} />
        <text
          x={X}
          y={Y_MID + 20}
          textAnchor="middle"
          fontSize={11}
          fill={AXIS_LABEL}
          stroke="white"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {fmt(t)}
        </text>
      </g>
    );
  }

  const startDrag = (bind: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    const move = (ev: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dataX = xMin + ((ev.clientX - rect.left) / rect.width) * (xMax - xMin);
      set(bind, dataX);
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

  return (
    <div
      ref={wrapRef}
      className="w-full bg-white rounded-2xl border border-neutral-100 overflow-hidden"
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role={ir.space.alt ? 'group' : undefined}
        aria-label={ir.space.alt}
        className="w-full select-none"
        style={{ touchAction: 'none' }}
      >
        <line x1={0} y1={Y_MID} x2={W} y2={Y_MID} stroke={AXIS_LINE} strokeWidth={2} />
        {ticks}

        {expandObjects(ir.objects, scope).map((obj, i) => {
          if (obj.phase === 'reveal' && !revealed) return null;
          if (obj.visibleIf && !evalBool(obj.visibleIf, scope)) return null;
          const alpha = alphaOf(obj, scope);
          if (alpha !== null && alpha < 0.5) return null;
          if (obj.type === 'point') {
            const x = evalNumber(obj.x, scope);
            if (!Number.isFinite(x)) return null;
            const X = cx.toX(x);
            const draggable = !!obj.draggable;
            const onPointerDown =
              draggable && obj.draggable ? startDrag(obj.draggable.bind) : undefined;
            const color = resolveColor(obj.color);

            return (
              <g
                key={obj.id || i}
                className={draggable ? 'cursor-grab active:cursor-grabbing' : undefined}
              >
                {draggable && obj.draggable && (
                  <>
                    <circle cx={X} cy={Y_MID} r={12} fill={color} opacity={0.18} />
                    <circle
                      cx={X}
                      cy={Y_MID}
                      r={20}
                      fill="transparent"
                      onPointerDown={onPointerDown}
                    />
                  </>
                )}
                <circle
                  cx={X}
                  cy={Y_MID}
                  r={6}
                  fill={color}
                  stroke="white"
                  strokeWidth={2}
                  onPointerDown={onPointerDown}
                />
                {obj.label && (
                  <text
                    x={X}
                    y={Y_MID - 16}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={700}
                    fill={color}
                    stroke="white"
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    {interpolate(obj.label, scope)}
                  </text>
                )}
              </g>
            );
          }
          if (obj.type === 'label') {
            const x = evalNumber(obj.x, scope);
            if (!Number.isFinite(x)) return null;
            const X = cx.toX(x);
            return (
              <text
                key={obj.id || i}
                x={X}
                y={Y_MID - 28}
                textAnchor="middle"
                fontSize={obj.fontSize ?? 12}
                fill={resolveColor(obj.color)}
                stroke="white"
                strokeWidth={2}
                paintOrder="stroke"
              >
                {interpolate(obj.text, scope)}
              </text>
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}
