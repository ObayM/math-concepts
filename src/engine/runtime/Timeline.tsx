'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, ChevronLeft } from 'lucide-react';
import { useScene } from './SceneProvider';
import type { SceneIR } from '../ir/types';

function baseState(ir: SceneIR): Record<string, number | boolean> {
  const s: Record<string, number | boolean> = {};
  for (const [k, def] of Object.entries(ir.state)) {
    if (def.type === 'number' || def.type === 'boolean') s[k] = def.init;
  }
  return s;
}

function foldTo(ir: SceneIR, i: number): Record<string, number | boolean> {
  const s = baseState(ir);
  const steps = ir.timeline ?? [];
  for (let j = 0; j <= i && j < steps.length; j++) {
    const st = steps[j];
    if (st.set) Object.assign(s, st.set);
    if (st.animate) Object.assign(s, st.animate);
  }
  return s;
}

export default function Timeline({ ir }: { ir: SceneIR }) {
  const { setMany, animate } = useScene();
  const steps = ir.timeline ?? [];
  const [idx, setIdx] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    setMany(foldTo(ir, 0));
  }, [ir, setMany]);

  const goto = (target: number) => {
    const next = Math.max(0, Math.min(steps.length - 1, target));
    const targetState = foldTo(ir, next);
    const step = steps[next];

    // only tween when moving forward; back/replay just snaps
    if (next > idx && step) {
      const nums: Record<string, number> = {};
      const rest: Record<string, number | boolean> = {};
      for (const k in targetState) {
        const v = targetState[k];
        if (typeof v === 'number') nums[k] = v;
        else rest[k] = v;
      }
      setMany(rest);
      animate(nums, step.duration, step.ease);
    } else {
      setMany(targetState);
    }
    setIdx(next);
  };

  if (!steps.length) return null;

  const atLast = idx >= steps.length - 1;
  const current = steps[idx];

  return (
    <div className="bg-neutral-100 rounded-2xl p-4 flex flex-col gap-3">
      {current?.narrate && (
        <p
          key={idx}
          className="animate-fade-in-up text-neutral-600 text-sm font-medium leading-relaxed"
        >
          {current.narrate}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => goto(idx - 1)}
          disabled={idx === 0}
          className="p-2 rounded-xl text-neutral-500 hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Previous step"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => goto(atLast ? 0 : idx + 1)}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors active:scale-95"
        >
          {atLast ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          {atLast ? 'Replay' : 'Play'}
        </button>

        <div className="flex gap-1.5 ml-1">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${i <= idx ? 'bg-primary-500' : 'bg-neutral-300'}`}
            />
          ))}
        </div>

        <span className="ml-auto text-xs font-mono text-neutral-400">
          {idx + 1}/{steps.length}
        </span>
      </div>
    </div>
  );
}
