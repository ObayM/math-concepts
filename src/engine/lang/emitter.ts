import type { Expr, PropMap, Stmt, SlideStmt, Branch } from './ast';
import type { SceneIR } from '@/engine/ir/types';
import type { LessonIR } from '@/engine/ir/lesson';
import type { ExprIR, NumExpr, UnOp, BinOp, Value } from '@/engine/expr';
import { sceneSchema, MAX_CURVE_STEPS } from '@/engine/ir/schema';
import { lessonSchema } from '@/engine/ir/lesson';
import { evalExpr, ExprError, BUILTINS, BUILTIN_NAMES, CONSTS } from '@/engine/expr';
import { lex } from './lexer';
import { parseExprTokens } from './parser';
import { CompileError } from './errors';
import { splitTemplate, countSlots, type TemplateSeg } from './template';
import { memoryRefs } from '@/engine/runtime/memory';
import { variantScope } from '@/engine/runtime/variant';
import {
  applyRoles,
  roleColor,
  isColorToken,
  COLOR_TOKENS,
  type Roles,
  type ColorToken,
} from '@/engine/roles';
import { LESSON_DIFFICULTIES, LESSON_ICONS, SLIDE_BEATS } from './icons';

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

function freeIds(e: Expr): string[] {
  switch (e.k) {
    case 'id':
      return [e.name];
    case 'un':
      return freeIds(e.e);
    case 'bin':
      return [...freeIds(e.l), ...freeIds(e.r)];
    case 'call':
      return e.args.flatMap(freeIds);
    case 'tuple':
    case 'list':
      return e.items.flatMap(freeIds);
    default:
      return [];
  }
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

export function emit(stmts: Stmt[], seedMacros?: Macros, roles: Roles = {}): SceneIR {
  const ir: any = { version: 2, state: {}, space: null, objects: [], controls: [], timeline: [] };
  const macros: Macros = seedMacros ? new Map(seedMacros) : new Map();
  const morphs: { from: string; to: string; by: ExprIR; ln: number }[] = [];
  const attention: { ids: string[]; key: string; ln: number }[] = [];
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

  function lowerTripleR(expr: Expr, cScope: CompileScope, ln: number): [NumExpr, NumExpr, NumExpr] {
    if (expr.k !== 'tuple' || expr.items.length !== 3) {
      throw new CompileError('expected an (x, y, z) triple', ln);
    }
    return [
      lowerR(expr.items[0], cScope, ln),
      lowerR(expr.items[1], cScope, ln),
      lowerR(expr.items[2], cScope, ln),
    ];
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
    if (color) obj.color = roleColor(color, roles);
    if (color && roles[color]) obj.role = color;
    const alpha = props.get('alpha');
    if (alpha && alpha !== true) obj.alpha = lowerR(alpha, cScope, ln);
    const draw = props.get('draw');
    if (draw && draw !== true) obj.draw = lowerR(draw, cScope, ln);
    const ghost = props.get('ghost');
    if (ghost !== undefined) {
      if (ghost === true || ghost.k !== 'dict' || ghost.entries.length !== 1)
        throw new CompileError('ghost: takes one param and its values, like { a: [1, 2, 3] }', ln);
      const [param, list] = ghost.entries[0];
      if (!(param in ir.state))
        throw new CompileError(
          `ghost: "${param}" is not a param here${suggest(param, Object.keys(ir.state))}`,
          ln
        );
      if (list.k !== 'list' || !list.items.length || list.items.length > 12)
        throw new CompileError('ghost: needs a list of 1 to 12 values', ln);
      obj.ghost = { param, values: list.items.map((e) => cNum(e, cScope, ln)) };
    }
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
        if (repeatVars.includes(s.var))
          throw new CompileError(
            `repeat variable "${s.var}" is already used by an enclosing repeat`,
            s.ln
          );
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
        const live = (e: Expr) => freeIds(e).some((n) => !(n in cScope) && !(n in CONSTS));
        const xLive = xV.items.some(live);
        const yLive = yV && yV !== true && yV.k === 'list' && yV.items.some(live);
        if ((xLive || yLive) && isNumberline)
          throw new CompileError('a numberline cannot zoom; its x: must be constant', s.ln);
        const xD = xLive
          ? ([0, 1] as [number, number])
          : (xV.items.map((e) => cNum(e, cScope, s.ln)) as [number, number]);
        const yD =
          yV && yV !== true && yV.k === 'list'
            ? yLive
              ? ([0, 1] as [number, number])
              : (yV.items.map((e) => cNum(e, cScope, s.ln)) as [number, number])
            : undefined;
        const is3 = s.spaceType === 'space3';
        const zV = s.props.get('z');
        if (is3 && (!zV || zV === true || zV.k !== 'list'))
          throw new CompileError('a space3 scene needs z: [min, max]', s.ln);
        if (!is3 && zV) throw new CompileError('z: only means something in a space3 scene', s.ln);
        const zD =
          zV && zV !== true && zV.k === 'list'
            ? (zV.items.map((e) => cNum(e, cScope, s.ln)) as [number, number])
            : undefined;
        const camRaw = s.props.get('camera');
        if (camRaw && !is3)
          throw new CompileError('camera: only means something in a space3 scene', s.ln);
        if (camRaw && camRaw !== true && (camRaw.k !== 'list' || camRaw.items.length !== 2))
          throw new CompileError('camera: [azimuth, elevation] in degrees', s.ln);
        const axesRaw = s.props.get('axes');
        const axesV =
          axesRaw === undefined || axesRaw === true ? true : cBool(axesRaw, cScope, s.ln);
        const aspectV = s.props.get('aspect');
        if (aspectV !== undefined) {
          if (aspectV === true || aspectV.k !== 'id' || aspectV.name !== 'equal')
            throw new CompileError('aspect must be "equal"', s.ln);
          if (isNumberline)
            throw new CompileError('aspect: equal has no meaning on a numberline', s.ln);
        }
        ir.space = {
          type: s.spaceType,
          xDomain: xD,
          ...(yD && { yDomain: yD }),
          ...(zD && { zDomain: zD }),
          ...(s.props.has('grid') && { grid: true }),
          ...(s.props.has('axes') && { axes: axesV !== false }),
          ...(aspectV !== undefined && { aspect: 'equal' }),
        };
        const altV = s.props.get('alt');
        if (altV !== undefined) {
          if (altV === true || altV.k !== 'str' || !altV.v.trim())
            throw new CompileError('alt: needs a string describing the scene', s.ln);
          ir.space.alt = altV.v;
        }
        run(s.children, cScope);
        const viewOf = (list: Extract<Expr, { k: 'list' }>, axis: string) => {
          if (list.items.length !== 2) throw new CompileError(`${axis}: needs [min, max]`, s.ln);
          const view = list.items.map((e) => asIR(lowerR(e, cScope, s.ln))) as [ExprIR, ExprIR];
          const init: Record<string, Value> = {};
          for (const [k, d] of Object.entries(ir.state)) init[k] = (d as { init: Value }).init;
          const at = view.map((e) => evalExpr(e, init as never)) as [number, number];
          if (!(typeof at[0] === 'number' && typeof at[1] === 'number' && at[1] > at[0]))
            throw new CompileError(
              `${axis}: starts out empty; max has to be bigger than min`,
              s.ln
            );
          return { view, at };
        };
        if (xLive) {
          const { view, at } = viewOf(xV, 'x');
          ir.space.xView = view;
          ir.space.xDomain = at;
        }
        if (yLive && yV && typeof yV !== 'boolean' && yV.k === 'list') {
          const { view, at } = viewOf(yV, 'y');
          ir.space.yView = view;
          ir.space.yDomain = at;
        }
        // the camera usually spins on a param declared inside the scene, so it
        // can only be lowered once the children have registered their state
        if (camRaw && camRaw !== true && camRaw.k === 'list') {
          ir.space.camera = [
            lowerR(camRaw.items[0], cScope, s.ln),
            lowerR(camRaw.items[1], cScope, s.ln),
          ];
        }
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
        if (s.props.get('keep') === true) varDef.keep = true;
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
          if (steps != null) {
            if (!Number.isInteger(steps) || steps < 2 || steps > MAX_CURVE_STEPS)
              throw new CompileError(
                `steps: must be a whole number from 2 to ${MAX_CURVE_STEPS}, got ${steps}`,
                s.ln
              );
            obj.tSteps = steps;
          }
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
        if (s.props.get('open')) obj.open = true;
        if (s.props.get('trace') === true) obj.trace = true;
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
            const ref = drag.from.args[0].name;
            const target = ir.objects.find((o: any) => o.id === ref);
            if (!target) {
              throw new CompileError(
                `along("${ref}") but no such object exists yet${suggest(
                  ref,
                  ir.objects.map((o: any) => o.id)
                )}`,
                s.ln
              );
            }
            if (target.type !== 'circle' && target.type !== 'line') {
              throw new CompileError(
                `along(...) needs a circle or a two-point line, but "${ref}" is a ${target.type}`,
                s.ln
              );
            }
            if (target.type === 'line' && target.x1 == null) {
              throw new CompileError(
                `along("${ref}") needs a two-point line, not one defined by through:/slope:`,
                s.ln
              );
            }
            obj.draggable = {
              bind: bindTo(drag.to.name, 'drag', s.ln),
              along: { ref },
            };
          } else {
            if (drag.from.k !== 'id' || !['x', 'y', 'xy'].includes(drag.from.name)) {
              throw new CompileError('drag axis must be x, y, or xy', s.ln);
            }
            const axis = drag.from.name;
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
            } else {
              throw new CompileError(
                'drag binds one param (axis -> p) or two (xy -> (px, py))',
                s.ln
              );
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
        const anchor = s.props.get('anchor');
        if (anchor !== undefined) {
          if (
            anchor === true ||
            anchor.k !== 'id' ||
            !['start', 'middle', 'end'].includes(anchor.name)
          )
            throw new CompileError('anchor must be start, middle, or end', s.ln);
          obj.anchor = anchor.name;
        }
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
        const rotate = propLowerR(s.props, 'rotate', cScope, s.ln);
        if (rotate != null) obj.rotate = rotate;
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
        const rotate = propLowerR(s.props, 'rotate', cScope, s.ln);
        if (rotate != null) obj.rotate = rotate;
        const opacity = propNum(s.props, 'opacity', s.ln, cScope);
        if (opacity != null) obj.opacity = opacity;
        applyCommon(obj, s.props, cScope, s.ln);
        ir.objects.push(obj);
        break;
      }

      case 'point3': {
        const id = evalId(s.id, cScope, s.ln);
        const [x, y, z] = lowerTripleR(s.pos, cScope, s.ln);
        const obj: any = { id, type: 'point3', x, y, z };
        const r = propNum(s.props, 'r', s.ln, cScope);
        if (r != null) obj.r = r;
        if (s.props.has('open')) obj.open = true;
        if (s.props.has('guides')) obj.guides = true;
        const label = propStr(s.props, 'label', cScope);
        if (label) obj.label = liveText(label, cScope, s.ln);
        applyCommon(obj, s.props, cScope, s.ln);
        ir.objects.push(obj);
        break;
      }

      case 'segment3': {
        const id = evalId(s.id, cScope, s.ln);
        const [x1, y1, z1] = lowerTripleR(s.from, cScope, s.ln);
        const [x2, y2, z2] = lowerTripleR(s.to, cScope, s.ln);
        const obj: any = { id, type: 'segment3', x1, y1, z1, x2, y2, z2 };
        if (s.props.has('arrow')) obj.arrow = true;
        const label = propStr(s.props, 'label', cScope);
        if (label) obj.label = liveText(label, cScope, s.ln);
        applyCommon(obj, s.props, cScope, s.ln);
        ir.objects.push(obj);
        break;
      }

      case 'polygon3': {
        const id = evalId(s.id, cScope, s.ln);
        const points = s.pts.map((pt) => lowerTripleR(pt, cScope, s.ln));
        const obj: any = { id, type: 'polygon3', points };
        const opacity = propNum(s.props, 'opacity', s.ln, cScope);
        if (opacity != null) obj.opacity = opacity;
        const fill = propStr(s.props, 'fill', cScope);
        if (fill) obj.fill = fill;
        applyCommon(obj, s.props, cScope, s.ln);
        ir.objects.push(obj);
        break;
      }

      case 'plane3': {
        const id = evalId(s.id, cScope, s.ln);
        const normal = s.props.get('normal');
        const through = s.props.get('through');
        if (!normal || normal === true)
          throw new CompileError('plane3 needs a normal: (a, b, c)', s.ln);
        if (!through || through === true)
          throw new CompileError('plane3 needs a through: (x, y, z) point on it', s.ln);
        const [nx, ny, nz] = lowerTripleR(normal, cScope, s.ln);
        if ([nx, ny, nz].every((v) => v === 0))
          throw new CompileError('plane3 normal cannot be the zero vector', s.ln);
        const obj: any = {
          id,
          type: 'plane3',
          nx,
          ny,
          nz,
          through: lowerTripleR(through, cScope, s.ln),
        };
        const size = propNum(s.props, 'size', s.ln, cScope);
        if (size != null) obj.size = size;
        const opacity = propNum(s.props, 'opacity', s.ln, cScope);
        if (opacity != null) obj.opacity = opacity;
        const fill = propStr(s.props, 'fill', cScope);
        if (fill) obj.fill = fill;
        const label = propStr(s.props, 'label', cScope);
        if (label) obj.label = liveText(label, cScope, s.ln);
        applyCommon(obj, s.props, cScope, s.ln);
        ir.objects.push(obj);
        break;
      }

      case 'label3': {
        const [x, y, z] = lowerTripleR(s.at, cScope, s.ln);
        const obj: any = {
          id: s.id ? evalId(s.id, cScope, s.ln) : `label3-${ir.objects.length}`,
          type: 'label3',
          x,
          y,
          z,
          text:
            s.text.k === 'str'
              ? liveText(s.text.fstr ? evalFstr(s.text.v, cScope) : s.text.v, cScope, s.ln)
              : { parts: [asIR(lowerR(s.text, cScope, s.ln))] },
        };
        const fontSize = propNum(s.props, 'fontSize', s.ln, cScope);
        if (fontSize != null) obj.fontSize = fontSize;
        if (s.props.has('tex')) obj.tex = true;
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

      case 'image': {
        const id = evalId(s.id, cScope, s.ln);
        const [x, y] = lowerPairR(s.pos, cScope, s.ln);
        const w = propLowerR(s.props, 'w', cScope, s.ln);
        const h = propLowerR(s.props, 'h', cScope, s.ln);
        if (w == null || h == null) throw new CompileError('image needs w: and h: props', s.ln);
        const src = propStr(s.props, 'src', cScope);
        if (!src) throw new CompileError('image needs a src: prop', s.ln);
        if (!/^(https?:\/\/|data:image\/|\/)/i.test(src)) {
          throw new CompileError(
            'image src must be an http(s) URL, a data:image/ URI, or a root-relative path',
            s.ln
          );
        }
        const alt = propStr(s.props, 'alt', cScope);
        if (!alt) throw new CompileError('image needs an alt: prop — describe what it shows', s.ln);
        const obj: any = { id, type: 'image', x, y, w, h, src, alt };
        const opacity = propNum(s.props, 'opacity', s.ln, cScope);
        if (opacity != null) obj.opacity = opacity;
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

      case 'morph': {
        const by = s.props.get('by');
        if (!by || by === true) throw new CompileError('morph needs by: <param from 0 to 1>', s.ln);
        morphs.push({ from: s.from, to: s.to, by: asIR(lowerR(by, cScope, s.ln)), ln: s.ln });
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
        const hint = propStr(s.props, 'hint', cScope);
        const wait = s.props.get('wait');
        if (wait && wait !== true) obj.wait = asIR(lowerR(wait, cScope, s.ln));
        for (const key of ['indicate', 'focus', 'surround'] as const) {
          const v = s.props.get(key);
          if (v === undefined) continue;
          const ids = v !== true && v.k === 'list' ? v.items : v !== true ? [v] : [];
          const names = ids.map((e) => {
            if (e.k === 'id') return e.name;
            if (e.k === 'str') return e.v;
            throw new CompileError(`${key}: takes object ids`, s.ln);
          });
          if (!names.length) throw new CompileError(`${key}: takes object ids`, s.ln);
          obj[key] = names;
          attention.push({ ids: names, key, ln: s.ln });
        }
        if (set) obj.set = set;
        if (animate) obj.animate = animate;
        if (dur != null) obj.duration = dur;
        if (ease) obj.ease = ease;
        if (hint) obj.hint = hint;
        ir.timeline.push(obj);
        break;
      }
    }
  }

  run(stmts, {});

  const objectIds = ir.objects.map((o: any) => o.id);
  for (const a of attention) {
    for (const id of a.ids) {
      if (!objectIds.includes(id))
        throw new CompileError(`${a.key}: no object "${id}"${suggest(id, objectIds)}`, a.ln);
    }
  }

  for (const m of morphs) {
    const a = ir.objects.find((o: any) => o.id === m.from);
    const b = ir.objects.find((o: any) => o.id === m.to);
    const ids = ir.objects.map((o: any) => o.id);
    if (!a) throw new CompileError(`morph: no object "${m.from}"${suggest(m.from, ids)}`, m.ln);
    if (!b) throw new CompileError(`morph: no object "${m.to}"${suggest(m.to, ids)}`, m.ln);
    if (a === b) throw new CompileError('morph needs two different objects', m.ln);
    const out = { k: 'bin', op: '-', l: { k: 'num', v: 1 }, r: m.by } as ExprIR;
    a.alpha = a.alpha == null ? out : { k: 'bin', op: '*', l: asIR(a.alpha), r: out };
    b.alpha = b.alpha == null ? m.by : { k: 'bin', op: '*', l: asIR(b.alpha), r: m.by };
    if (a.x !== undefined && b.x !== undefined && a.y !== undefined && b.y !== undefined) {
      const [ax, ay, bx, by] = [a.x, a.y, b.x, b.y].map(asIR);
      const lerp = (p: ExprIR, q: ExprIR): ExprIR => ({
        k: 'bin',
        op: '+',
        l: p,
        r: { k: 'bin', op: '*', l: { k: 'bin', op: '-', l: q, r: p }, r: m.by },
      });
      a.x = lerp(ax, bx);
      a.y = lerp(ay, by);
      b.x = lerp(ax, bx);
      b.y = lerp(ay, by);
    }
  }

  if (Object.keys(roles).length) {
    for (const o of ir.objects) {
      if (o.type !== 'label') continue;
      if (typeof o.text === 'string') o.text = applyRoles(o.text, roles, () => {});
      else if (o.text?.parts)
        o.text.parts = o.text.parts.map((p: unknown) =>
          typeof p === 'string' ? applyRoles(p, roles, () => {}) : p
        );
    }
  }

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

export function slideIdFor(props: PropMap, title: string, index: number): string {
  return pStr(props, 'id') || slug(title) || `slide-${index + 1}`;
}

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

function pBool(props: PropMap, key: string): boolean | undefined {
  const v = props.get(key);
  if (v === true) return true;
  if (v && v.k === 'bool') return v.v;
  return undefined;
}

function pEnum<T extends string>(
  props: PropMap,
  key: string,
  allowed: readonly T[],
  ln: number
): T | undefined {
  const v = pStr(props, key);
  if (v === undefined) return undefined;
  if (!allowed.includes(v as T)) {
    throw new CompileError(
      `${key} must be one of ${allowed.join(', ')}, got "${v}"${suggest(v, allowed)}`,
      ln
    );
  }
  return v as T;
}

function pBeat(props: PropMap, ln: number): (typeof SLIDE_BEATS)[number] | undefined {
  const v = props.get('beat');
  if (v === undefined) return undefined;
  const name = v !== true && v.k === 'id' ? v.name : v !== true && v.k === 'str' ? v.v : null;
  if (name == null || !SLIDE_BEATS.includes(name as never)) {
    throw new CompileError(
      `beat: must be one of ${SLIDE_BEATS.join(', ')}${name ? `, got "${name}"${suggest(name, SLIDE_BEATS)}` : ''}`,
      ln
    );
  }
  return name as (typeof SLIDE_BEATS)[number];
}

function pStrList(props: PropMap, key: string): string[] | undefined {
  const v = props.get(key);
  if (v && v !== true && v.k === 'list') {
    return v.items.map((e) => (e.k === 'str' ? e.v : ''));
  }
  return undefined;
}

export const MAX_DETOUR_SLIDES = 3;

const branchIR = (b: Branch) => ({ slide: b.slide, ...(b.retry && { retry: true }) });

function emitQuiz(s: Extract<Stmt, { k: 'quiz' }>) {
  if (!s.common.ask) throw new CompileError('quiz needs an ask "..."', s.ln);
  const correct = s.options.findIndex((o) => o.correct);
  if (correct < 0) throw new CompileError('quiz needs a * correct option', s.ln);
  const starCount = s.options.filter((o) => o.correct).length;
  if (starCount > 1) {
    throw new CompileError(
      `quiz has ${starCount} options marked *, but a quiz takes exactly one correct answer`,
      s.ln
    );
  }
  const seen = new Set<string>();
  for (const o of s.options) {
    if (seen.has(o.text)) {
      throw new CompileError(
        `quiz lists "${o.text}" twice, so the learner can't tell them apart`,
        s.ln
      );
    }
    seen.add(o.text);
  }
  return {
    kind: 'quiz' as const,
    prompt: s.common.ask,
    options: s.options.map((o) => {
      if (o.correct && o.onwrong)
        throw new CompileError(`the correct option "${o.text}" can't have an onwrong:`, s.ln);
      return {
        text: o.text,
        ...(o.why && { why: o.why }),
        ...(o.onwrong && { onwrong: branchIR(o.onwrong) }),
      };
    }),
    correct,
    hints: s.common.hints,
    ...(s.common.explanation && { explanation: s.common.explanation }),
    ...(s.common.skill && { skill: s.common.skill }),
    ...(s.common.onwrong && {
      onwrong: {
        slide: s.common.onwrong.slide,
        ...(s.common.onwrong.retry && { retry: true }),
      },
    }),
  };
}

export const MAX_VARIANTS = 2000;

function varyValues(v: { name: string; values: Expr; ln: number }): number[] {
  const e = v.values;
  if (e.k === 'list') return e.items.map((it) => cNum(it, {}, v.ln));
  if (e.k === 'call' && e.fn === 'range' && (e.args.length === 2 || e.args.length === 3)) {
    const [lo, hi, step] = e.args.map((a) => cNum(a, {}, v.ln));
    const by = step ?? 1;
    if (!(by > 0)) throw new CompileError(`vary ${v.name}: the step must be positive`, v.ln);
    const out: number[] = [];
    for (let x = lo; x < hi - 1e-9 && out.length <= MAX_VARIANTS; x += by)
      out.push(Number(x.toFixed(9)));
    return out;
  }
  throw new CompileError(`vary ${v.name} in range(start, end) or in [a, b, c]`, v.ln);
}

function emitVaryingNumeric(s: Extract<Stmt, { k: 'numeric' }>) {
  const names = new Set<string>();
  const vary = s.vary.map((v) => {
    if (names.has(v.name)) throw new CompileError(`vary ${v.name} is declared twice`, v.ln);
    if (v.name in CONSTS || v.name in BUILTINS)
      throw new CompileError(`vary ${v.name}: that name is taken`, v.ln);
    names.add(v.name);
    const values = varyValues(v);
    if (!values.length) throw new CompileError(`vary ${v.name} has no values`, v.ln);
    return { name: v.name, values };
  });
  const total = vary.reduce((n, v) => n * v.values.length, 1);
  if (total > MAX_VARIANTS)
    throw new CompileError(
      `${total} combinations of vary is too many (at most ${MAX_VARIANTS})`,
      s.ln
    );

  const tolerance = s.tolerance ? cNum(s.tolerance, {}, s.ln) : 1e-6;
  if (tolerance < 0) throw new CompileError('tolerance must not be negative', s.ln);
  const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(tolerance, 1e-9);
  const answerExprs = s.answers.map((a) => asIR(foldIR(lowerTree(a, {}))));
  const wrongExprs = s.wrong.map((w) => asIR(foldIR(lowerTree(w.value, {}))));
  const expectExpr = s.common.expect && asIR(foldIR(lowerTree(s.common.expect.expr, {})));

  const at = (e: ExprIR, scope: Record<string, number>, ln: number, what: string) => {
    let v: Value;
    try {
      v = evalExpr(e, scope);
    } catch (err) {
      if (err instanceof ExprError) throw new CompileError(`${what}: ${err.message}`, ln);
      throw err;
    }
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      const where = Object.entries(scope)
        .map(([k, n]) => `${k} = ${n}`)
        .join(', ');
      throw new CompileError(`${what} is not a number when ${where}`, ln);
    }
    return v;
  };

  let first: number[] = [];
  for (let i = 0; i < total; i++) {
    const scope = variantScope(vary, i);
    const where = Object.entries(scope)
      .map(([k, n]) => `${k} = ${n}`)
      .join(', ');
    const answers = answerExprs.map((e) => at(e, scope, s.ln, 'answer'));
    if (i === 0) first = answers;
    if (expectExpr) {
      const expected = at(expectExpr, scope, s.common.expect!.ln, 'expect:');
      if (!answers.some((a) => near(a, expected)))
        throw new CompileError(
          `expect: works out to ${expected} when ${where}, but the answer is ${answers.join(' or ')}`,
          s.common.expect!.ln
        );
    }
    const seen: number[] = [];
    s.wrong.forEach((w, j) => {
      const value = at(wrongExprs[j], scope, w.ln, 'wrong');
      if (answers.some((a) => near(a, value)))
        throw new CompileError(`wrong ${value} is also a right answer when ${where}`, w.ln);
      if (seen.some((v) => near(v, value)))
        throw new CompileError(`two wrong lines both mean ${value} when ${where}`, w.ln);
      seen.push(value);
    });
  }

  return {
    kind: 'numeric' as const,
    prompt: s.common.ask,
    answers: first,
    answerExprs,
    vary,
    tolerance,
    ...(s.wrong.length && {
      wrong: s.wrong.map((w, j) => ({
        value: at(wrongExprs[j], variantScope(vary, 0), w.ln, 'wrong'),
        valueExpr: wrongExprs[j],
        ...(w.why && { why: w.why }),
        ...(w.onwrong && { onwrong: branchIR(w.onwrong) }),
      })),
    }),
    ...(s.unit && { unit: s.unit }),
    hints: s.common.hints,
    ...(s.common.explanation && { explanation: s.common.explanation }),
    ...(s.common.skill && { skill: s.common.skill }),
    ...(s.common.onwrong && { onwrong: branchIR(s.common.onwrong) }),
  };
}

function emitNumeric(s: Extract<Stmt, { k: 'numeric' }>) {
  if (!s.common.ask) throw new CompileError('numeric needs an ask "..."', s.ln);
  if (!s.answers.length) throw new CompileError('numeric needs an answer: <number>', s.ln);
  if (s.vary.length) return emitVaryingNumeric(s);
  // answers/tolerance fold to constants at compile time (e.g. 64/3, sqrt(2))
  const answers = s.answers.map((a) => cNum(a, {}, s.ln));
  const tolerance = s.tolerance ? cNum(s.tolerance, {}, s.ln) : 1e-6;
  if (tolerance < 0) throw new CompileError('tolerance must not be negative', s.ln);

  if (s.common.expect) {
    const { expr, ln } = s.common.expect;
    const expected = cNum(expr, {}, ln);
    if (!Number.isFinite(expected)) {
      throw new CompileError(`expect: worked out to ${expected}, which can't be an answer`, ln);
    }
    if (!answers.some((a) => Math.abs(a - expected) <= Math.max(tolerance, 1e-9))) {
      throw new CompileError(
        `expect: works out to ${expected}, but the answer is ${answers.join(' or ')}, so one of them is wrong`,
        ln
      );
    }
  }
  const wrong = s.wrong.map((w) => {
    const value = cNum(w.value, {}, w.ln);
    if (answers.some((a) => Math.abs(a - value) <= Math.max(tolerance, 1e-9)))
      throw new CompileError(`wrong ${value} is also a right answer`, w.ln);
    return {
      value,
      ...(w.why && { why: w.why }),
      ...(w.onwrong && { onwrong: branchIR(w.onwrong) }),
    };
  });
  return {
    kind: 'numeric' as const,
    prompt: s.common.ask,
    answers,
    tolerance,
    ...(wrong.length && { wrong }),
    ...(s.unit && { unit: s.unit }),
    hints: s.common.hints,
    ...(s.common.explanation && { explanation: s.common.explanation }),
    ...(s.common.skill && { skill: s.common.skill }),
    ...(s.common.onwrong && {
      onwrong: {
        slide: s.common.onwrong.slide,
        ...(s.common.onwrong.retry && { retry: true }),
      },
    }),
  };
}

function emitBuild(s: Extract<Stmt, { k: 'build' }>) {
  if (!s.common.ask) throw new CompileError('build needs an ask "..."', s.ln);
  if (!s.bank.length) throw new CompileError('build needs a bank: [...]', s.ln);
  if (!s.answers.length) throw new CompileError('build needs an answer: [...]', s.ln);
  const bank = s.bank.map((label) => ({
    id: label,
    label,
    kind: /^[a-zA-Z0-9]/.test(label.replace(/\$/g, ''))
      ? ('operand' as const)
      : ('operator' as const),
  }));

  let template: TemplateSeg[] | null = null;
  let slots = s.slots ?? s.answers[0].length;
  if (s.template !== null) {
    template = splitTemplate(s.template, s.ln);
    const templateSlots = countSlots(template);
    if (templateSlots === 0) {
      throw new CompileError(
        'template has no slots — mark each blank with ___ (three or more underscores) outside any $...$ span',
        s.ln
      );
    }
    if (s.slots !== null && s.slots !== templateSlots) {
      throw new CompileError(
        `slots: ${s.slots} disagrees with the template, which has ${templateSlots} — drop slots: and let the template decide`,
        s.ln
      );
    }
    slots = templateSlots;
  }

  const misses = s.misses.map((m) => {
    if (!s.bank.includes(m.token))
      throw new CompileError(
        `miss "${m.token}": that token isn't in the bank${suggest(m.token, s.bank)}`,
        m.ln
      );
    if (s.answers.some((a) => a.includes(m.token)))
      throw new CompileError(
        `miss "${m.token}": that token is part of an accepted answer, so placing it isn't a mistake`,
        m.ln
      );
    return { token: m.token, why: m.why };
  });

  return {
    kind: 'build' as const,
    prompt: s.common.ask,
    bank,
    answers: s.answers,
    slots,
    ...(template && { template }),
    ...(s.reusable && { reusable: true }),
    ...(misses.length && { misses }),
    hints: s.common.hints,
    ...(s.common.explanation && { explanation: s.common.explanation }),
    ...(s.common.skill && { skill: s.common.skill }),
    ...(s.common.onwrong && {
      onwrong: {
        slide: s.common.onwrong.slide,
        ...(s.common.onwrong.retry && { retry: true }),
      },
    }),
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
    ...(s.common.onwrong && {
      onwrong: {
        slide: s.common.onwrong.slide,
        ...(s.common.onwrong.retry && { retry: true }),
      },
    }),
  };
}

function tuplePair(e: Expr, ln: number, what: string): [number, number] {
  if (e.k !== 'tuple' || e.items.length < 2) throw new CompileError(`${what} needs a (x, y)`, ln);
  return [cNum(e.items[0], {}, ln), cNum(e.items[1], {}, ln)];
}

function emitFollows(
  expr: Expr,
  overExpr: Expr | null,
  targets: [number, number][],
  ln: number
): { expr: ExprIR; over: [number, number] } {
  let over: [number, number];
  if (overExpr) {
    if (overExpr.k !== 'list' || overExpr.items.length !== 2)
      throw new CompileError('over: needs [start, end]', ln);
    over = [cNum(overExpr.items[0], {}, ln), cNum(overExpr.items[1], {}, ln)];
  } else if (targets.length >= 2) {
    const xs = targets.map((t) => t[0]);
    over = [Math.min(...xs), Math.max(...xs)];
  } else {
    throw new CompileError('follows: needs an over: [start, end] to check it on', ln);
  }
  if (!(over[1] > over[0])) throw new CompileError('over: end must be bigger than start', ln);

  const tree = asIR(foldIR(lowerTree(expr, {})));
  let finite = 0;
  for (let i = 0; i <= 20; i++) {
    const x = over[0] + ((over[1] - over[0]) * i) / 20;
    let y: Value;
    try {
      y = evalExpr(tree, { x });
    } catch (e) {
      if (e instanceof ExprError) throw new CompileError(`follows: ${e.message}`, ln);
      throw e;
    }
    if (typeof y !== 'number') throw new CompileError('follows: must be a number in x', ln);
    if (Number.isFinite(y)) finite++;
  }
  if (finite < 18) throw new CompileError('follows: is undefined over most of over:', ln);
  return { expr: tree, over };
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
      ...(s.common.onwrong && {
        onwrong: {
          slide: s.common.onwrong.slide,
          ...(s.common.onwrong.retry && { retry: true }),
        },
      }),
    };
  }

  if ((s.follows || s.over) && s.mode !== 'curve')
    throw new CompileError('follows: and over: only work on sketch curve', s.ln);
  if (!s.near.length && !s.follows) {
    throw new CompileError(`sketch ${s.mode} needs at least one near (x, y)`, s.ln);
  }
  const targets = s.near.map((t) => tuplePair(t, s.ln, 'near'));
  const tol = s.tol ? cNum(s.tol, {}, s.ln) : s.mode === 'curve' ? 0.5 : 0.4;
  if (tol < 0) throw new CompileError('tolerance must not be negative', s.ln);
  const follows = s.follows ? emitFollows(s.follows, s.over, targets, s.ln) : null;
  return {
    kind: 'sketch' as const,
    mode: s.mode,
    prompt: s.common.ask,
    targets,
    ...(follows && { follows: follows.expr, over: follows.over }),
    tol,
    hints: s.common.hints,
    ...(s.common.explanation && { explanation: s.common.explanation }),
    ...(s.common.skill && { skill: s.common.skill }),
    ...(s.common.onwrong && {
      onwrong: {
        slide: s.common.onwrong.slide,
        ...(s.common.onwrong.retry && { retry: true }),
      },
    }),
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
  const lefts = pairs.map((p) => p.left);
  const rights = [...pairs.map((p) => p.right), ...s.decoys];
  const misses = s.misses.map((m) => {
    if (!lefts.includes(m.left))
      throw new CompileError(
        `miss "${m.left}": no pair has that left side${suggest(m.left, lefts)}`,
        m.ln
      );
    if (!rights.includes(m.right))
      throw new CompileError(
        `miss -> "${m.right}": that isn't one of the right-hand options${suggest(m.right, rights)}`,
        m.ln
      );
    if (pairs.some((p) => p.left === m.left && p.right === m.right))
      throw new CompileError(
        `miss "${m.left}" -> "${m.right}" is the correct pairing, not a mistake`,
        m.ln
      );
    return { left: m.left, right: m.right, why: m.why };
  });
  return {
    kind: 'match' as const,
    prompt: s.common.ask,
    pairs,
    ...(s.decoys.length && { decoys: s.decoys }),
    ...(misses.length && { misses }),
    hints: s.common.hints,
    ...(s.common.explanation && { explanation: s.common.explanation }),
    ...(s.common.skill && { skill: s.common.skill }),
    ...(s.common.onwrong && {
      onwrong: {
        slide: s.common.onwrong.slide,
        ...(s.common.onwrong.retry && { retry: true }),
      },
    }),
  };
}

