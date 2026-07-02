import type { Scope } from '@/engine/ir/types';
import type { ExprIR, Text } from '@/engine/expr';
import { evalExpr as evalTree, evalText as evalTextTree } from '@/engine/expr';

// dual-read while v1 string IR is still seeded: expression trees (v2) go to
// the tree-walker; strings take the old new Function path below. the string
// path dies once everything is reseeded as v2.

// longer names first so the regex grabs them first (atan2 before atan)
const FUNCS = [
  'asin',
  'acos',
  'atan2',
  'atan',
  'sinh',
  'cosh',
  'tanh',
  'sin',
  'cos',
  'tan',
  'sqrt',
  'cbrt',
  'abs',
  'log2',
  'log10',
  'log',
  'exp',
  'floor',
  'ceil',
  'round',
  'sign',
  'pow',
  'hypot',
  'min',
  'max',
];

const FUNC_RE = new RegExp('\\b(' + FUNCS.join('|') + ')\\b', 'g');
const ALWAYS_ALLOWED = new Set(['Math', 'PI', 'E', 'true', 'false', ...FUNCS]);

const cache = new Map<string, (...args: unknown[]) => unknown>();

function compile(expr: string, keys: string[]) {
  const cacheKey = expr + '|' + keys.join(',');
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const clean = expr
    .replace(/\^/g, '**')
    .replace(FUNC_RE, 'Math.$1')
    .replace(/\bPI\b/g, 'Math.PI')
    .replace(/\bE\b/g, 'Math.E');

  const allowed = new Set([...ALWAYS_ALLOWED, ...keys]);
  const tokens = clean.match(/[A-Za-z_]\w*/g) || [];
  if (tokens.some((t) => !allowed.has(t))) {
    console.warn(`[engine] blocked unsafe expression: ${expr}`);
    return null;
  }

  try {
    const fn = new Function(...keys, `return (${clean});`) as (...args: unknown[]) => unknown;
    cache.set(cacheKey, fn);
    return fn;
  } catch (err) {
    console.warn(`[engine] bad expression: ${expr}`, err);
    return null;
  }
}

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
  if (typeof expr !== 'string' || expr.trim() === '') return 0;

  const keys = Object.keys(scope);
  const fn = compile(expr, keys);
  if (!fn) return 0;

  try {
    const v = fn(...keys.map((k) => scope[k]));
    if (typeof v === 'boolean') return v;
    return Number(v);
  } catch {
    return 0;
  }
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
