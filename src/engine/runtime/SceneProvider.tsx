'use client';
import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import type { SceneIR, Scope } from '@/engine/ir/types';

type SceneCtx = {
  scope: Scope;
  set: (key: string, value: number | boolean) => void;
  setMany: (values: Record<string, number | boolean>) => void;
  animate: (targets: Record<string, number>, duration?: number, ease?: string) => void;
  ir: SceneIR;
};

const Ctx = createContext<SceneCtx | null>(null);

// easing curves for tweens. t goes 0 -> 1
const EASES: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

function initScope(ir: SceneIR): Scope {
  const scope: Scope = {};
  for (const [key, def] of Object.entries(ir.state)) {
    if (def.type === 'number' || def.type === 'boolean') scope[key] = def.init;
    // enum vars get parsed but i haven't wired them into scope yet
  }
  return scope;
}

// keep numbers inside their declared min/max
function clampVal(ir: SceneIR, key: string, value: number | boolean): number | boolean {
  const def = ir.state[key];
  if (def?.type === 'number' && typeof value === 'number') {
    let v = value;
    if (def.min != null) v = Math.max(def.min, v);
    if (def.max != null) v = Math.min(def.max, v);
    return v;
  }
  return value;
}

export function SceneProvider({ ir, children }: { ir: SceneIR; children: React.ReactNode }) {
  const [scope, setScope] = useState<Scope>(() => initScope(ir));
  const scopeRef = useRef(scope);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    scopeRef.current = scope;
  }, [scope]);

  const cancelRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => cancelRaf, [cancelRaf]);

  // a manual set (drag/slider), kill any running tween so the user wins
  const set = useCallback(
    (key: string, value: number | boolean) => {
      cancelRaf();
      setScope((prev) => ({ ...prev, [key]: clampVal(ir, key, value) }));
    },
    [ir, cancelRaf]
  );

  const setMany = useCallback(
    (values: Record<string, number | boolean>) => {
      setScope((prev) => {
        const next = { ...prev };
        for (const k in values) next[k] = clampVal(ir, k, values[k]);
        return next;
      });
    },
    [ir]
  );

  // tween numeric keys from where they are now to the targets
  const animate = useCallback(
    (targets: Record<string, number>, duration = 600, ease = 'easeInOut') => {
      cancelRaf();
      const from: Record<string, number> = {};
      const cur = scopeRef.current;
      for (const k in targets) from[k] = typeof cur[k] === 'number' ? (cur[k] as number) : 0;
      const easeFn = EASES[ease] ?? EASES.easeInOut;
      const start = performance.now();

      const tick = (now: number) => {
        const p = duration <= 0 ? 1 : Math.min(1, (now - start) / duration);
        const e = easeFn(p);
        setScope((prev) => {
          const next = { ...prev };
          for (const k in targets) next[k] = clampVal(ir, k, from[k] + (targets[k] - from[k]) * e);
          return next;
        });
        rafRef.current = p < 1 ? requestAnimationFrame(tick) : null;
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [ir, cancelRaf]
  );

  return <Ctx.Provider value={{ scope, set, setMany, animate, ir }}>{children}</Ctx.Provider>;
}

export function useScene(): SceneCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useScene must be used inside <SceneProvider>');
  return ctx;
}