function emitOrder(s: Extract<Stmt, { k: 'order' }>) {
  if (!s.common.ask) throw new CompileError('order needs an ask "..."', s.ln);
  if (s.items.length < 2) throw new CompileError('order needs at least 2 item lines', s.ln);
  return {
    kind: 'order' as const,
    prompt: s.common.ask,
    items: s.items,
    ...(s.decoys.length && { decoys: s.decoys }),
    hints: s.common.hints,
    ...(s.common.explanation && { explanation: s.common.explanation }),
    ...(s.common.skill && { skill: s.common.skill }),
    ...(s.common.onwrong && {
      onwrong: {
        slide: s.common.onwrong.slide,
        ...(s.common.onwrong.retry && { retry: true }),
      },
    }),
  };
}

function emitSort(s: Extract<Stmt, { k: 'sort' }>) {
  if (!s.common.ask) throw new CompileError('sort needs an ask "..."', s.ln);
  if (s.bins.length < 2) throw new CompileError('sort needs at least 2 bin "..." groups', s.ln);
  const owner = new Map<string, string>();
  for (const bin of s.bins) {
    if (!bin.items.length) {
      throw new CompileError(`bin "${bin.label}" has no items to sort into it`, s.ln);
    }
    for (const item of bin.items) {
      const already = owner.get(item);
      if (already !== undefined) {
        throw new CompileError(
          `"${item}" is in both "${already}" and "${bin.label}", so it has no single right bin`,
          s.ln
        );
      }
      owner.set(item, bin.label);
    }
  }
  return {
    kind: 'sort' as const,
    prompt: s.common.ask,
    bins: s.bins,
    hints: s.common.hints,
    ...(s.common.explanation && { explanation: s.common.explanation }),
    ...(s.common.skill && { skill: s.common.skill }),
    ...(s.common.onwrong && {
      onwrong: {
        slide: s.common.onwrong.slide,
        ...(s.common.onwrong.retry && { retry: true }),
      },
    }),
  };
}

