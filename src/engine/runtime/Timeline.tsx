'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, ChevronLeft, Lightbulb } from 'lucide-react';
import { useScene } from './SceneProvider';
import { evalBool } from './eval';
import type { SceneIR } from '@/engine/ir/types';

function baseState(ir: SceneIR): Record<string, number | boolean> {
  const s: Record<string, number | boolean> = {};
  for (const [k, def] of Object.entries(ir.state)) {
    if (def.type === 'boolean' || (def.type === 'number' && !def.keep)) s[k] = def.init;
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

function safeBool(e: unknown, scope: Record<string, unknown>): boolean {
  try {
    return evalBool(e as never, scope as never);
  } catch {
    return false;
  }
}

function StepHint({ hint }: { hint: string }) {
  const [shown, setShown] = useState(false);
  if (shown) return <p className="text-neutral-400 text-xs leading-relaxed">{hint}</p>;
  return (
    <button
      type="button"
      onClick={() => setShown(true)}
      className="flex items-center gap-1 self-start text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors"
    >
      <Lightbulb className="w-3.5 h-3.5" />
      Hint
    </button>
  );
}

export default function Timeline({
  ir,
  onStepChange,
}: {
  ir: SceneIR;
  onStepChange?: (idx: number) => void;
}) {
  const { scope, setMany, animate, setAttention } = useScene();
  const steps = ir.timeline ?? [];
  const [idx, setIdx] = useState(0);
  const mounted = useRef(false);
  const holding = steps[idx]?.wait;
  const waiting = idx < steps.length - 1 && Boolean(holding) && !safeBool(holding, scope);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    setMany(foldTo(ir, 0));
    const first = ir.timeline?.[0];
    if (first?.indicate || first?.focus || first?.surround)
      setAttention({ indicate: first.indicate, focus: first.focus, surround: first.surround });
  }, [ir, setMany, setAttention]);

  const goto = (target: number) => {
    const next = Math.max(0, Math.min(steps.length - 1, target));
    const targetState = foldTo(ir, next);
    // the step between i-1 and i describes that transition in both directions,
    // so walking back undoes it with the same curve that played it
    const step = next > idx ? steps[next] : steps[idx];

    // a replay is a reset, not a rewind, so only single steps tween
    if (Math.abs(next - idx) === 1 && step) {
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
    onStepChange?.(next);
    const at = steps[next];
    setAttention({ indicate: at?.indicate, focus: at?.focus, surround: at?.surround });
  };

  const released = Boolean(holding) && !waiting && idx < steps.length - 1;

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

      {current?.hint && <StepHint key={idx} hint={current.hint} />}

      <div className="flex items-center gap-3 max-md:flex-wrap max-md:gap-y-2">
        <button
          type="button"
          onClick={() => goto(idx - 1)}
          disabled={idx === 0}
          className="tap-target p-2 rounded-xl text-neutral-500 hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Previous step"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => goto(atLast ? 0 : idx + 1)}
          disabled={waiting}
          className={`flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors active:scale-95 disabled:opacity-40 disabled:hover:bg-primary-500 disabled:active:scale-100 ${released ? 'animate-pop-in' : ''}`}
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
