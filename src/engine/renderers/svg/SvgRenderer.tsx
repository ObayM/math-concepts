'use client';
import React, { useRef } from 'react';
import { useScene } from '@/engine/runtime/SceneProvider';
import { evalNumber, evalBool } from '@/engine/runtime/eval';
import { svgPrimitives } from './registry';
import type { SceneIR } from '@/engine/ir/types';
import type { CoordSystem } from './types';

const W = 640;
const H = 420;

export default function SvgRenderer({ ir }: { ir: SceneIR }) {
  const { scope, set } = useScene();
  const svgRef = useRef<SVGSVGElement>(null);

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

  // grab point positions so a "line through: <id>" can latch onto them
  const points: Record<string, { x: number; y: number }> = {};
  for (const o of ir.objects) {
    if (o.type === 'point') points[o.id] = { x: evalNumber(o.x, scope), y: evalNumber(o.y, scope) };
  }

  const startDrag =
    (obj: { draggable?: { axis: string; bind: string; bindY?: string } }) =>
    (e: React.PointerEvent) => {
      if (!obj.draggable) return;
      e.preventDefault();
      const { axis, bind, bindY } = obj.draggable;
      const move = (ev: PointerEvent) => {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const dataX = xMin + ((ev.clientX - rect.left) / rect.width) * (xMax - xMin);
        const dataY = yMax - ((ev.clientY - rect.top) / rect.height) * (yMax - yMin);
        if (axis === 'x' || axis === 'xy') set(bind, dataX);
        if (axis === 'y') set(bind, dataY);
        if (axis === 'xy' && bindY) set(bindY, dataY);
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };

  const grid: React.ReactNode[] = [];
  if (ir.space.grid) {
    for (let gx = Math.ceil(xMin); gx <= xMax; gx++) {
      grid.push(
        <line key={`gx${gx}`} x1={cx.toX(gx)} y1={0} x2={cx.toX(gx)} y2={H} stroke="#f1f5f9" />
      );
    }
    for (let gy = Math.ceil(yMin); gy <= yMax; gy++) {
      grid.push(
        <line key={`gy${gy}`} x1={0} y1={cx.toY(gy)} x2={W} y2={cx.toY(gy)} stroke="#f1f5f9" />
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
    <div className="w-full bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        style={{ touchAction: 'none' }}
      >
        {grid}
        {axes}
        {ir.objects.map((obj, i) => {
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
