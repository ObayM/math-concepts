import type { Expr, PropMap, Stmt, SlideStmt } from './ast';
import type { SceneIR } from '@/engine/ir/types';
import type { LessonIR } from '@/engine/ir/lesson';
import type { ExprIR, NumExpr, UnOp, BinOp, Value } from '@/engine/expr';
import { sceneSchema } from '@/engine/ir/schema';
import { lessonSchema } from '@/engine/ir/lesson';
import { evalExpr, ExprError, BUILTINS, BUILTIN_NAMES, CONSTS } from '@/engine/expr';
import { lex } from './lexer';
import { parseExprTokens } from './parser';
import { CompileError } from './errors';

type CompileScope = Record<string, number | boolean>;
type Macros = Map<string, { params: string[]; body: Stmt[] }>;

// parser Expr → ExprIR for the evaluable subset. tuple/list/dict/arrow are
// compile-time shapes the emitter destructures itself — they never evaluate.
function toExprIR(expr: Expr): ExprIR {
  switch (expr.k) {
    case 'num':
      return { k: 'num', v: expr.v };
    case 'bool':
      return { k: 'bool', v: expr.v };
    case 'str':
      return { k: 'str', v: expr.v };
    case 'id':
      return { k: 'id', name: expr.name };
    case 'un':
      return { k: 'un', op: expr.op as UnOp, e: toExprIR(expr.e) };
    case 'bin':
      return { k: 'bin', op: expr.op as BinOp, l: toExprIR(expr.l), r: toExprIR(expr.r) };
    case 'call':
      return { k: 'call', fn: expr.fn, args: expr.args.map(toExprIR) };
    default:
      throw new CompileError(`cannot evaluate "${expr.k}" at compile time`);
  }
}

function compileEval(expr: Expr, scope: CompileScope): number | boolean {
  let v;
  try {
    v = evalExpr(toExprIR(expr), scope);
  } catch (e) {
    if (e instanceof ExprError) throw new CompileError(e.message);
    throw e;
  }
  if (typeof v === 'string') throw new CompileError(`cannot use a string here`);
  return v;
}