function emitMoves(s: Extract<Stmt, { k: 'moves' }>) {
  if (!s.common.ask) throw new CompileError('moves needs an ask "..."', s.ln);
  if (!s.start) throw new CompileError('moves needs a from "..." to start from', s.ln);
  if (!s.steps.length) throw new CompileError('moves needs at least one move', s.ln);
  const steps = s.steps.map((st) => {
    const correct = st.options.filter((o) => o.correct);
    if (correct.length !== 1)
      throw new CompileError(
        `each move needs exactly one * right choice, this one has ${correct.length}`,
        st.ln
      );
    if (st.options.length < 2)
      throw new CompileError('each move needs at least one wrong choice to pick against', st.ln);
    const texts = new Set(st.options.map((o) => o.text));
    if (texts.size !== st.options.length)
      throw new CompileError('a move lists the same choice twice', st.ln);
    return {
      result: st.result,
      options: st.options.map((o) => ({ text: o.text, ...(o.why && { why: o.why }) })),
      correct: st.options.findIndex((o) => o.correct),
    };
  });
  return {
    kind: 'moves' as const,
    prompt: s.common.ask,
    start: s.start,
    steps,
    hints: s.common.hints,
    ...(s.common.explanation && { explanation: s.common.explanation }),
    ...(s.common.skill && { skill: s.common.skill }),
    ...(s.common.onwrong && { onwrong: branchIR(s.common.onwrong) }),
  };
}

