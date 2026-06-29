import type { Expr, PropMap, Stmt } from './ast';
import type { SceneIR } from '@/engine/ir/types';
import { sceneSchema } from '@/engine/ir/schema';
import { evalNumber, evalBool } from '@/engine/runtime/eval';
import { CompileError } from './errors';

type CompileScope = Record<string, number | boolean>;
type Macros = Map<string, { params: string[]; body: Stmt[] }>;

function compileEval(expr: Expr, scope: CompileScope): number | boolean {
  switch (expr.k) {
    case 'num':
      return expr.v;
    case 'bool':
      return expr.v;
    case 'id': {
      if (expr.name in scope) return scope[expr.name];
      throw new CompileError(`"${expr.name}" is not in compile-time scope`);
    }
    case 'un': {
      const v = compileEval(expr.e, scope);
      if (expr.op === '-') return -(v as number);
      if (expr.op === '+') return +(v as number);
      if (expr.op === 'not') return !v;
      throw new CompileError(`unknown unary op "${expr.op}"`);
    }
    case 'bin': {
      const l = () => compileEval(expr.l, scope);
      const r = () => compileEval(expr.r, scope);
      switch (expr.op) {
        case '+':
          return (l() as number) + (r() as number);
        case '-':
          return (l() as number) - (r() as number);
        case '*':
          return (l() as number) * (r() as number);
        case '/':
          return (l() as number) / (r() as number);
        case '%':
          return (l() as number) % (r() as number);
        case '^':
          return Math.pow(l() as number, r() as number);
        case '==':
          return l() === r();
        case '!=':
          return l() !== r();
        case '<':
          return (l() as number) < (r() as number);
        case '<=':
          return (l() as number) <= (r() as number);
        case '>':
          return (l() as number) > (r() as number);
        case '>=':
          return (l() as number) >= (r() as number);
        case 'and':
          return Boolean(l()) && Boolean(r());
        case 'or':
          return Boolean(l()) || Boolean(r());
        default:
          throw new CompileError(`unknown binary op "${expr.op}"`);
      }
    }
    case 'call': {
      const args = expr.args.map((a) => compileEval(a, scope)) as number[];
      const fn = Math[expr.fn as keyof Math] as ((...a: number[]) => number) | undefined;
      if (typeof fn === 'function') return fn(...args);
      throw new CompileError(`unknown compile-time function "${expr.fn}"`);
    }
    default:
      throw new CompileError(`cannot evaluate "${expr.k}" at compile time`);
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

function serOrNum(expr: Expr, cScope: CompileScope): string | number {
  try {
    const v = compileEval(expr, cScope);
    if (typeof v === 'number') return Number.isFinite(v) ? v : niceNum(v);
  } catch {}
  return ser(expr, cScope);
}

function serPair(expr: Expr, cScope: CompileScope, ln: number): [string | number, string | number] {
  if (expr.k !== 'tuple' || expr.items.length < 2) {
    throw new CompileError('expected a (x, y) pair', ln);
  }
  return [serOrNum(expr.items[0], cScope), serOrNum(expr.items[1], cScope)];
}

function evalFstr(raw: string, cScope: CompileScope): string {
  return raw.replace(/\{([^}]+)\}/g, (_, e: string) => {
    try {
      const v = evalNumber(e.trim(), cScope);
      if (Number.isFinite(v)) return niceNum(v);
    } catch {}
    return '${' + e + '}';
  });
}

function evalId(expr: Expr, cScope: CompileScope, ln: number): string {
  if (expr.k === 'id') return expr.name;
  if (expr.k === 'str') return expr.fstr ? evalFstr(expr.v, cScope) : expr.v;
  throw new CompileError('expected an identifier or string as object id', ln);
}

function propNum(
  props: PropMap,
  key: string,
  ln: number,
  cScope: CompileScope = {}
): number | undefined {
  const v = props.get(key);
  if (v == null || v === true) return undefined;
  try {
    return evalNumber(ser(v, cScope), cScope);
  } catch {
    throw new CompileError(`prop "${key}" must be a number`, ln);
  }
}

function propStr(props: PropMap, key: string, cScope: CompileScope): string | undefined {
  const v = props.get(key);
  if (v == null || v === true) return undefined;
  if (v.k === 'str') return v.fstr ? evalFstr(v.v, cScope) : v.v;
  if (v.k === 'id') return v.name;
  return ser(v, cScope);
}

function propExpr(props: PropMap, key: string, cScope: CompileScope): string | number | undefined {
  const v = props.get(key);
  if (v == null || v === true) return undefined;
  return serOrNum(v, cScope);
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
    out[k] = evalNumber(ser(e, {}), {});
  }
  return out;
}

