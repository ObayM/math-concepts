import { sceneSchema } from '@/engine/ir/schema';
import type { SceneIR } from '@/engine/ir/types';
import { evalNumber } from '@/engine/runtime/eval';
import { scanLine } from './scan';
import { CompileError } from './errors';

function unq(t: string): string {
  return t.length >= 2 && t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
}

function inner(t: string): string {
  const m = t.match(/^[([]([\s\S]*)[)\]]$/);
  return m ? m[1] : t;
}

function isOpt(t: string): boolean {
  return !t.startsWith('"') && /^[A-Za-z_]+:/.test(t);
}

function opts(tokens: string[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (const t of tokens) {
    if (isOpt(t)) {
      const idx = t.indexOf(':');
      o[t.slice(0, idx)] = unq(t.slice(idx + 1));
    }
  }
  return o;
}

function coerce(raw: string): number | boolean | string {
  const s = unq(raw);
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

function num(s: string, line: number): number {
  const v = Number(unq(s));
  if (Number.isNaN(v)) throw new CompileError(`expected a number, got "${s}"`, line);
  return v;
}

function splitPair(tok: string, line: number): [string, string] {
  const body = inner(tok);
  const ci = body.indexOf(',');
  if (ci < 0) throw new CompileError(`expected (a, b), got "${tok}"`, line);
  return [body.slice(0, ci).trim(), body.slice(ci + 1).trim()];
}

function applyCommon(obj: any, o: Record<string, string>) {
  if (o.color) obj.color = o.color;
  if (o.style) obj.style = o.style;
  if (o.show) obj.visibleIf = o.show;
  if (o.width) obj.strokeWidth = Number(o.width);
}

export function compile(source: string): SceneIR {
  const ir: any = { state: {}, space: null, objects: [], controls: [], timeline: [] };

  const strip = (s: string) => {
    const h = s.indexOf('#');
    return (h >= 0 ? s.slice(0, h) : s).trim();
  };

  const subst = (line: string, scope: Record<string, number>) =>
    line.replace(/\{\{([^}]+)\}\}/g, (_, e) =>
      String(Math.round(evalNumber(e.trim(), scope) * 1e6) / 1e6)
    );

  function runLine(line: string, ln: number) {
    const toks = scanLine(line);
    const kw = toks[0];
    const rest = toks.slice(1);

    switch (kw) {
      case 'scene': {
        const o = opts(rest);
        const type = rest.find((t) => !isOpt(t)) ?? 'plane';
        if (!o.x || !o.y) throw new CompileError('scene needs x:[..] and y:[..]', ln);
        const [xa, xb] = inner(o.x)
          .split(',')
          .map((s) => num(s, ln));
        const [ya, yb] = inner(o.y)
          .split(',')
          .map((s) => num(s, ln));
        ir.space = { type, xDomain: [xa, xb], yDomain: [ya, yb] };
        if (rest.includes('grid')) ir.space.grid = true;
        if (rest.includes('axes')) ir.space.axes = true;
        if (o.render) ir.space.render = o.render;
        break;
      }

      case 'param': {
        const name = rest[0];
        const eq = rest.indexOf('=');
        if (eq < 0) throw new CompileError('param needs `= <number>`', ln);
        const def: any = { type: 'number', init: num(rest[eq + 1], ln) };
        const inIdx = rest.indexOf('in');
        if (inIdx >= 0) {
          const [mn, mx] = inner(rest[inIdx + 1])
            .split(',')
            .map((s) => num(s, ln));
          def.min = mn;
          def.max = mx;
        }
        const stepIdx = rest.indexOf('step');
        if (stepIdx >= 0) def.step = num(rest[stepIdx + 1], ln);
        ir.state[name] = def;
        break;
      }

      case 'bool': {
        const name = rest[0];
        const eq = rest.indexOf('=');
        if (eq < 0) throw new CompileError('bool needs `= true|false`', ln);
        ir.state[name] = { type: 'boolean', init: unq(rest[eq + 1]) === 'true' };
        break;
      }

      case 'curve': {
        const id = rest[0];
        const eq = rest.indexOf('=');
        if (eq < 0) throw new CompileError('curve needs `= <expr>`', ln);
        const after = rest.slice(eq + 1);
        const obj: any = { id, type: 'curve', expr: after.filter((t) => !isOpt(t)).join(' ') };
        applyCommon(obj, opts(after));
        ir.objects.push(obj);
        break;
      }

      case 'point': {
        const id = rest[0];
        const eq = rest.indexOf('=');
        if (eq < 0) throw new CompileError('point needs `= (x, y)`', ln);
        const [x, y] = splitPair(rest[eq + 1], ln);
        const o = opts(rest.slice(eq + 2));
        const obj: any = { id, type: 'point', x, y };
        if (o.r) obj.r = Number(o.r);
        if (o.label) obj.label = o.label;
        if (o.drag) {
          const [axis, binds] = o.drag.split('->');
          const [bind, bindY] = binds.split(',');
          obj.draggable = bindY ? { axis, bind, bindY } : { axis, bind };
        }
        applyCommon(obj, o);
        ir.objects.push(obj);
        break;
      }

      case 'line': {
        const id = rest[0];
        const o = opts(rest);
        const obj: any = { id, type: 'line' };
        if (o.through && o.slope) {
          obj.through = o.through;
          obj.slope = o.slope;
        } else {
          const eq = rest.indexOf('=');
          if (eq < 0) throw new CompileError('line needs through:+slope: or = (a,b)->(c,d)', ln);
          const seg = rest[eq + 1].split('->');
          if (seg.length !== 2) throw new CompileError('line segment must be (a,b)->(c,d)', ln);
          const [x1, y1] = splitPair(seg[0], ln);
          const [x2, y2] = splitPair(seg[1], ln);
          Object.assign(obj, { x1, y1, x2, y2 });
        }
        applyCommon(obj, o);
        ir.objects.push(obj);
        break;
      }

      case 'label': {
        let r = rest;
        let id: string | undefined;
        if (r[0] !== 'at') {
          id = r[0];
          r = r.slice(1);
        }
        if (r[0] !== 'at') throw new CompileError('label needs `at (x, y) "text"`', ln);
        const [x, y] = splitPair(r[1], ln);
        const textTok = r.slice(2).find((t) => t.startsWith('"'));
        if (!textTok) throw new CompileError('label needs "text"', ln);
        const o = opts(r.slice(2));
        const obj: any = {
          id: id ?? `label-${ir.objects.length}`,
          type: 'label',
          x,
          y,
          text: unq(textTok),
        };
        if (o.size) obj.fontSize = Number(o.size);
        applyCommon(obj, o);
        ir.objects.push(obj);
        break;
      }

      case 'rect': {
        // rect <id> = (x, y) (w, h) [opts]   - (x,y) is bottom-left corner
        const id = rest[0];
        const eq = rest.indexOf('=');
        if (eq < 0) throw new CompileError('rect needs `= (x, y) (w, h)`', ln);
        const [x, y] = splitPair(rest[eq + 1], ln);
        const [w, h] = splitPair(rest[eq + 2], ln);
        const o = opts(rest.slice(eq + 3));
        const obj: any = { id, type: 'rect', x, y, w, h };
        if (o.opacity) obj.opacity = Number(o.opacity);
        applyCommon(obj, o);
        ir.objects.push(obj);
        break;
      }

      case 'circle': {
        // circle <id> = (x, y) <r> [opts]
        const id = rest[0];
        const eq = rest.indexOf('=');
        if (eq < 0) throw new CompileError('circle needs `= (x, y) <r>`', ln);
        const [x, y] = splitPair(rest[eq + 1], ln);
        const after = rest.slice(eq + 2);
        const r = after.find((t) => !isOpt(t));
        if (r == null) throw new CompileError('circle needs a radius', ln);
        const o = opts(after);
        const obj: any = { id, type: 'circle', x, y, r };
        if (o.opacity) obj.opacity = Number(o.opacity);
        applyCommon(obj, o);
        ir.objects.push(obj);
        break;
      }

      case 'polygon': {
        // polygon <id> = (x1,y1) (x2,y2) (x3,y3) ... [opts]
        const id = rest[0];
        const eq = rest.indexOf('=');
        if (eq < 0) throw new CompileError('polygon needs `= (x1,y1) (x2,y2) ...`', ln);
        const after = rest.slice(eq + 1);
        const points = after.filter((t) => t.startsWith('(')).map((t) => splitPair(t, ln));
        if (points.length < 2) throw new CompileError('polygon needs at least 2 points', ln);
        const o = opts(after);
        const obj: any = { id, type: 'polygon', points };
        if (o.opacity) obj.opacity = Number(o.opacity);
        applyCommon(obj, o);
        ir.objects.push(obj);
        break;
      }

      case 'vector': {
        // vector <id> = (x1,y1)->(x2,y2) [opts]
        const id = rest[0];
        const eq = rest.indexOf('=');
        if (eq < 0) throw new CompileError('vector needs `= (x1,y1)->(x2,y2)`', ln);
        const seg = rest[eq + 1].split('->');
        if (seg.length !== 2) throw new CompileError('vector must be (a,b)->(c,d)', ln);
        const [x1, y1] = splitPair(seg[0], ln);
        const [x2, y2] = splitPair(seg[1], ln);
        const obj: any = { id, type: 'vector', x1, y1, x2, y2 };
        applyCommon(obj, opts(rest.slice(eq + 2)));
        ir.objects.push(obj);
        break;
      }

      case 'arc': {
        // arc <id> = (x, y) <r> <start> <end> [opts]   (degrees, CCW)
        const id = rest[0];
        const eq = rest.indexOf('=');
        if (eq < 0) throw new CompileError('arc needs `= (x, y) <r> <start> <end>`', ln);
        const [x, y] = splitPair(rest[eq + 1], ln);
        const after = rest.slice(eq + 2);
        const nums = after.filter((t) => !isOpt(t));
        if (nums.length < 3) throw new CompileError('arc needs radius, start, end', ln);
        const [r, start, end] = nums;
        const obj: any = { id, type: 'arc', x, y, r, start, end };
        applyCommon(obj, opts(after));
        ir.objects.push(obj);
        break;
      }

      case 'slider':
      case 'toggle': {
        const bind = rest[0];
        const ctrl: any = { as: kw, bind };
        const labelTok = rest.find((t) => t.startsWith('"'));
        if (labelTok) ctrl.label = unq(labelTok);
        ir.controls.push(ctrl);
        break;
      }

      case 'stepper': {
        // stepper <bind> ["label"] [step:<n>]
        const ctrl: any = { as: 'stepper', bind: rest[0] };
        const labelTok = rest.find((t) => t.startsWith('"'));
        if (labelTok) ctrl.label = unq(labelTok);
        const o = opts(rest);
        if (o.step) ctrl.step = Number(o.step);
        ir.controls.push(ctrl);
        break;
      }

      case 'button': {
        // button "label" [set k=v] [step k=v] [toggle k] [animate k=v] [ease:.. dur:..]
        const ctrl: any = { as: 'button', label: '' };
        const set: Record<string, number | boolean | string> = {};
        const step: Record<string, number> = {};
        const animate: Record<string, number> = {};
        let i = 0;
        while (i < rest.length) {
          const t = rest[i];
          if (t.startsWith('"')) {
            ctrl.label = unq(t);
            i++;
          } else if (t === 'toggle') {
            ctrl.toggle = rest[i + 1];
            i += 2;
          } else if (t === 'set' || t === 'step' || t === 'animate') {
            const pair = rest[i + 1] ?? '';
            const eqi = pair.indexOf('=');
            if (eqi < 0) throw new CompileError(`button ${t} needs key=value`, ln);
            const key = pair.slice(0, eqi);
            const val = coerce(pair.slice(eqi + 1));
            if (t === 'set') set[key] = val;
            else if (t === 'step') step[key] = Number(val);
            else animate[key] = Number(val);
            i += 2;
          } else {
            i++;
          }
        }
        const o = opts(rest);
        if (Object.keys(set).length) ctrl.set = set;
        if (Object.keys(step).length) ctrl.step = step;
        if (Object.keys(animate).length) ctrl.animate = animate;
        if (o.ease) ctrl.ease = o.ease;
        if (o.dur) ctrl.duration = Number(o.dur);
        if (!ctrl.label) throw new CompileError('button needs a "label"', ln);
        ir.controls.push(ctrl);
        break;
      }

      case 'step': {
        const set: Record<string, number | boolean | string> = {};
        const animate: Record<string, number> = {};
        let narrate: string | undefined;
        let i = 0;
        while (i < rest.length) {
          const t = rest[i];
          if (t.startsWith('"')) {
            narrate = unq(t);
            i++;
          } else if (t === 'set' || t === 'animate') {
            const pair = rest[i + 1] ?? '';
            const eqi = pair.indexOf('=');
            if (eqi < 0) throw new CompileError(`${t} needs key=value`, ln);
            const key = pair.slice(0, eqi);
            const val = coerce(pair.slice(eqi + 1));
            if (t === 'set') set[key] = val;
            else animate[key] = Number(val);
            i += 2;
          } else {
            i++;
          }
        }
        const o = opts(rest);
        const stepObj: any = {};
        if (Object.keys(set).length) stepObj.set = set;
        if (Object.keys(animate).length) stepObj.animate = animate;
        if (narrate) stepObj.narrate = narrate;
        if (o.ease) stepObj.ease = o.ease;
        if (o.dur) stepObj.duration = Number(o.dur);
        ir.timeline.push(stepObj);
        break;
      }

      default:
        throw new CompileError(`unknown keyword "${kw}"`, ln);
    }
  }

  type Ln = { text: string; ln: number };

  function parseRepeat(header: string, ln: number) {
    const toks = scanLine(header);
    if (!toks[1] || toks[2] !== 'in')
      throw new CompileError('repeat needs `repeat <var> in a..b {`', ln);
    const name = toks[1];
    const mm = (toks[3] ?? '').match(/^(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$/);
    if (!mm) throw new CompileError('repeat range must be a..b (numbers)', ln);
    const a = Number(mm[1]);
    const b = Number(mm[2]);
    const stepIdx = toks.indexOf('step');
    const s = stepIdx >= 0 ? Number(toks[stepIdx + 1]) : 1;
    if (!(s > 0)) throw new CompileError('repeat step must be > 0', ln);
    const values: number[] = [];
    for (let v = a; v <= b + 1e-9; v += s) {
      values.push(Math.round(v * 1e6) / 1e6);
      if (values.length > 5000) throw new CompileError('repeat exceeds 5000 iterations', ln);
    }
    return { name, values };
  }

  function processBlock(block: Ln[], scope: Record<string, number>) {
    let i = 0;
    while (i < block.length) {
      const t = strip(block[i].text);
      const ln = block[i].ln;
      if (!t) {
        i++;
        continue;
      }
      if (t.startsWith('repeat')) {
        const { name, values } = parseRepeat(subst(t, scope), ln);
        i++;
        const body: Ln[] = [];
        let depth = 1;
        while (i < block.length && depth > 0) {
          const bt = strip(block[i].text);
          if (bt === '}') {
            depth--;
            if (depth === 0) {
              i++;
              break;
            }
            body.push(block[i]);
            i++;
            continue;
          }
          body.push(block[i]);
          if (bt.endsWith('{')) depth++;
          i++;
        }
        if (depth > 0) throw new CompileError('unclosed `repeat {`', ln);
        for (const v of values) processBlock(body, { ...scope, [name]: v });
      } else {
        runLine(subst(t, scope), ln);
        i++;
      }
    }
  }

  processBlock(
    source.split('\n').map((text, k) => ({ text, ln: k + 1 })),
    {}
  );

  if (!ir.space) throw new CompileError('missing a `scene ...` line');
  if (!ir.controls.length) delete ir.controls;
  if (!ir.timeline.length) delete ir.timeline;

  const result = sceneSchema.safeParse(ir);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new CompileError(`invalid scene: ${first.path.join('.')} ${first.message}`);
  }
  return result.data;
}