// tiny levenshtein so typos get a "did you mean" hint
function lev(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array<number>(b.length + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

function suggest(name: string, cands: Iterable<string>): string {
  let best = '';
  let bestD = Infinity;
  for (const c of cands) {
    const d = lev(name, c);
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  // bestD < name.length keeps single-char typos from matching random single-char names
  return best && bestD <= 2 && bestD < name.length ? ` — did you mean "${best}"?` : '';
}

function treeAt(expr: Expr, ln: number): ExprIR {
  try {
    return toExprIR(expr);
  } catch (e) {
    if (e instanceof CompileError) throw new CompileError(e.message, ln);
    throw e;
  }
}

// compile-time positions (loop bounds, param inits, prop numbers...) must fully
// resolve against the compile scope — unknowns are errors now, not silent zeros
function checkCompileIds(tree: ExprIR, scope: CompileScope, ln: number): void {
  const walk = (e: ExprIR): void => {
    switch (e.k) {
      case 'id':
        if (!(e.name in scope) && !(e.name in CONSTS)) {
          const cands = [...Object.keys(scope), ...Object.keys(CONSTS)];
          throw new CompileError(
            `"${e.name}" is not a compile-time value here${suggest(e.name, cands)}`,
            ln
          );
        }
        return;
      case 'un':
        return walk(e.e);
      case 'bin':
        walk(e.l);
        walk(e.r);
        return;
      case 'call':
        if (!(e.fn in BUILTINS)) {
          throw new CompileError(`unknown function "${e.fn}"${suggest(e.fn, BUILTIN_NAMES)}`, ln);
        }
        e.args.forEach(walk);
        return;
      default:
        return;
    }
  };
  walk(tree);
}

function cNum(expr: Expr, scope: CompileScope, ln: number): number {
  const tree = treeAt(expr, ln);
  checkCompileIds(tree, scope, ln);
  let v: Value;
  try {
    v = evalExpr(tree, scope);
  } catch (e) {
    if (e instanceof ExprError) throw new CompileError(e.message, ln);
    throw e;
  }
  if (typeof v === 'string') throw new CompileError('expected a number, got a string', ln);
  return typeof v === 'boolean' ? (v ? 1 : 0) : v;
}

// substitute compile-time bindings (loop vars, lets, macro params) into the
// tree so the IR never references them — they don't exist at runtime
function lowerTree(expr: Expr, cScope: CompileScope): ExprIR {
  switch (expr.k) {
    case 'id': {
      if (expr.name in cScope) {
        const v = cScope[expr.name];
        return typeof v === 'boolean' ? { k: 'bool', v } : { k: 'num', v };
      }
      return { k: 'id', name: expr.name };
    }
    case 'num':
      return { k: 'num', v: expr.v };
    case 'bool':
      return { k: 'bool', v: expr.v };
    case 'str':
      return { k: 'str', v: expr.v };
    case 'un':
      return { k: 'un', op: expr.op as UnOp, e: lowerTree(expr.e, cScope) };
    case 'bin':
      return {
        k: 'bin',
        op: expr.op as BinOp,
        l: lowerTree(expr.l, cScope),
        r: lowerTree(expr.r, cScope),
      };
    case 'call':
      return { k: 'call', fn: expr.fn, args: expr.args.map((a) => lowerTree(a, cScope)) };
    default:
      throw new CompileError(`cannot use a ${expr.k} as a runtime expression`);
  }
}

const asIR = (n: NumExpr): ExprIR => (typeof n === 'number' ? { k: 'num', v: n } : n);

// bottom-up constant folding: children first, then the node. pure math becomes
// a plain number in the IR; anything referencing state stays a tree.
function foldIR(e: ExprIR): NumExpr {
  let node: ExprIR = e;
  if (e.k === 'un') node = { ...e, e: asIR(foldIR(e.e)) };
  else if (e.k === 'bin') node = { ...e, l: asIR(foldIR(e.l)), r: asIR(foldIR(e.r)) };
  else if (e.k === 'call') node = { ...e, args: e.args.map((a) => asIR(foldIR(a))) };
  try {
    const v = evalExpr(node, {});
    // JSON can't carry Infinity/NaN, so non-finite results stay as trees
    if (typeof v === 'number') return Number.isFinite(v) ? v : node;
    if (typeof v === 'boolean') return { k: 'bool', v };
    return node;
  } catch {
    return node;
  }
}

function lower(expr: Expr, cScope: CompileScope): NumExpr {
  return foldIR(lowerTree(expr, cScope));
}

function cBool(expr: Expr, scope: CompileScope, ln: number): boolean {
  const tree = treeAt(expr, ln);
  checkCompileIds(tree, scope, ln);
  try {
    const v = evalExpr(tree, scope);
    return typeof v === 'string' ? v !== '' : Boolean(v);
  } catch (e) {
    if (e instanceof ExprError) throw new CompileError(e.message, ln);
    throw e;
  }
}

function ser(expr: Expr, cScope: CompileScope): string {
  switch (expr.k) {
    case 'num':
      return String(expr.v);
    case 'bool':
      return expr.v ? 'true' : 'false';
    case 'str':
      return expr.v;
    case 'id': {
      if (expr.name in cScope) {
        const v = cScope[expr.name];
        return typeof v === 'number' ? niceNum(v) : String(v);
      }
      return expr.name;
    }
    case 'un': {
      const op = expr.op === 'not' ? '!' : expr.op;
      return `(${op}${ser(expr.e, cScope)})`;
    }
    case 'bin': {
      const l = ser(expr.l, cScope);
      const r = ser(expr.r, cScope);
      const op = expr.op === 'and' ? '&&' : expr.op === 'or' ? '||' : expr.op;
      return `(${l}${op}${r})`;
    }
    case 'call':
      return `${expr.fn}(${expr.args.map((a) => ser(a, cScope)).join(',')})`;
    case 'tuple':
      return expr.items.map((i) => ser(i, cScope)).join(',');
    default:
      throw new CompileError(`cannot serialize "${expr.k}" as a runtime expression`);
  }
}

function evalFstr(raw: string, cScope: CompileScope): string {
  return raw.replace(/\{([^}]+)\}/g, (_, e: string) => {
    try {
      // the {} fragment is raw source — parse it properly, no string eval
      const v = compileEval(parseExprTokens(lex(e.trim())), cScope);
      const num = typeof v === 'boolean' ? (v ? 1 : 0) : v;
      if (Number.isFinite(num)) return niceNum(num);
    } catch {}
    return '${' + e + '}';
  });
}

function evalId(expr: Expr, cScope: CompileScope, ln: number): string {
  if (expr.k === 'id') return expr.name;
  if (expr.k === 'str') return expr.fstr ? evalFstr(expr.v, cScope) : expr.v;
  throw new CompileError('expected an identifier or string as object id', ln);
}

function parseSnap(expr: Expr, ln: number): number | [number, number] | 'grid' {
  if (expr.k === 'id' && expr.name === 'grid') return 'grid';
  if (expr.k === 'num') return expr.v;
  if (expr.k === 'tuple' && expr.items.length === 2) {
    const [a, b] = expr.items;
    if (a.k === 'num' && b.k === 'num') return [a.v, b.v];
  }
  throw new CompileError('snap must be a number, (number, number), or grid', ln);
}

function propNum(
  props: PropMap,
  key: string,
  ln: number,
  cScope: CompileScope = {}
): number | undefined {
  const v = props.get(key);
  if (v == null || v === true) return undefined;
  if (v.k === 'list' || v.k === 'dict' || v.k === 'arrow' || v.k === 'tuple') {
    throw new CompileError(`prop "${key}" must be a number`, ln);
  }
  return cNum(v, cScope, ln);
}

function propStr(props: PropMap, key: string, cScope: CompileScope): string | undefined {
  const v = props.get(key);
  if (v == null || v === true) return undefined;
  if (v.k === 'str') return v.fstr ? evalFstr(v.v, cScope) : v.v;
  if (v.k === 'id') return v.name;
  return ser(v, cScope);
}

function propDict(
  props: PropMap,
  key: string,
  ln: number
): Record<string, number | boolean> | undefined {
  const v = props.get(key);
  if (v == null) return undefined;
  if (v === true || v.k !== 'dict')
    throw new CompileError(`prop "${key}" must be a { key: value } dict`, ln);
  const out: Record<string, number | boolean> = {};
  for (const [k, e] of v.entries) {
    if (e.k === 'bool') {
      out[k] = e.v;
      continue;
    }
    out[k] = cNum(e, {}, ln);
  }
  return out;
}

function niceNum(v: number): string {
  return String(Math.round(v * 1e9) / 1e9);
}

export function emit(stmts: Stmt[]): SceneIR {
  const ir: any = { version: 2, state: {}, space: null, objects: [], controls: [], timeline: [] };
  const macros: Macros = new Map();
  let autoLabelId = 0;
  // vars bound by an enclosing `repeat` — valid runtime ids inside its body,
  // resolved by the renderer at expand time, not here
  let repeatVars: string[] = [];

  // runtime-bound expressions may only reference declared state (+ frame vars
  // like `x` in a curve). typos and use-before-declare become compile errors
  // here instead of silent zeros at runtime.
  function checkRuntime(expr: Expr, cScope: CompileScope, ln: number, extra: string[] = []): void {
    const allowed = [...repeatVars, ...extra];
    const walk = (e: Expr): void => {
      switch (e.k) {
        case 'id': {
          const ok =
            e.name in cScope || e.name in ir.state || e.name in CONSTS || allowed.includes(e.name);
          if (!ok) {
            const cands = [
              ...Object.keys(cScope),
              ...Object.keys(ir.state),
              ...allowed,
              ...Object.keys(CONSTS),
            ];
            throw new CompileError(`"${e.name}" is not defined here${suggest(e.name, cands)}`, ln);
          }
          return;
        }
        case 'un':
          return walk(e.e);
        case 'bin':
          walk(e.l);
          walk(e.r);
          return;
        case 'call':
          if (!(e.fn in BUILTINS)) {
            throw new CompileError(`unknown function "${e.fn}"${suggest(e.fn, BUILTIN_NAMES)}`, ln);
          }
          e.args.forEach(walk);
          return;
        case 'tuple':
        case 'list':
          e.items.forEach(walk);
          return;
        case 'dict':
          e.entries.forEach(([, v]) => walk(v));
          return;
        case 'arrow':
          walk(e.from);
          walk(e.to);
          return;
        default:
          return;
      }
    };
    walk(expr);
  }

  function lowerR(expr: Expr, cScope: CompileScope, ln: number, extra: string[] = []): NumExpr {
    checkRuntime(expr, cScope, ln, extra);
    return lower(expr, cScope);
  }

  function lowerPairR(expr: Expr, cScope: CompileScope, ln: number): [NumExpr, NumExpr] {
    if (expr.k !== 'tuple' || expr.items.length < 2) {
      throw new CompileError('expected a (x, y) pair', ln);
    }
    return [lowerR(expr.items[0], cScope, ln), lowerR(expr.items[1], cScope, ln)];
  }

  function propLowerR(
    props: PropMap,
    key: string,
    cScope: CompileScope,
    ln: number
  ): NumExpr | undefined {
    const v = props.get(key);
    if (v == null || v === true) return undefined;
    return lowerR(v, cScope, ln);
  }

  // text with ${} becomes {parts}: static strings + lowered expression trees.
  // plain text stays a plain string.
  function liveText(text: string, cScope: CompileScope, ln: number) {
    if (!text.includes('${')) return text;
    const parts: (string | ExprIR)[] = [];
    const re = /\$\{([^}]+)\}/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      let frag: Expr;
      try {
        frag = parseExprTokens(lex(m[1]));
      } catch {
        throw new CompileError(`bad expression in \${${m[1]}}`, ln);
      }
      checkRuntime(frag, cScope, ln);
      parts.push(asIR(lower(frag, cScope)));
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return { parts };
  }

  function bindTo(name: string, what: string, ln: number): string {
    if (!(name in ir.state)) {
      throw new CompileError(
        `${what} binds "${name}" but there is no such state${suggest(name, Object.keys(ir.state))}`,
        ln
      );
    }
    return name;
  }

  function applyCommon(obj: any, props: PropMap, cScope: CompileScope, ln: number) {
    const color = propStr(props, 'color', cScope);
    const style = propStr(props, 'style', cScope);
    const show = props.get('show');
    const width = props.get('width');
    if (color) obj.color = color;
    if (style) obj.style = style;
    if (show && show !== true) obj.visibleIf = asIR(lowerR(show, cScope, ln));
    if (width && width !== true) {
      const w = lowerR(width, cScope, ln);
      if (typeof w !== 'number') {
        throw new CompileError('width must be a constant number', ln);
      }
      obj.strokeWidth = w;
    }
  }

  function run(stmts: Stmt[], cScope: CompileScope) {
    for (const s of stmts) emitStmt(s, cScope);
  }

  function emitStmt(s: Stmt, cScope: CompileScope) {
    switch (s.k) {
      case 'let': {
        (cScope as any)[s.name] = compileEval(s.value, cScope);
        break;
      }

      case 'def': {
        macros.set(s.name, { params: s.params, body: s.body });
        break;
      }

      case 'for_s': {
        const startV = cNum(s.start, cScope, s.ln);
        const endV = cNum(s.end, cScope, s.ln);
        const stepV = s.step ? cNum(s.step, cScope, s.ln) : 1;
        if (!(stepV > 0)) throw new CompileError('range step must be > 0', s.ln);
        let count = 0;
        for (let v = startV; v < endV - 1e-9; v += stepV) {
          if (++count > 5000) throw new CompileError('range exceeded 5000 iterations', s.ln);
          const iterScope = { ...cScope, [s.var]: Math.round(v * 1e9) / 1e9 };
          run(s.body, iterScope);
        }
        break;
      }

      case 'repeat_s': {
        const startV = cNum(s.start, cScope, s.ln);
        if (startV !== 0) throw new CompileError('repeat range must start at 0', s.ln);
        const count = lowerR(s.count, cScope, s.ln);

        const savedObjects = ir.objects;
        const savedRepeatVars = repeatVars;
        ir.objects = [];
        repeatVars = [...repeatVars, s.var];
        run(s.body, cScope);
        const body = ir.objects;
        ir.objects = savedObjects;
        repeatVars = savedRepeatVars;

        if (!body.length) throw new CompileError('repeat body has no objects', s.ln);
        ir.objects.push({
          id: `__repeat_${autoLabelId++}`,
          type: 'repeat',
          var: s.var,
          count,
          body,
        });
        break;
      }

      case 'if_s': {
        for (const { cond, body } of s.cases) {
          const take = cBool(cond, cScope, s.ln);
          if (take) {
            run(body, { ...cScope });
            return;
          }
        }
        if (s.elseBody) run(s.elseBody, { ...cScope });
        break;
      }

      case 'reveal': {
        const savedObjects = ir.objects;
        ir.objects = [];
        run(s.body, cScope);
        const revealed = ir.objects;
        ir.objects = savedObjects;
        if (!revealed.length) throw new CompileError('reveal body has no objects', s.ln);
        for (const obj of revealed) obj.phase = 'reveal';
        ir.objects.push(...revealed);
        break;
      }

      case 'call_s': {
        const macro = macros.get(s.fn);
        if (!macro) throw new CompileError(`undefined macro "${s.fn}"`, s.ln);
        if (s.args.length !== macro.params.length) {
          throw new CompileError(
            `"${s.fn}" expects ${macro.params.length} args, got ${s.args.length}`,
            s.ln
          );
        }
        const callScope: CompileScope = { ...cScope };
        for (let i = 0; i < macro.params.length; i++) {
          callScope[macro.params[i]] = compileEval(s.args[i], cScope);
        }
        run(macro.body, callScope);
        break;
      }

      case 'scene': {
        const xV = s.props.get('x');
        const yV = s.props.get('y');
        if (!xV || xV === true || xV.k !== 'list')
          throw new CompileError('scene needs x: [min, max]', s.ln);
        const isNumberline = s.spaceType === 'numberline';
        if (!isNumberline && (!yV || yV === true || yV.k !== 'list'))
          throw new CompileError('scene needs y: [min, max]', s.ln);
        const xD = xV.items.map((e) => cNum(e, cScope, s.ln)) as [number, number];
        const yD =
          yV && yV !== true && yV.k === 'list'
            ? (yV.items.map((e) => cNum(e, cScope, s.ln)) as [number, number])
            : undefined;
        ir.space = {
          type: s.spaceType,
          xDomain: xD,
          ...(yD && { yDomain: yD }),
          ...(s.props.has('grid') && { grid: true }),
          ...(s.props.has('axes') && { axes: true }),
        };
        run(s.children, cScope);
        break;
      }

      case 'param': {
        const init = cNum(s.init, cScope, s.ln);
        const varDef: any = { type: 'number', init };
        const range = s.props.get('range');
        if (range && range !== true && range.k === 'list' && range.items.length >= 2) {
          varDef.min = cNum(range.items[0], cScope, s.ln);
          varDef.max = cNum(range.items[1], cScope, s.ln);
        }
        const step = propNum(s.props, 'step', s.ln, cScope);
        if (step != null) varDef.step = step;
        ir.state[s.name] = varDef;
        break;
      }

      case 'bool_d': {
        ir.state[s.name] = { type: 'boolean', init: Boolean(compileEval(s.init, cScope)) };
        break;
      }

      case 'choice_d': {
        if (s.init.k !== 'str')
          throw new CompileError('choice init must be a string literal', s.ln);
        const optsExpr = s.props.get('options');
        if (!optsExpr || optsExpr === true || optsExpr.k !== 'list' || !optsExpr.items.length) {
          throw new CompileError('choice needs options: [...]', s.ln);
        }
        const options = optsExpr.items.map((item) => {
          if (item.k !== 'str') throw new CompileError('choice options must be strings', s.ln);
          return item.v;
        });
        if (!options.includes(s.init.v)) {
          throw new CompileError(`choice init "${s.init.v}" is not in options`, s.ln);
        }
        ir.state[s.name] = { type: 'enum', init: s.init.v, options };
        break;
      }

      case 'curve': {
        const id = evalId(s.id, cScope, s.ln);
        const obj: any = { id, type: 'curve' };
        if (s.expr.k === 'tuple') {
          // parametric: (x(t), y(t)) traced over t in [start, end]
          if (s.expr.items.length !== 2)
            throw new CompileError('a parametric curve is (x, y) — two components', s.ln);
          obj.xExpr = lowerR(s.expr.items[0], cScope, s.ln, ['t']);
          obj.yExpr = lowerR(s.expr.items[1], cScope, s.ln, ['t']);
          const t = s.props.get('t');
          if (!t || t === true || t.k !== 'list' || t.items.length < 2)
            throw new CompileError('a parametric curve needs t: [start, end]', s.ln);
          obj.tDomain = [cNum(t.items[0], cScope, s.ln), cNum(t.items[1], cScope, s.ln)];
          const steps = propNum(s.props, 'steps', s.ln, cScope);
          if (steps != null) obj.tSteps = steps;
        } else {
          obj.expr = lowerR(s.expr, cScope, s.ln, ['x']);
        }
        const where = s.props.get('where');
        if (where && where !== true) obj.where = asIR(lowerR(where, cScope, s.ln, ['x']));
        applyCommon(obj, s.props, cScope, s.ln);
        ir.objects.push(obj);
        break;
      }

      case 'area': {
        const id = evalId(s.id, cScope, s.ln);
        const obj: any = { id, type: 'area', expr: lowerR(s.expr, cScope, s.ln, ['x']) };
        const lowerB = s.props.get('lower');
        if (lowerB && lowerB !== true) obj.lower = lowerR(lowerB, cScope, s.ln, ['x']);
        const from = propLowerR(s.props, 'from', cScope, s.ln);
        const to = propLowerR(s.props, 'to', cScope, s.ln);
        if (from != null) obj.from = from;
        if (to != null) obj.to = to;
        const opacity = propNum(s.props, 'opacity', s.ln, cScope);
        if (opacity != null) obj.opacity = opacity;
        applyCommon(obj, s.props, cScope, s.ln);
        ir.objects.push(obj);
        break;
      }

      case 'point': {
        const id = evalId(s.id, cScope, s.ln);
        const obj: any = { id, type: 'point' };
        if (s.pos) {
          const [x, y] = lowerPairR(s.pos, cScope, s.ln);
          obj.x = x;
          obj.y = y;
        } else {
          obj.x = 0;
          obj.y = 0;
        }
        const r = propNum(s.props, 'r', s.ln, cScope);
        if (r != null) obj.r = r;
        const label = propStr(s.props, 'label', cScope);
        if (label) obj.label = liveText(label, cScope, s.ln);
        const drag = s.props.get('drag');
        if (drag && drag !== true) {
          if (drag.k !== 'arrow') throw new CompileError('drag must be axis -> bind', s.ln);
          if (drag.from.k === 'call' && drag.from.fn === 'along') {
            if (drag.from.args.length !== 1 || drag.from.args[0].k !== 'id') {
              throw new CompileError('along(...) takes one object id', s.ln);
            }
            if (drag.to.k !== 'id') throw new CompileError('along(...) -> binds one param', s.ln);
            obj.draggable = {
              bind: bindTo(drag.to.name, 'drag', s.ln),
              along: { ref: drag.from.args[0].name },
            };
          } else {
            const axis = drag.from.k === 'id' ? drag.from.name : ser(drag.from, cScope);
            if (drag.to.k === 'id') {
              obj.draggable = { axis, bind: bindTo(drag.to.name, 'drag', s.ln) };
            } else if (drag.to.k === 'tuple' && drag.to.items.length === 2) {
              const bindX =
                drag.to.items[0].k === 'id' ? drag.to.items[0].name : ser(drag.to.items[0], cScope);
              const bindY =
                drag.to.items[1].k === 'id' ? drag.to.items[1].name : ser(drag.to.items[1], cScope);
              obj.draggable = {
                axis,
                bind: bindTo(bindX, 'drag', s.ln),
                bindY: bindTo(bindY, 'drag', s.ln),
              };
            }
            const snap = s.props.get('snap');
            if (snap && snap !== true) obj.draggable.snap = parseSnap(snap, s.ln);
          }
        }
        applyCommon(obj, s.props, cScope, s.ln);
        ir.objects.push(obj);
        break;
      }

      case 'line': {
        const id = evalId(s.id, cScope, s.ln);
        const obj: any = { id, type: 'line' };
        if (s.seg) {
          const [x1, y1] = lowerPairR(s.seg[0], cScope, s.ln);
          const [x2, y2] = lowerPairR(s.seg[1], cScope, s.ln);
          obj.x1 = x1;
          obj.y1 = y1;
          obj.x2 = x2;
          obj.y2 = y2;
        } else {
          const through = propStr(s.props, 'through', cScope);
          const slope = propLowerR(s.props, 'slope', cScope, s.ln);
          if (through) {
            if (!ir.objects.some((o: any) => o.id === through)) {
              throw new CompileError(
                `line goes through "${through}" but no such object exists yet${suggest(
                  through,
                  ir.objects.map((o: any) => o.id)
                )}`,
                s.ln
              );
            }
            obj.through = through;
          }
          if (slope != null) obj.slope = slope;
        }
        applyCommon(obj, s.props, cScope, s.ln);
        ir.objects.push(obj);
        break;
      }

      case 'label': {
        const id = s.id ? evalId(s.id, cScope, s.ln) : `__lbl_${autoLabelId++}`;
        if (s.at.k !== 'tuple' || s.at.items.length < 2) {
          throw new CompileError('label at needs a (x, y) position', s.ln);
        }
        const x = lowerR(s.at.items[0], cScope, s.ln);
        const y = lowerR(s.at.items[1], cScope, s.ln);
        let text;
        if (s.text.k === 'str') {
          const folded = s.text.fstr ? evalFstr(s.text.v, cScope) : s.text.v;
          text = liveText(folded, cScope, s.ln);
        } else {
          // a bare expression as text renders as its live value
          text = { parts: [asIR(lowerR(s.text, cScope, s.ln))] };
        }
        const obj: any = { id, type: 'label', x, y, text };
        const size = propNum(s.props, 'size', s.ln, cScope);
        if (size != null) obj.fontSize = size;
        if (s.props.has('tex')) obj.tex = true;
        applyCommon(obj, s.props, cScope, s.ln);
        ir.objects.push(obj);
        break;
      }

      case 'rect': {
        const id = evalId(s.id, cScope, s.ln);
        const [x, y] = lowerPairR(s.pos, cScope, s.ln);
        const w = propLowerR(s.props, 'w', cScope, s.ln);
        const h = propLowerR(s.props, 'h', cScope, s.ln);
        if (w == null || h == null) throw new CompileError('rect needs w: and h: props', s.ln);
        const obj: any = { id, type: 'rect', x, y, w, h };
        const opacity = propNum(s.props, 'opacity', s.ln, cScope);
        if (opacity != null) obj.opacity = opacity;
        applyCommon(obj, s.props, cScope, s.ln);
        ir.objects.push(obj);
        break;
      }

      case 'circle': {
        const id = evalId(s.id, cScope, s.ln);
        const [x, y] = lowerPairR(s.center, cScope, s.ln);
        const r = propLowerR(s.props, 'r', cScope, s.ln);
        if (r == null) throw new CompileError('circle needs an r: prop', s.ln);
        const obj: any = { id, type: 'circle', x, y, r };
        const opacity = propNum(s.props, 'opacity', s.ln, cScope);
        if (opacity != null) obj.opacity = opacity;
        applyCommon(obj, s.props, cScope, s.ln);
        ir.objects.push(obj);
        break;
      }

      case 'polygon': {
        const id = evalId(s.id, cScope, s.ln);
        const points = s.pts.map((pt) => {
          if (pt.k !== 'tuple' || pt.items.length < 2)
            throw new CompileError('polygon point must be (x, y)', s.ln);
          return [lowerR(pt.items[0], cScope, s.ln), lowerR(pt.items[1], cScope, s.ln)] as [
            string | number,
            string | number,
          ];
        });
        const obj: any = { id, type: 'polygon', points };
        const opacity = propNum(s.props, 'opacity', s.ln, cScope);
        if (opacity != null) obj.opacity = opacity;
        applyCommon(obj, s.props, cScope, s.ln);
        ir.objects.push(obj);
        break;
      }

      case 'vector': {
        const id = evalId(s.id, cScope, s.ln);
        const [x1, y1] = lowerPairR(s.from, cScope, s.ln);
        const [x2, y2] = lowerPairR(s.to, cScope, s.ln);
        const obj: any = { id, type: 'vector', x1, y1, x2, y2 };
        applyCommon(obj, s.props, cScope, s.ln);
        ir.objects.push(obj);
        break;
      }

      case 'arc': {
        const id = evalId(s.id, cScope, s.ln);
        const [x, y] = lowerPairR(s.center, cScope, s.ln);
        const r = propLowerR(s.props, 'r', cScope, s.ln);
        const start = propLowerR(s.props, 'from', cScope, s.ln);
        const end = propLowerR(s.props, 'to', cScope, s.ln);
        if (r == null) throw new CompileError('arc needs an r: prop', s.ln);
        if (start == null || end == null)
          throw new CompileError('arc needs from: and to: props', s.ln);
        const obj: any = { id, type: 'arc', x, y, r, start, end };
        applyCommon(obj, s.props, cScope, s.ln);
        ir.objects.push(obj);
        break;
      }

      case 'slider': {
        const ctrl: any = { as: 'slider', bind: bindTo(s.bind, 'slider', s.ln) };
        const label = propStr(s.props, 'label', cScope);
        if (label) ctrl.label = label;
        const min = propNum(s.props, 'min', s.ln, cScope);
        const max = propNum(s.props, 'max', s.ln, cScope);
        const step = propNum(s.props, 'step', s.ln, cScope);
        if (min != null) ctrl.min = min;
        if (max != null) ctrl.max = max;
        if (step != null) ctrl.step = step;
        ir.controls.push(ctrl);
        break;
      }

      case 'toggle': {
        const ctrl: any = { as: 'toggle', bind: bindTo(s.bind, 'toggle', s.ln) };
        const label = propStr(s.props, 'label', cScope);
        if (label) ctrl.label = label;
        ir.controls.push(ctrl);
        break;
      }

      case 'stepper': {
        const ctrl: any = { as: 'stepper', bind: bindTo(s.bind, 'stepper', s.ln) };
        const label = propStr(s.props, 'label', cScope);
        const step = propNum(s.props, 'step', s.ln, cScope);
        if (label) ctrl.label = label;
        if (step != null) ctrl.step = step;
        ir.controls.push(ctrl);
        break;
      }

      case 'picker': {
        const bind = bindTo(s.bind, 'picker', s.ln);
        if (ir.state[bind].type !== 'enum') {
          throw new CompileError(`picker binds "${bind}" but it isn't a choice state`, s.ln);
        }
        const ctrl: any = { as: 'picker', bind };
        const label = propStr(s.props, 'label', cScope);
        if (label) ctrl.label = label;
        ir.controls.push(ctrl);
        break;
      }

      case 'button': {
        const ctrl: any = { as: 'button', label: s.label };
        const set = propDict(s.props, 'set', s.ln);
        const step = propDict(s.props, 'step', s.ln);
        const animate = propDict(s.props, 'animate', s.ln);
        const toggle = propStr(s.props, 'toggle', cScope);
        const dur = propNum(s.props, 'dur', s.ln, cScope);
        const ease = propStr(s.props, 'ease', cScope);
        for (const d of [set, step, animate]) {
          if (d) Object.keys(d).forEach((k) => bindTo(k, 'button', s.ln));
        }
        if (set) ctrl.set = set;
        if (step) ctrl.step = step;
        if (animate) ctrl.animate = animate;
        if (toggle) ctrl.toggle = bindTo(toggle, 'button toggle', s.ln);
        if (dur != null) ctrl.duration = dur;
        if (ease) ctrl.ease = ease;
        ir.controls.push(ctrl);
        break;
      }

      case 'step': {
        const obj: any = {};
        if (s.narrate) obj.narrate = s.narrate;
        const set = propDict(s.props, 'set', s.ln);
        const animate = propDict(s.props, 'animate', s.ln);
        for (const d of [set, animate]) {
          if (d) Object.keys(d).forEach((k) => bindTo(k, 'step', s.ln));
        }
        const dur = propNum(s.props, 'dur', s.ln, cScope);
        const ease = propStr(s.props, 'ease', cScope);
        if (set) obj.set = set;
        if (animate) obj.animate = animate;
        if (dur != null) obj.duration = dur;
        if (ease) obj.ease = ease;
        ir.timeline.push(obj);
        break;
      }
    }
  }

  run(stmts, {});

  if (!ir.space) throw new CompileError('missing scene declaration');
  if (!ir.controls.length) delete ir.controls;
  if (!ir.timeline.length) delete ir.timeline;

  const result = sceneSchema.safeParse(ir);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new CompileError(`invalid scene IR: ${first.path.join('.')} - ${first.message}`);
  }
  return result.data;
}