function applyCommon(obj: any, props: PropMap, cScope: CompileScope) {
  const color = propStr(props, 'color', cScope);
  const style = propStr(props, 'style', cScope);
  const show = props.get('show');
  const width = props.get('width');
  if (color) obj.color = color;
  if (style) obj.style = style;
  if (show && show !== true) obj.visibleIf = ser(show, cScope);
  if (width && width !== true) obj.strokeWidth = serOrNum(width, cScope);
}

function niceNum(v: number): string {
  return String(Math.round(v * 1e9) / 1e9);
}

export function emit(stmts: Stmt[]): SceneIR {
  const ir: any = { state: {}, space: null, objects: [], controls: [], timeline: [] };
  const macros: Macros = new Map();
  let autoLabelId = 0;

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
        const startV = evalNumber(ser(s.start, cScope), cScope);
        const endV = evalNumber(ser(s.end, cScope), cScope);
        const stepV = s.step ? evalNumber(ser(s.step, cScope), cScope) : 1;
        if (!(stepV > 0)) throw new CompileError('range step must be > 0', s.ln);
        let count = 0;
        for (let v = startV; v < endV - 1e-9; v += stepV) {
          if (++count > 5000) throw new CompileError('range exceeded 5000 iterations', s.ln);
          const iterScope = { ...cScope, [s.var]: Math.round(v * 1e9) / 1e9 };
          run(s.body, iterScope);
        }
        break;
      }

      case 'if_s': {
        for (const { cond, body } of s.cases) {
          const take = evalBool(ser(cond, cScope), cScope);
          if (take) {
            run(body, { ...cScope });
            return;
          }
        }
        if (s.elseBody) run(s.elseBody, { ...cScope });
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
        if (!yV || yV === true || yV.k !== 'list')
          throw new CompileError('scene needs y: [min, max]', s.ln);
        const xD = xV.items.map((e) => evalNumber(ser(e, cScope), {})) as [number, number];
        const yD = yV.items.map((e) => evalNumber(ser(e, cScope), {})) as [number, number];
        ir.space = {
          type: s.spaceType,
          xDomain: xD,
          yDomain: yD,
          ...(s.props.has('grid') && { grid: true }),
          ...(s.props.has('axes') && { axes: true }),
        };
        const render = propStr(s.props, 'render', cScope);
        if (render) ir.space.render = render;
        break;
      }

      case 'param': {
        const init = evalNumber(ser(s.init, cScope), cScope);
        const varDef: any = { type: 'number', init };
        const range = s.props.get('range');
        if (range && range !== true && range.k === 'list' && range.items.length >= 2) {
          varDef.min = evalNumber(ser(range.items[0], cScope), {});
          varDef.max = evalNumber(ser(range.items[1], cScope), {});
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

      case 'curve': {
        const id = evalId(s.id, cScope, s.ln);
        const obj: any = { id, type: 'curve', expr: ser(s.expr, cScope) };
        applyCommon(obj, s.props, cScope);
        ir.objects.push(obj);
        break;
      }

      case 'point': {
        const id = evalId(s.id, cScope, s.ln);
        const obj: any = { id, type: 'point' };
        if (s.pos) {
          const [x, y] = serPair(s.pos, cScope, s.ln);
          obj.x = x;
          obj.y = y;
        } else {
          obj.x = '0';
          obj.y = '0';
        }
        const r = propNum(s.props, 'r', s.ln, cScope);
        if (r != null) obj.r = r;
        const label = propStr(s.props, 'label', cScope);
        if (label) obj.label = label;
        const drag = s.props.get('drag');
        if (drag && drag !== true) {
          if (drag.k !== 'arrow') throw new CompileError('drag must be axis -> bind', s.ln);
          const axis = drag.from.k === 'id' ? drag.from.name : ser(drag.from, cScope);
          if (drag.to.k === 'id') {
            obj.draggable = { axis, bind: drag.to.name };
          } else if (drag.to.k === 'tuple' && drag.to.items.length === 2) {
            const bindX =
              drag.to.items[0].k === 'id' ? drag.to.items[0].name : ser(drag.to.items[0], cScope);
            const bindY =
              drag.to.items[1].k === 'id' ? drag.to.items[1].name : ser(drag.to.items[1], cScope);
            obj.draggable = { axis, bind: bindX, bindY };
          }
        }
        applyCommon(obj, s.props, cScope);
        ir.objects.push(obj);
        break;
      }

      case 'line': {
        const id = evalId(s.id, cScope, s.ln);
        const obj: any = { id, type: 'line' };
        if (s.seg) {
          const [x1, y1] = serPair(s.seg[0], cScope, s.ln);
          const [x2, y2] = serPair(s.seg[1], cScope, s.ln);
          obj.x1 = x1;
          obj.y1 = y1;
          obj.x2 = x2;
          obj.y2 = y2;
        } else {
          const through = propStr(s.props, 'through', cScope);
          const slope = propExpr(s.props, 'slope', cScope);
          if (through) obj.through = through;
          if (slope != null) obj.slope = slope;
        }
        applyCommon(obj, s.props, cScope);
        ir.objects.push(obj);
        break;
      }

      case 'label': {
        const id = s.id ? evalId(s.id, cScope, s.ln) : `__lbl_${autoLabelId++}`;
        if (s.at.k !== 'tuple' || s.at.items.length < 2) {
          throw new CompileError('label at needs a (x, y) position', s.ln);
        }
        const x = serOrNum(s.at.items[0], cScope);
        const y = serOrNum(s.at.items[1], cScope);
        let text: string;
        if (s.text.k === 'str') {
          text = s.text.fstr ? evalFstr(s.text.v, cScope) : s.text.v;
        } else {
          text = ser(s.text, cScope);
        }
        const obj: any = { id, type: 'label', x, y, text };
        const size = propNum(s.props, 'size', s.ln, cScope);
        if (size != null) obj.fontSize = size;
        if (s.props.has('tex')) obj.tex = true;
        applyCommon(obj, s.props, cScope);
        ir.objects.push(obj);
        break;
      }

      case 'rect': {
        const id = evalId(s.id, cScope, s.ln);
        const [x, y] = serPair(s.pos, cScope, s.ln);
        const w = propExpr(s.props, 'w', cScope);
        const h = propExpr(s.props, 'h', cScope);
        if (w == null || h == null) throw new CompileError('rect needs w: and h: props', s.ln);
        const obj: any = { id, type: 'rect', x, y, w, h };
        const opacity = propNum(s.props, 'opacity', s.ln, cScope);
        if (opacity != null) obj.opacity = opacity;
        applyCommon(obj, s.props, cScope);
        ir.objects.push(obj);
        break;
      }

      case 'circle': {
        const id = evalId(s.id, cScope, s.ln);
        const [x, y] = serPair(s.center, cScope, s.ln);
        const r = propExpr(s.props, 'r', cScope);
        if (r == null) throw new CompileError('circle needs an r: prop', s.ln);
        const obj: any = { id, type: 'circle', x, y, r };
        const opacity = propNum(s.props, 'opacity', s.ln, cScope);
        if (opacity != null) obj.opacity = opacity;
        applyCommon(obj, s.props, cScope);
        ir.objects.push(obj);
        break;
      }

      case 'polygon': {
        const id = evalId(s.id, cScope, s.ln);
        const points = s.pts.map((pt) => {
          if (pt.k !== 'tuple' || pt.items.length < 2)
            throw new CompileError('polygon point must be (x, y)', s.ln);
          return [serOrNum(pt.items[0], cScope), serOrNum(pt.items[1], cScope)] as [
            string | number,
            string | number,
          ];
        });
        const obj: any = { id, type: 'polygon', points };
        const opacity = propNum(s.props, 'opacity', s.ln, cScope);
        if (opacity != null) obj.opacity = opacity;
        applyCommon(obj, s.props, cScope);
        ir.objects.push(obj);
        break;
      }

      case 'vector': {
        const id = evalId(s.id, cScope, s.ln);
        const [x1, y1] = serPair(s.from, cScope, s.ln);
        const [x2, y2] = serPair(s.to, cScope, s.ln);
        const obj: any = { id, type: 'vector', x1, y1, x2, y2 };
        applyCommon(obj, s.props, cScope);
        ir.objects.push(obj);
        break;
      }

      case 'arc': {
        const id = evalId(s.id, cScope, s.ln);
        const [x, y] = serPair(s.center, cScope, s.ln);
        const r = propExpr(s.props, 'r', cScope);
        const start = propExpr(s.props, 'from', cScope);
        const end = propExpr(s.props, 'to', cScope);
        if (r == null) throw new CompileError('arc needs an r: prop', s.ln);
        if (start == null || end == null)
          throw new CompileError('arc needs from: and to: props', s.ln);
        const obj: any = { id, type: 'arc', x, y, r, start, end };
        applyCommon(obj, s.props, cScope);
        ir.objects.push(obj);
        break;
      }

      case 'slider': {
        const ctrl: any = { as: 'slider', bind: s.bind };
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
        const ctrl: any = { as: 'toggle', bind: s.bind };
        const label = propStr(s.props, 'label', cScope);
        if (label) ctrl.label = label;
        ir.controls.push(ctrl);
        break;
      }

      case 'stepper': {
        const ctrl: any = { as: 'stepper', bind: s.bind };
        const label = propStr(s.props, 'label', cScope);
        const step = propNum(s.props, 'step', s.ln, cScope);
        if (label) ctrl.label = label;
        if (step != null) ctrl.step = step;
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
        if (set) ctrl.set = set;
        if (step) ctrl.step = step;
        if (animate) ctrl.animate = animate;
        if (toggle) ctrl.toggle = toggle;
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
