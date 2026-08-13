'use client';
import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import type { SceneIR, Scope } from '@/engine/ir/types';

type SceneCtx = {
  scope: Scope;
  set: (key: string, value: number | boolean | string) => void;
  setMany: (values: Record<string, number | boolean | string>) => void;
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

type Tween = {
  from: number;
  to: number;
  start: number;
  duration: number;
  ease: (t: number) => number;
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function initScope(ir: SceneIR): Scope {
  const scope: Scope = {};
  for (const [key, def] of Object.entries(ir.state)) {
    scope[key] = def.init;
  }
  return scope;
}

// keep numbers inside their declared min/max
function clampVal(
  ir: SceneIR,
  key: string,
  value: number | boolean | string
): number | boolean | string {
  const def = ir.state[key];
  if (def?.type === 'number' && typeof value === 'number') {
    let v = value;
    if (def.min != null) v = Math.max(def.min, v);
    if (def.max != null) v = Math.min(def.max, v);
    return v;
  }
  return value;
}

export function SceneProvider({
  ir,
  children,
  onScopeChange,
}: {
  ir: SceneIR;
  children: React.ReactNode;
  onScopeChange?: (scope: Scope) => void;
}) {
  const [scope, setScope] = useState<Scope>(() => initScope(ir));
  const scopeRef = useRef(scope);
  const tweensRef = useRef<Map<string, Tween>>(new Map());
  const rafRef = useRef<number | null>(null);
  const onScopeChangeRef = useRef(onScopeChange);
  useEffect(() => {
    onScopeChangeRef.current = onScopeChange;
  }, [onScopeChange]);

  // a live preview swaps a freshly compiled ir into a mounted provider, so the
  // scope has to follow the declarations. keyed on the decls rather than the ir
  // so dragging a slider survives an edit that leaves the params alone.
  const stateSig = JSON.stringify(Object.entries(ir.state).map(([k, d]) => [k, d.init]));
  const [seenSig, setSeenSig] = useState(stateSig);
  if (seenSig !== stateSig) {
    setSeenSig(stateSig);
    setScope(initScope(ir));
  }

  useEffect(() => {
    scopeRef.current = scope;
    onScopeChangeRef.current?.(scope);
  }, [scope]);

  // scopeRef leads and the state mirrors it, so a set() followed synchronously
  // by an animate() reads the value the user just produced, not last render's
  const commit = useCallback((next: Scope) => {
    scopeRef.current = next;
    setScope(next);
  }, []);

  const stopTweens = useCallback((keys: Iterable<string>) => {
    for (const k of keys) tweensRef.current.delete(k);
    if (tweensRef.current.size === 0 && rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      tweensRef.current.clear();
    },
    []
  );

  // a manual set (drag/slider) drops that key's tween so the user wins
  const set = useCallback(
    (key: string, value: number | boolean | string) => {
      stopTweens([key]);
      commit({ ...scopeRef.current, [key]: clampVal(ir, key, value) });
    },
    [ir, commit, stopTweens]
  );

  const setMany = useCallback(
    (values: Record<string, number | boolean | string>) => {
      stopTweens(Object.keys(values));
      const next = { ...scopeRef.current };
      for (const k in values) next[k] = clampVal(ir, k, values[k]);
      commit(next);
    },
    [ir, commit, stopTweens]
  );

  // tween numeric keys from where they are now to the targets. tweens are
  // tracked per key, so retargeting one key leaves the others running instead
  // of stranding them wherever the interrupted frame left them.
  const animate = useCallback(
    (targets: Record<string, number>, duration = 600, ease = 'easeInOut') => {
      if (prefersReducedMotion()) {
        setMany(targets);
        return;
      }
      const easeFn = EASES[ease] ?? EASES.easeInOut;
      const start = performance.now();
      const cur = scopeRef.current;
      for (const k in targets) {
        tweensRef.current.set(k, {
          from: typeof cur[k] === 'number' ? (cur[k] as number) : 0,
          to: targets[k],
          start,
          duration,
          ease: easeFn,
        });
      }
      if (rafRef.current != null) return;

      const tick = (now: number) => {
        const tweens = tweensRef.current;
        const next = { ...scopeRef.current };
        for (const [k, tw] of tweens) {
          const p = tw.duration <= 0 ? 1 : Math.min(1, (now - tw.start) / tw.duration);
          next[k] = clampVal(ir, k, tw.from + (tw.to - tw.from) * tw.ease(p));
          if (p >= 1) tweens.delete(k);
        }
        commit(next);
        rafRef.current = tweens.size ? requestAnimationFrame(tick) : null;
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [ir, commit, setMany]
  );

  return <Ctx.Provider value={{ scope, set, setMany, animate, ir }}>{children}</Ctx.Provider>;
}

export function useScene(): SceneCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useScene must be used inside <SceneProvider>');
  return ctx;
}
