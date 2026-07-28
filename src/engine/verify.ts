import type { LessonIR, SlideIR } from '@/engine/ir/lesson';
import type { SceneIR } from '@/engine/ir/types';
import { evalNum } from '@/engine/expr';

export interface Finding {
  slideId: string;
  code: string;
  message: string;
}

const SAMPLES = 60;

function planeDomain(scene: SceneIR | undefined) {
  if (!scene || scene.space?.type !== 'plane') return null;
  const { xDomain, yDomain } = scene.space;
  if (!xDomain || !yDomain) return null;
  return { x: xDomain, y: yDomain };
}

type CurveObj = Extract<NonNullable<SceneIR['objects']>[number], { type: 'curve' }>;

function sceneCurves(scene: SceneIR | undefined): CurveObj[] {
  return (scene?.objects ?? []).filter((o): o is CurveObj => o.type === 'curve');
}

function initialState(scene: SceneIR | undefined): Record<string, number | boolean | string> {
  const scope: Record<string, number | boolean | string> = {};
  for (const [name, v] of Object.entries(scene?.state ?? {})) scope[name] = v.init;
  return scope;
}

function sampleCurve(
  expr: unknown,
  from: number,
  to: number,
  state: Record<string, number | boolean | string>
) {
  let finite = 0;
  let threw = 0;
  let total = 0;
  for (let i = 0; i <= SAMPLES; i++) {
    const x = from + ((to - from) * i) / SAMPLES;
    total++;
    try {
      const y = evalNum(expr as never, { ...state, x } as never);
      if (Number.isFinite(y)) finite++;
    } catch {
      threw++;
    }
  }
  return { finite, threw, total };
}

function checkCurves(slide: SlideIR, out: Finding[]) {
  const dom = planeDomain(slide.scene);
  if (!dom) return;
  const state = initialState(slide.scene);
  for (const c of sceneCurves(slide.scene)) {
    if (c.xExpr || c.yExpr || c.where) continue;
    if (c.expr === undefined) continue;
    const { finite, threw, total } = sampleCurve(c.expr, dom.x[0], dom.x[1], state);
    if (threw > 0) continue;
    if (finite === 0) {
      out.push({
        slideId: slide.id,
        code: 'V_CURVE_EMPTY',
        message: `curve "${c.id ?? '?'}" never produces a finite value across x in [${dom.x[0]}, ${dom.x[1]}], so nothing will be drawn`,
      });
    } else if (finite / total < 0.25) {
      out.push({
        slideId: slide.id,
        code: 'V_CURVE_MOSTLY_UNDEFINED',
        message: `curve "${c.id ?? '?'}" is defined for only ${Math.round((finite / total) * 100)}% of the scene's x range, which is usually a domain or asymptote mistake`,
      });
    }
  }
}

function checkTable(slide: SlideIR, out: Finding[]) {
  const ex = slide.exercise;
  if (ex?.kind !== 'table') return;
  const curves = sceneCurves(slide.scene).filter(
    (c) => !c.xExpr && !c.where && c.expr !== undefined
  );
  if (curves.length !== 1) return;
  const curve = curves[0];

  for (const row of ex.rows) {
    if (row.length !== 2) continue;
    const given = row[0];
    const blank = row[1];
    if (!('value' in given) || !('blank' in blank)) continue;
    let actual: number;
    try {
      actual = evalNum(
        curve.expr as never,
        { ...initialState(slide.scene), x: given.value } as never
      );
    } catch {
      return;
    }
    if (!Number.isFinite(actual)) continue;
    if (Math.abs(actual - blank.answer) > Math.max(ex.tolerance, 1e-6)) {
      out.push({
        slideId: slide.id,
        code: 'V_TABLE_OFF_CURVE',
        message: `table expects ${blank.answer} at x = ${given.value}, but the slide's curve gives ${Number(actual.toFixed(6))}`,
      });
    }
  }
}

function checkTargetsInDomain(slide: SlideIR, out: Finding[]) {
  const ex = slide.exercise;
  const dom = planeDomain(slide.scene);
  if (!dom || !ex) return;
  const inside = (x: number, y: number) =>
    x >= dom.x[0] && x <= dom.x[1] && y >= dom.y[0] && y <= dom.y[1];

  if (ex.kind === 'hotspot') {
    const t = ex.target;
    if (!inside(t.x, t.y)) {
      out.push({
        slideId: slide.id,
        code: 'V_HOTSPOT_OFFSCREEN',
        message: `hotspot target sits at (${t.x}, ${t.y}), outside the scene's visible range, so it can never be tapped`,
      });
    }
  }

  if (ex.kind === 'sketch') {
    for (const [x, y] of ex.targets ?? []) {
      if (!inside(x, y)) {
        out.push({
          slideId: slide.id,
          code: 'V_SKETCH_OFFSCREEN',
          message: `sketch target (${x}, ${y}) is outside the scene's visible range`,
        });
      }
    }
  }
}