// --- lesson emission --------------------------------------------------------

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function pStr(props: PropMap, key: string): string | undefined {
  const v = props.get(key);
  if (v && v !== true && v.k === 'str') return v.v;
  return undefined;
}

function pStrList(props: PropMap, key: string): string[] | undefined {
  const v = props.get(key);
  if (v && v !== true && v.k === 'list') {
    return v.items.map((e) => (e.k === 'str' ? e.v : ''));
  }
  return undefined;
}

function emitQuiz(s: Extract<Stmt, { k: 'quiz' }>) {
  if (!s.common.ask) throw new CompileError('quiz needs an ask "..."', s.ln);
  const correct = s.options.findIndex((o) => o.correct);
  if (correct < 0) throw new CompileError('quiz needs a * correct option', s.ln);
  return {
    kind: 'quiz' as const,
    prompt: s.common.ask,
    options: s.options.map((o) => ({ text: o.text, ...(o.why && { why: o.why }) })),
    correct,
    hints: s.common.hints,
    ...(s.common.explanation && { explanation: s.common.explanation }),
    ...(s.common.skill && { skill: s.common.skill }),
  };
}

function emitNumeric(s: Extract<Stmt, { k: 'numeric' }>) {
  if (!s.common.ask) throw new CompileError('numeric needs an ask "..."', s.ln);
  if (!s.answers.length) throw new CompileError('numeric needs an answer: <number>', s.ln);
  // answers/tolerance fold to constants at compile time (e.g. 64/3, sqrt(2))
  const answers = s.answers.map((a) => cNum(a, {}, s.ln));
  const tolerance = s.tolerance ? cNum(s.tolerance, {}, s.ln) : 1e-6;
  if (tolerance < 0) throw new CompileError('tolerance must not be negative', s.ln);
  return {
    kind: 'numeric' as const,
    prompt: s.common.ask,
    answers,
    tolerance,
    ...(s.unit && { unit: s.unit }),
    hints: s.common.hints,
    ...(s.common.explanation && { explanation: s.common.explanation }),
    ...(s.common.skill && { skill: s.common.skill }),
  };
}

