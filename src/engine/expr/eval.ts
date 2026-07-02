import type { ExprIR, Scope, Value } from './types';
import { BUILTINS, CONSTS } from './builtins';

// tree-walking evaluator. replaces the old string + new Function path:
// no eval, no CSP unsafe-eval, and unknown identifiers throw instead of
// silently becoming 0.

export class ExprError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'ExprError';
  }
}

function truthy(v: Value): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  return v !== '';
}

function num(v: Value, ctx: string): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  throw new ExprError(`cannot use string "${v}" in ${ctx}`);
}

export function evalExpr(e: ExprIR, scope: Scope): Value {
  switch (e.k) {
    case 'num':
      return e.v;
    case 'bool':
      return e.v;
    case 'str':
      return e.v;

    case 'id': {
      if (e.name in scope) return scope[e.name];
      if (e.name in CONSTS) return CONSTS[e.name];
      throw new ExprError(`unknown identifier "${e.name}"`);
    }

    case 'un': {
      if (e.op === 'not') return !truthy(evalExpr(e.e, scope));
      const v = num(evalExpr(e.e, scope), `unary ${e.op}`);
      return e.op === '-' ? -v : v;
    }

    case 'bin': {
      // and/or short-circuit before the right side evaluates
      if (e.op === 'and') return truthy(evalExpr(e.l, scope)) && truthy(evalExpr(e.r, scope));
      if (e.op === 'or') return truthy(evalExpr(e.l, scope)) || truthy(evalExpr(e.r, scope));

      const l = evalExpr(e.l, scope);
      const r = evalExpr(e.r, scope);
      if (e.op === '==') return l === r;
      if (e.op === '!=') return l !== r;

      const a = num(l, `"${e.op}"`);
      const b = num(r, `"${e.op}"`);
      switch (e.op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          return a / b;
        case '%':
          return a % b;
        case '^':
          return Math.pow(a, b);
        case '<':
          return a < b;
        case '<=':
          return a <= b;
        case '>':
          return a > b;
        case '>=':
          return a >= b;
      }
      throw new ExprError(`unknown operator "${e.op}"`);
    }

    case 'call': {
      const fn = BUILTINS[e.fn];
      if (!fn) throw new ExprError(`unknown function "${e.fn}"`);
      return fn(...e.args.map((a) => num(evalExpr(a, scope), `${e.fn}(...)`)));
    }
  }
}

export function evalNum(e: number | ExprIR, scope: Scope): number {
  if (typeof e === 'number') return e;
  return num(evalExpr(e, scope), 'a numeric slot');
}

export function evalBool(e: number | ExprIR, scope: Scope): boolean {
  if (typeof e === 'number') return e !== 0;
  return truthy(evalExpr(e, scope));
}

// live text: static parts join as-is, expressions render rounded to 2dp
// (matches the old ${} interpolation, em dash for non-finite)
export function evalText(t: { parts: (string | ExprIR)[] }, scope: Scope): string {
  return t.parts
    .map((p) => {
      if (typeof p === 'string') return p;
      const v = evalExpr(p, scope);
      if (typeof v === 'string') return v;
      if (typeof v === 'boolean') return String(v);
      if (!isFinite(v)) return '—';
      return String(Math.round(v * 100) / 100);
    })
    .join('');
}
