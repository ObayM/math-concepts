import { sceneSchema } from '@/engine/ir/schema';
import type { SceneIR } from '@/engine/ir/types';
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

  const lines = source.split('\n');
  for (let n = 0; n < lines.length; n++) {
    let raw = lines[n];
    const hash = raw.indexOf('#');
    if (hash >= 0) raw = raw.slice(0, hash);
    const line = raw.trim();
    if (!line) continue;

    const toks = scanLine(line);
    const kw = toks[0];
    const rest = toks.slice(1);
    const ln = n + 1;

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
          const [axis, bind] = o.drag.split('->');
          obj.draggable = { axis, bind };
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

      case 'slider':
      case 'toggle': {
        const bind = rest[0];
        const ctrl: any = { as: kw, bind };
        const labelTok = rest.find((t) => t.startsWith('"'));
        if (labelTok) ctrl.label = unq(labelTok);
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