function emitBuild(s: Extract<Stmt, { k: 'build' }>) {
  if (!s.common.ask) throw new CompileError('build needs an ask "..."', s.ln);
  if (!s.bank.length) throw new CompileError('build needs a bank: [...]', s.ln);
  if (!s.answers.length) throw new CompileError('build needs an answer: [...]', s.ln);
  const bank = s.bank.map((label) => ({
    id: label,
    label,
    kind: /^[a-zA-Z0-9]/.test(label) ? ('operand' as const) : ('operator' as const),
  }));
  return {
    kind: 'build' as const,
    prompt: s.common.ask,
    bank,
    answers: s.answers,
    slots: s.slots ?? s.answers[0].length,
    ...(s.reusable && { reusable: true }),
    hints: s.common.hints,
    ...(s.common.explanation && { explanation: s.common.explanation }),
    ...(s.common.skill && { skill: s.common.skill }),
  };
}

function emitHotspot(s: Extract<Stmt, { k: 'hotspot' }>) {
  if (!s.common.ask) throw new CompileError('hotspot needs an ask "..."', s.ln);
  if (!s.target) throw new CompileError('hotspot needs a target rect/circle', s.ln);
  const t = s.target;
  if (t.pos.k !== 'tuple' || t.pos.items.length < 2) {
    throw new CompileError('target needs a (x, y) position', s.ln);
  }
  const x = cNum(t.pos.items[0], {}, s.ln);
  const y = cNum(t.pos.items[1], {}, s.ln);

  let target:
    | { kind: 'rect'; x: number; y: number; w: number; h: number }
    | { kind: 'circle'; x: number; y: number; r: number };
  if (t.kind === 'rect') {
    const w = t.props.get('w');
    const h = t.props.get('h');
    if (!w || w === true || !h || h === true) {
      throw new CompileError('target rect needs w: and h: props', s.ln);
    }
    target = { kind: 'rect', x, y, w: cNum(w, {}, s.ln), h: cNum(h, {}, s.ln) };
  } else {
    const r = t.props.get('r');
    if (!r || r === true) throw new CompileError('target circle needs an r: prop', s.ln);
    target = { kind: 'circle', x, y, r: cNum(r, {}, s.ln) };
  }

  return {
    kind: 'hotspot' as const,
    prompt: s.common.ask,
    target,
    ...(s.miss && { miss: s.miss }),
    hints: s.common.hints,
    ...(s.common.explanation && { explanation: s.common.explanation }),
    ...(s.common.skill && { skill: s.common.skill }),
  };
}