function checkMatchOrder(slide: SlideIR, out: Finding[]) {
  const ex = slide.exercise;
  if (ex?.kind === 'match') {
    const rights = ex.pairs.map((p) => p.right);
    const dupe = rights.find((r, i) => rights.indexOf(r) !== i);
    if (dupe !== undefined) {
      out.push({
        slideId: slide.id,
        code: 'V_MATCH_AMBIGUOUS',
        message: `two pairs share the right-hand side "${dupe}", so more than one arrangement is correct`,
      });
    }
    for (const d of ex.decoys ?? []) {
      if (rights.includes(d)) {
        out.push({
          slideId: slide.id,
          code: 'V_MATCH_DECOY_REAL',
          message: `decoy "${d}" is also a real answer, so it isn't a decoy`,
        });
      }
    }
  }

  if (ex?.kind === 'order') {
    const dupe = ex.items.find((it, i) => ex.items.indexOf(it) !== i);
    if (dupe !== undefined) {
      out.push({
        slideId: slide.id,
        code: 'V_ORDER_AMBIGUOUS',
        message: `item "${dupe}" appears twice, so the correct order is ambiguous`,
      });
    }
    for (const d of ex.decoys ?? []) {
      if (ex.items.includes(d)) {
        out.push({
          slideId: slide.id,
          code: 'V_ORDER_DECOY_REAL',
          message: `decoy "${d}" is also one of the real items`,
        });
      }
    }
  }
}

function checkSort(slide: SlideIR, out: Finding[]) {
  const ex = slide.exercise;
  if (ex?.kind !== 'sort') return;

  const labels = ex.bins.map((b) => b.label);
  const dupe = labels.find((l, i) => labels.indexOf(l) !== i);
  if (dupe !== undefined) {
    out.push({
      slideId: slide.id,
      code: 'V_SORT_DUP_BIN',
      message: `two bins are both labelled "${dupe}", so the learner can't tell them apart`,
    });
  }

  if (ex.bins.length > 1 && ex.bins.every((b) => b.items.length === 1)) {
    out.push({
      slideId: slide.id,
      code: 'V_SORT_THIN',
      message: 'every bin holds exactly one item, so this is a matching exercise wearing a costume',
    });
  }
}

function checkBuild(slide: SlideIR, out: Finding[]) {
  const ex = slide.exercise;
  if (ex?.kind !== 'build') return;

  const labels = ex.bank.map((t) => t.label);
  for (const answer of ex.answers) {
    if (answer.length !== ex.slots) {
      out.push({
        slideId: slide.id,
        code: 'V_BUILD_SLOTS',
        message: `an accepted answer is ${answer.length} tokens long but there are ${ex.slots} slots, so it can never be entered`,
      });
    }
    if (ex.reusable) {
      const missing = answer.find((tok) => !labels.includes(tok));
      if (missing !== undefined) {
        out.push({
          slideId: slide.id,
          code: 'V_BUILD_UNREACHABLE',
          message: `the answer needs "${missing}", which isn't in the bank`,
        });
      }
      continue;
    }
    const pool = [...labels];
    for (const tok of answer) {
      const at = pool.indexOf(tok);
      if (at < 0) {
        out.push({
          slideId: slide.id,
          code: 'V_BUILD_UNREACHABLE',
          message: `the answer uses "${tok}" more times than the bank provides, and the bank isn't reusable`,
        });
        break;
      }
      pool.splice(at, 1);
    }
  }
}

function checkDetourReachable(lesson: LessonIR, out: Finding[]) {
  const targeted = new Set<string>();
  for (const s of lesson.slides) {
    const t = s.exercise?.onwrong?.slide;
    if (t) targeted.add(t);
  }
  for (const s of lesson.slides) {
    if (s.hidden && !targeted.has(s.id)) {
      out.push({
        slideId: s.id,
        code: 'V_DETOUR_ORPHAN',
        message:
          'slide is hidden but no exercise sends anyone to it, so no learner can ever reach it',
      });
    }
  }
}

export function verifyLesson(lesson: LessonIR): Finding[] {
  const out: Finding[] = [];
  for (const slide of lesson.slides) {
    checkCurves(slide, out);
    checkTable(slide, out);
    checkTargetsInDomain(slide, out);
    checkMatchOrder(slide, out);
    checkSort(slide, out);
    checkBuild(slide, out);
  }
  checkDetourReachable(lesson, out);
  return out;
}