function emitTable(s: Extract<Stmt, { k: 'table' }>) {
  if (!s.common.ask) throw new CompileError('table needs an ask "..."', s.ln);
  if (!s.rows.length) throw new CompileError('table needs at least one row: ...', s.ln);
  const width = s.rows[0].length;
  if (s.header && s.header.length !== width) {
    throw new CompileError('table header length must match row length', s.ln);
  }
  let hasBlank = false;
  const rows = s.rows.map((row) => {
    if (row.length !== width) {
      throw new CompileError('every table row must have the same number of cells', s.ln);
    }
    return row.map((cellExpr) => {
      if (cellExpr.k === 'call' && cellExpr.fn === 'blank') {
        if (cellExpr.args.length !== 1) {
          throw new CompileError('blank(...) takes exactly one expected answer', s.ln);
        }
        hasBlank = true;
        return { blank: true as const, answer: cNum(cellExpr.args[0], {}, s.ln) };
      }
      return { value: cNum(cellExpr, {}, s.ln) };
    });
  });
  if (!hasBlank) throw new CompileError('table needs at least one blank(...) cell', s.ln);
  const tolerance = s.tolerance ? cNum(s.tolerance, {}, s.ln) : 1e-6;
  if (tolerance < 0) throw new CompileError('tolerance must not be negative', s.ln);
  return {
    kind: 'table' as const,
    prompt: s.common.ask,
    ...(s.header && { header: s.header }),
    rows,
    tolerance,
    hints: s.common.hints,
    ...(s.common.explanation && { explanation: s.common.explanation }),
    ...(s.common.skill && { skill: s.common.skill }),
    ...(s.common.onwrong && {
      onwrong: {
        slide: s.common.onwrong.slide,
        ...(s.common.onwrong.retry && { retry: true }),
      },
    }),
  };
}