function tuplePair(e: Expr, ln: number, what: string): [number, number] {
  if (e.k !== 'tuple' || e.items.length < 2) throw new CompileError(`${what} needs a (x, y)`, ln);
  return [cNum(e.items[0], {}, ln), cNum(e.items[1], {}, ln)];
}

function emitSketch(s: Extract<Stmt, { k: 'sketch' }>) {
  if (!s.common.ask) throw new CompileError('sketch needs an ask "..."', s.ln);

  if (s.mode === 'line') {
    if (!s.through) throw new CompileError('sketch line needs a through (x, y) point', s.ln);
    if (!s.slope) throw new CompileError('sketch line needs a slope: <n>', s.ln);
    const through = tuplePair(s.through, s.ln, 'through');
    const slope = cNum(s.slope, {}, s.ln);
    const tol = s.tol ? cNum(s.tol, {}, s.ln) : 0.4;
    const slopeTol = s.slopeTol ? cNum(s.slopeTol, {}, s.ln) : 0.5;
    if (tol < 0 || slopeTol < 0) throw new CompileError('tolerance must not be negative', s.ln);
    return {
      kind: 'sketch' as const,
      mode: 'line' as const,
      prompt: s.common.ask,
      through,
      slope,
      tol,
      slopeTol,
      hints: s.common.hints,
      ...(s.common.explanation && { explanation: s.common.explanation }),
      ...(s.common.skill && { skill: s.common.skill }),
    };
  }

  if (!s.near.length) {
    throw new CompileError(`sketch ${s.mode} needs at least one near (x, y)`, s.ln);
  }
  const targets = s.near.map((t) => tuplePair(t, s.ln, 'near'));
  const tol = s.tol ? cNum(s.tol, {}, s.ln) : s.mode === 'curve' ? 0.5 : 0.4;
  if (tol < 0) throw new CompileError('tolerance must not be negative', s.ln);
  return {
    kind: 'sketch' as const,
    mode: s.mode,
    prompt: s.common.ask,
    targets,
    tol,
    hints: s.common.hints,
    ...(s.common.explanation && { explanation: s.common.explanation }),
    ...(s.common.skill && { skill: s.common.skill }),
  };
}

