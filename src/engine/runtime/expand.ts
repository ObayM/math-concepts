import type { SceneObject, Scope } from '@/engine/ir/types';
import type { ExprIR } from '@/engine/expr';
import { evalNumber } from './eval';

const MAX_INSTANCES = 500;

// fields on any scene object that can hold a NumExpr (the where a `repeat`'s
// loop var could show up). points/text get walked separately below.
const NUM_FIELDS = [
  'x',
  'y',
  'w',
  'h',
  'r',
  'expr',
  'xExpr',
  'yExpr',
  'lower',
  'from',
  'to',
  'x1',
  'y1',
  'x2',
  'y2',
  'start',
  'end',
  'where',
  'opacity',
  'visibleIf',
] as const;

function isExprIR(v: unknown): v is ExprIR {
  return typeof v === 'object' && v !== null && typeof (v as { k?: unknown }).k === 'string';
}

function substTree(e: ExprIR, varName: string, k: number): ExprIR {
  switch (e.k) {
    case 'id':
      return e.name === varName ? { k: 'num', v: k } : e;
    case 'un':
      return { ...e, e: substTree(e.e, varName, k) };
    case 'bin':
      return { ...e, l: substTree(e.l, varName, k), r: substTree(e.r, varName, k) };
    case 'call':
      return { ...e, args: e.args.map((a) => substTree(a, varName, k)) };
    default:
      return e;
  }
}

// substitutes the loop var everywhere it can legally appear: bare NumExpr
// fields, Text{parts}, and point-pair tuples — leaves plain numbers/strings alone.
function subst(value: unknown, varName: string, k: number): unknown {
  if (isExprIR(value)) return substTree(value, varName, k);
  return value;
}

function substText(value: unknown, varName: string, k: number): unknown {
  if (value && typeof value === 'object' && Array.isArray((value as { parts?: unknown }).parts)) {
    const parts = (value as { parts: (string | ExprIR)[] }).parts;
    return { parts: parts.map((p) => (typeof p === 'string' ? p : substTree(p, varName, k))) };
  }
  return subst(value, varName, k);
}

// one instance of a repeat body item, with `varName` baked to the literal `k`
// everywhere it appears. other identifiers (real state) are left live.
function instantiate(obj: Record<string, unknown>, varName: string, k: number): SceneObject {
  const out: Record<string, unknown> = { ...obj };
  if (typeof out.id === 'string') out.id = `${out.id}#${k}`;
  for (const field of NUM_FIELDS) {
    if (field in out) out[field] = subst(out[field], varName, k);
  }
  if ('label' in out) out.label = substText(out.label, varName, k);
  if ('text' in out) out.text = substText(out.text, varName, k);
  if (Array.isArray(out.points)) {
    out.points = out.points.map((pt) =>
      Array.isArray(pt) ? [subst(pt[0], varName, k), subst(pt[1], varName, k)] : pt
    );
  }
  if (out.type === 'repeat') out.count = subst(out.count, varName, k);
  return out as unknown as SceneObject;
}

// renderers call this once on `ir.objects` before drawing — flattens any
// `repeat` groups into their expanded instances (recursively, in declaration order).
export function expandObjects(objects: SceneObject[], scope: Scope): SceneObject[] {
  const out: SceneObject[] = [];
  for (const obj of objects) {
    const o = obj as unknown as Record<string, unknown>;
    if (o.type !== 'repeat') {
      out.push(obj);
      continue;
    }
    const count = Math.max(
      0,
      Math.min(MAX_INSTANCES, Math.round(evalNumber(o.count as never, scope)))
    );
    const body = o.body as Record<string, unknown>[];
    const instances: SceneObject[] = [];
    for (let k = 0; k < count; k++) {
      for (const item of body) instances.push(instantiate(item, o.var as string, k));
    }
    out.push(...expandObjects(instances, scope));
  }
  return out;
}