function validateGoalIds(expr: Expr, allowed: string[], ln: number): void {
  const walk = (e: Expr): void => {
    switch (e.k) {
      case 'id': {
        if (allowed.includes(e.name) || e.name in CONSTS) return;
        const cands = [...allowed, ...Object.keys(CONSTS)];
        throw new CompileError(`"${e.name}" is not defined here${suggest(e.name, cands)}`, ln);
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

function emitGoal(s: Extract<Stmt, { k: 'goal' }>, allowedIds: string[]) {
  const whenExpr = s.props.get('when');
  if (!whenExpr || whenExpr === true) throw new CompileError('goal needs a when: condition', s.ln);
  validateGoalIds(whenExpr, allowedIds, s.ln);
  const when = asIR(lower(whenExpr, {}));
  const hint = pStr(s.props, 'hint');
  const ladder = pStrList(s.props, 'hints');
  if (hint && ladder) throw new CompileError('a goal takes hint: or hints: [...], not both', s.ln);
  if (ladder && (!ladder.length || ladder.some((h) => !h)))
    throw new CompileError('hints: needs a list of strings', s.ln);
  const showme = propDict(s.props, 'showme', s.ln);
  if (showme) {
    for (const k of Object.keys(showme)) {
      if (!allowedIds.includes(k))
        throw new CompileError(`showme: "${k}" is not defined here${suggest(k, allowedIds)}`, s.ln);
    }
  }
  const dur = s.props.get('dur');
  const duration = dur && dur !== true ? cNum(dur, {}, s.ln) : undefined;
  if (duration != null && !showme)
    throw new CompileError('dur: only means something with showme:', s.ln);
  return {
    prompt: s.prompt,
    when,
    ...(hint && { hint }),
    ...(ladder && { hints: ladder }),
    ...(showme && { showme: { set: showme, ...(duration != null && { duration }) } }),
  };
}

function emitSlide(s: SlideStmt, i: number, lessonMacros?: Macros, roles: Roles = {}) {
  // slug() keeps [a-z0-9] only, so a non-latin title either collapses to
  // nothing (leaving a positional id that moves when slides are reordered) or
  // survives as its latin scraps, which collide. slide ids are a database key.
  if (!pStr(s.props, 'id') && /[^\x00-\x7F]/.test(s.title)) {
    throw new CompileError(
      `slide "${s.title}" needs an explicit id: because its title is not ascii, and ids are derived from the title`,
      s.ln
    );
  }
  const id = slideIdFor(s.props, s.title, i);
  const prose: string[] = [];
  let scene: SceneIR | undefined;
  let exercise:
    | ReturnType<typeof emitQuiz>
    | ReturnType<typeof emitNumeric>
    | ReturnType<typeof emitBuild>
    | ReturnType<typeof emitHotspot>
    | ReturnType<typeof emitSketch>
    | ReturnType<typeof emitMatch>
    | ReturnType<typeof emitOrder>
    | ReturnType<typeof emitSort>
    | ReturnType<typeof emitTable>
    | ReturnType<typeof emitMoves>
    | undefined;
  const goalItems: Extract<Stmt, { k: 'goal' }>[] = [];

  for (const item of s.items) {
    if ('common' in item && item.common.expect && item.k !== 'numeric') {
      throw new CompileError(
        `expect: only works on a numeric exercise, not ${item.k}`,
        item.common.expect.ln
      );
    }
    if (item.k === 'prose') {
      prose.push(
        applyRoles(item.text, roles, (name) => {
          throw new CompileError(
            `[...]{${name}}: "${name}" is not a colour role or a colour${suggest(name, [...Object.keys(roles), ...COLOR_TOKENS])}`,
            item.ln
          );
        })
      );
    } else if (item.k === 'scene') {
      if (scene) throw new CompileError('a slide can have at most one scene', item.ln);
      scene = emit([item], lessonMacros, roles);
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
    } else if (item.k === 'order') {
      if (exercise) throw new CompileError('a slide can have at most one exercise', item.ln);
      exercise = emitOrder(item);
    } else if (item.k === 'sort') {
      if (exercise) throw new CompileError('a slide can have at most one exercise', item.ln);
      exercise = emitSort(item);
    } else if (item.k === 'table') {
      if (exercise) throw new CompileError('a slide can have at most one exercise', item.ln);
      exercise = emitTable(item);
    } else if (item.k === 'moves') {
      if (exercise) throw new CompileError('a slide can have at most one exercise', item.ln);
      exercise = emitMoves(item);
    } else if (item.k === 'goal') {
      goalItems.push(item);
    }
  }

  const allowedIds = scene ? Object.keys(scene.state ?? {}) : [];
  const tint = (t: string) => applyRoles(t, roles, () => {});
  const goals = goalItems.map((g) => {
    const goal = emitGoal(g, allowedIds);
    return { ...goal, prompt: tint(goal.prompt) };
  });
  if (exercise && Object.keys(roles).length) {
    const ex: any = { ...exercise, prompt: tint(exercise.prompt) };
    if (ex.explanation) ex.explanation = tint(ex.explanation);
    if (ex.kind === 'quiz')
      ex.options = ex.options.map((o: any) => ({
        ...o,
        text: tint(o.text),
        ...(o.why && { why: tint(o.why) }),
      }));
    exercise = ex;
  }

  const exerciseItem = s.items.find((it) => 'common' in it) as
    | { common: { after?: { on: 'goals' | number; ln: number } } }
    | undefined;
  const after = exerciseItem?.common.after;
  if (after && exercise) {
    if (after.on === 'goals' && !goals.length)
      throw new CompileError('after: goals needs a goal on the slide', after.ln);
    if (typeof after.on === 'number') {
      const steps = scene?.timeline?.length ?? 0;
      if (!Number.isInteger(after.on) || after.on < 1 || after.on > steps)
        throw new CompileError(
          steps
            ? `after: ${after.on} is not a step; the timeline has steps 1 to ${steps}`
            : 'after: <step> needs a scene with a timeline',
          after.ln
        );
    }
  }

  if (
    scene?.space?.type === 'numberline' &&
    (exercise?.kind === 'hotspot' || exercise?.kind === 'sketch')
  ) {
    throw new CompileError(
      `a ${exercise.kind} exercise needs a plane scene; the numberline renderer can't host its input layer`,
      s.ln
    );
  }

  const category = pStr(s.props, 'cat');
  const skill = pStr(s.props, 'skill');
  const hidden = pBool(s.props, 'hidden');
  const beat = pBeat(s.props, s.ln);
  const then = pStr(s.props, 'then');
  if (then && !hidden) throw new CompileError('then: only works on a hidden slide', s.ln);
  return {
    id,
    title: s.title,
    ...(beat && { beat }),
    ...(then && { then }),
    ...(category && { category }),
    ...(skill && { skill }),
    ...(hidden && { hidden }),
    ...(prose.length && { prose: prose.join('\n\n') }),
    ...(scene && { scene }),
    ...(exercise && { exercise: after ? { ...exercise, after: after.on } : exercise }),
    ...(goals.length && { goals }),
  };
}

function validateMemory(slides: ReturnType<typeof emitSlide>[], stmts: SlideStmt[]) {
  slides.forEach((s, i) => {
    const texts = [
      s.prose ?? '',
      s.exercise?.prompt ?? '',
      s.exercise?.explanation ?? '',
      ...(s.goals ?? []).map((g) => g.prompt),
    ];
    for (const ref of texts.flatMap(memoryRefs)) {
      const earlier = slides.slice(0, i);
      if (ref.fn === 'answer') {
        const from = earlier.find((e) => e.id === ref.name);
        if (!from)
          throw new CompileError(
            `answer("${ref.name}") needs a slide before this one with that id${suggest(
              ref.name,
              earlier.map((e) => e.id)
            )}`,
            stmts[i].ln
          );
        if (from.exercise?.kind !== 'quiz' && from.exercise?.kind !== 'numeric')
          throw new CompileError(
            `answer("${ref.name}") can only show a quiz or numeric answer`,
            stmts[i].ln
          );
      } else {
        const kept = slides.slice(0, i + 1).flatMap((e) =>
          Object.entries(e.scene?.state ?? {})
            .filter(([, d]) => d.type === 'number' && (d as { keep?: boolean }).keep)
            .map(([n]) => n)
        );
        if (!kept.includes(ref.name))
          throw new CompileError(
            `recall("${ref.name}") needs a param ${ref.name} { keep } on this slide or an earlier one${suggest(ref.name, kept)}`,
            stmts[i].ln
          );
      }
    }
  });
}

export function exerciseBranches(
  exercise: ReturnType<typeof emitSlide>['exercise'] | LessonIR['slides'][number]['exercise']
): { slide: string; retry?: boolean }[] {
  if (!exercise) return [];
  const out = exercise.onwrong ? [exercise.onwrong] : [];
  if (exercise.kind === 'quiz')
    for (const o of exercise.options) if (o.onwrong) out.push(o.onwrong);
  if (exercise.kind === 'numeric')
    for (const w of exercise.wrong ?? []) if (w.onwrong) out.push(w.onwrong);
  return out;
}

function validateSlideFlow(slides: ReturnType<typeof emitSlide>[], stmts: SlideStmt[]) {
  const byId = new Map<string, ReturnType<typeof emitSlide>>();
  slides.forEach((s, i) => {
    if (byId.has(s.id))
      throw new CompileError(
        `two slides share the id "${s.id}"; ids must be unique so progress and detours can find them`,
        stmts[i].ln
      );
    byId.set(s.id, s);
  });

  slides.forEach((s, i) => {
    for (const branch of exerciseBranches(s.exercise)) {
      const ln = stmts[i].ln;
      const target = byId.get(branch.slide);
      if (!target)
        throw new CompileError(
          `onwrong: "${branch.slide}" is not a slide in this lesson${suggest(branch.slide, byId.keys())}`,
          ln
        );
      if (target.id === s.id)
        throw new CompileError(`onwrong: "${branch.slide}" points at its own slide`, ln);
      if (!target.hidden)
        throw new CompileError(
          `onwrong: "${branch.slide}" needs hidden: true, or it would also show on the main path`,
          ln
        );
      if (exerciseBranches(target.exercise).length)
        throw new CompileError(
          `onwrong: "${branch.slide}" is itself a detour; detours can't chain`,
          ln
        );
    }
  });

  slides.forEach((s, i) => {
    const seen = [s.id];
    let at = s;
    while (at.then) {
      const ln = stmts[i].ln;
      const nextSlide = byId.get(at.then);
      if (!nextSlide)
        throw new CompileError(
          `then: "${at.then}" is not a slide in this lesson${suggest(at.then, byId.keys())}`,
          ln
        );
      if (!nextSlide.hidden)
        throw new CompileError(`then: "${at.then}" needs hidden: true, it is part of a detour`, ln);
      if (seen.includes(nextSlide.id))
        throw new CompileError(`then: "${at.then}" loops back on itself`, ln);
      seen.push(nextSlide.id);
      if (seen.length > MAX_DETOUR_SLIDES)
        throw new CompileError(
          `a detour can be at most ${MAX_DETOUR_SLIDES} slides long; this one runs ${seen.join(' -> ')}`,
          ln
        );
      at = nextSlide;
    }
  });

  if (slides.every((s) => s.hidden))
    throw new CompileError('a lesson needs at least one slide that is not hidden');
}

export function emitLesson(stmts: Stmt[]): LessonIR {
  const root = stmts[0];
  if (!root || root.k !== 'lesson') throw new CompileError('expected a lesson block');

  const lessonMacros: Macros = new Map();
  for (const d of root.defs) lessonMacros.set(d.name, { params: d.params, body: d.body });

  const course = pStr(root.props, 'course');
  const skills = pStrList(root.props, 'skills');
  const requires = pStrList(root.props, 'requires');
  const unit = pStr(root.props, 'unit');
  const summary = pStr(root.props, 'summary');
  const difficulty = pEnum(root.props, 'difficulty', LESSON_DIFFICULTIES, root.ln);
  const icon = pEnum(root.props, 'icon', LESSON_ICONS, root.ln);
  const roles: Roles = {};
  for (const r of root.roles) {
    if (!isColorToken(r.color))
      throw new CompileError(
        `role ${r.name} = ${r.color}: the colour must be one of ${COLOR_TOKENS.join(', ')}${suggest(r.color, COLOR_TOKENS)}`,
        r.ln
      );
    if (isColorToken(r.name))
      throw new CompileError(`role ${r.name}: that name is already a colour`, r.ln);
    if (roles[r.name]) throw new CompileError(`role ${r.name} is declared twice`, r.ln);
    roles[r.name] = r.color as ColorToken;
  }
  const slides = root.slides.map((s, i) => emitSlide(s, i, lessonMacros, roles));
  validateSlideFlow(slides, root.slides);
  validateMemory(slides, root.slides);
  const ir = {
    version: 2 as const,
    title: root.title,
    ...(course && { course }),
    ...(skills && { skills }),
    ...(requires && { requires }),
    ...(unit && { unit }),
    ...(difficulty && { difficulty }),
    ...(icon && { icon }),
    ...(summary && { summary }),
    slides,
  };

  const result = lessonSchema.safeParse(ir);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new CompileError(`invalid lesson IR: ${first.path.join('.')} - ${first.message}`);
  }
  return result.data;
}