function emitMatch(s: Extract<Stmt, { k: 'match' }>) {
  if (!s.common.ask) throw new CompileError('match needs an ask "..."', s.ln);
  if (s.pairs.length < 2) throw new CompileError('match needs at least 2 pair lines', s.ln);
  const pairs = s.pairs.map(([l, r]) => {
    if (l.k !== 'str') throw new CompileError('pair left side must be a string', s.ln);
    if (r.k !== 'str') throw new CompileError('pair right side must be a string', s.ln);
    return { left: l.v, right: r.v };
  });
  return {
    kind: 'match' as const,
    prompt: s.common.ask,
    pairs,
    ...(s.decoys.length && { decoys: s.decoys }),
    hints: s.common.hints,
    ...(s.common.explanation && { explanation: s.common.explanation }),
    ...(s.common.skill && { skill: s.common.skill }),
  };
}

function emitGoal(s: Extract<Stmt, { k: 'goal' }>) {
  const whenExpr = s.props.get('when');
  if (!whenExpr || whenExpr === true) throw new CompileError('goal needs a when: condition', s.ln);
  const when = asIR(lower(whenExpr, {}));
  const hint = pStr(s.props, 'hint');
  return { prompt: s.prompt, when, ...(hint && { hint }) };
}

function emitSlide(s: SlideStmt, i: number) {
  const id = pStr(s.props, 'id') || slug(s.title) || `slide-${i + 1}`;
  const prose: string[] = [];
  let scene: SceneIR | undefined;
  let exercise:
    | ReturnType<typeof emitQuiz>
    | ReturnType<typeof emitNumeric>
    | ReturnType<typeof emitBuild>
    | ReturnType<typeof emitHotspot>
    | ReturnType<typeof emitSketch>
    | ReturnType<typeof emitMatch>
    | undefined;
  const goals: ReturnType<typeof emitGoal>[] = [];

  for (const item of s.items) {
    if (item.k === 'prose') {
      prose.push(item.text);
    } else if (item.k === 'scene') {
      if (scene) throw new CompileError('a slide can have at most one scene', item.ln);
      scene = emit([item]);
    } else if (item.k === 'quiz') {
      if (exercise) throw new CompileError('a slide can have at most one exercise', item.ln);
      exercise = emitQuiz(item);
    } else if (item.k === 'numeric') {
      if (exercise) throw new CompileError('a slide can have at most one exercise', item.ln);
      exercise = emitNumeric(item);
    } else if (item.k === 'build') {
      if (exercise) throw new CompileError('a slide can have at most one exercise', item.ln);
      exercise = emitBuild(item);
    } else if (item.k === 'hotspot') {
      if (exercise) throw new CompileError('a slide can have at most one exercise', item.ln);
      exercise = emitHotspot(item);
    } else if (item.k === 'sketch') {
      if (exercise) throw new CompileError('a slide can have at most one exercise', item.ln);
      exercise = emitSketch(item);
    } else if (item.k === 'match') {
      if (exercise) throw new CompileError('a slide can have at most one exercise', item.ln);
      exercise = emitMatch(item);
    } else if (item.k === 'goal') {
      goals.push(emitGoal(item));
    }
  }

  const category = pStr(s.props, 'cat');
  const skill = pStr(s.props, 'skill');
  return {
    id,
    title: s.title,
    ...(category && { category }),
    ...(skill && { skill }),
    ...(prose.length && { prose: prose.join('\n\n') }),
    ...(scene && { scene }),
    ...(exercise && { exercise }),
    ...(goals.length && { goals }),
  };
}

export function emitLesson(stmts: Stmt[]): LessonIR {
  const root = stmts[0];
  if (!root || root.k !== 'lesson') throw new CompileError('expected a lesson block');

  const course = pStr(root.props, 'course');
  const skills = pStrList(root.props, 'skills');
  const ir = {
    version: 2 as const,
    title: root.title,
    ...(course && { course }),
    ...(skills && { skills }),
    slides: root.slides.map(emitSlide),
  };

  const result = lessonSchema.safeParse(ir);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new CompileError(`invalid lesson IR: ${first.path.join('.')} - ${first.message}`);
  }
  return result.data;
}
