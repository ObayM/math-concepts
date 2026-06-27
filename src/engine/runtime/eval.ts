import type { Scope } from '../ir/types';

// safe expr evaluator. same trick as the old FunctionVisualizer:
// i whitelist the identifiers, build it with new Function, nothing sketchy gets thru.
// made it generic so it works with any state vars + ${} interpolation

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

export function evaluate(expr: string | number, scope: Scope): number | boolean {
  if (typeof expr === 'number') return expr;
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

export function evalNumber(expr: string | number, scope: Scope): number {
  const v = evaluate(expr, scope);
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
}

export function evalBool(expr: string | number, scope: Scope): boolean {
  const v = evaluate(expr, scope);
  return typeof v === 'boolean' ? v : v !== 0;
}

// swap every ${expr} in the string for its rounded value
export function interpolate(text: string, scope: Scope): string {
  return text.replace(/\$\{([^}]+)\}/g, (_, e: string) => {
    const v = evalNumber(e.trim(), scope);
    if (!isFinite(v)) return '—';
    return String(Math.round(v * 100) / 100);
  });
}
