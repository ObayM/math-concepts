'use client';
import React, { createContext, useContext, useCallback, useState } from 'react';
import type { SceneIR, Scope } from '../ir/types';

type SceneCtx = {
  scope: Scope;
  set: (key: string, value: number | boolean) => void;
  ir: SceneIR;
};

const Ctx = createContext<SceneCtx | null>(null);

function initScope(ir: SceneIR): Scope {
  const scope: Scope = {};
  for (const [key, def] of Object.entries(ir.state)) {
    if (def.type === 'number' || def.type === 'boolean') scope[key] = def.init;
    // enum vars get parsed but i haven't wired them into scope yet
  }
  return scope;
}

export function SceneProvider({ ir, children }: { ir: SceneIR; children: React.ReactNode }) {
  const [scope, setScope] = useState<Scope>(() => initScope(ir));

  const set = useCallback(
    (key: string, value: number | boolean) => {
      setScope((prev) => {
        const def = ir.state[key];
        let next = value;
        if (def?.type === 'number' && typeof next === 'number') {
          if (def.min != null) next = Math.max(def.min, next);
          if (def.max != null) next = Math.min(def.max, next);
        }
        return { ...prev, [key]: next };
      });
    },
    [ir]
  );

  return <Ctx.Provider value={{ scope, set, ir }}>{children}</Ctx.Provider>;
}

export function useScene(): SceneCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useScene must be used inside <SceneProvider>');
  return ctx;
}
