import type { Scope } from '@/engine/ir/types';
import type { ExprIR, Text } from '@/engine/expr';
import { evalExpr as evalTree, evalText as evalTextTree } from '@/engine/expr';

// the runtime evaluates the expression AST directly (no new Function, no eval,
// no CSP unsafe-eval). the `string` case only exists for stale v1 IR that was
// persisted before the AST migration — reseed (`npm run db:seed`) upgrades it.
// a broken scene renders nothing rather than crashing, so we swallow to NaN/0.

export function evaluate(expr: string | number | ExprIR, scope: Scope): number | boolean {
  if (typeof expr === 'number') return expr;
  if (typeof expr === 'object' && expr !== null) {
    try {
      const v = evalTree(expr, scope);
      return typeof v === 'string' ? 0 : v;
    } catch {
      return 0;
    }
  }
  // legacy string IR — no longer evaluated. reseed to get v2 trees.
  if (typeof expr === 'string' && expr.trim() !== '') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[engine] stale v1 string expression "${expr}" — run npm run db:seed`);
    }
  }
  return 0;
}

export function evalNumber(expr: string | number | ExprIR, scope: Scope): number {
  const v = evaluate(expr, scope);
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
}

export function evalBool(expr: string | number | ExprIR, scope: Scope): boolean {
  const v = evaluate(expr, scope);
  return typeof v === 'boolean' ? v : v !== 0;
}

// v2 text is {parts}; v1 is a string with ${expr} spans. both render 2dp values.
export function interpolate(text: string | Text, scope: Scope): string {
  if (typeof text === 'object' && text !== null) {
    try {
      return evalTextTree(text, scope);
    } catch {
      return '—';
    }
  }
  return text.replace(/\$\{([^}]+)\}/g, (_, e: string) => {
    const v = evalNumber(e.trim(), scope);
    if (!isFinite(v)) return '—';
    return String(Math.round(v * 100) / 100);
  });
}

export function alphaOf(obj: { alpha?: unknown }, scope: Scope): number | null {
  if (obj.alpha === undefined) return null;
  const a = evalNumber(obj.alpha as never, scope);
  if (!Number.isFinite(a)) return 0;
  return Math.max(0, Math.min(1, a));
}
