import { slideScenes, type LessonIR, type SlideIR } from '@/engine/ir/lesson';
import type { SceneIR } from '@/engine/ir/types';
import type { ExprIR } from '@/engine/expr';
import { evalExpr, evalText } from '@/engine/expr';
import type { Finding } from './verify';

export const BANNED_PHRASES = [
  'note that',
  'clearly',
  'obviously',
  'trivially',
  'it can be shown',
  'recall that',
  'emphatically',
  'in this lesson we will',
];

type Scope = Record<string, number | boolean | string>;

const warn = (slideId: string, code: string, message: string): Finding => ({
  slideId,
  code,
  message,
  severity: 'warning',
});

function initialScope(scene: SceneIR | undefined): Scope {
  const scope: Scope = {};
  for (const [name, v] of Object.entries(scene?.state ?? {})) scope[name] = v.init;
  return scope;
}

function isInteractive(scene: SceneIR | undefined): boolean {
  if (!scene) return false;
  if (scene.controls?.length) return true;
  return (scene.objects ?? []).some(
    (o) => o.type === 'point' && Boolean((o as { draggable?: unknown }).draggable)
  );
}

function labelTexts(scene: SceneIR | undefined): string[] {
  if (!scene) return [];
  const scope = initialScope(scene);
  const out: string[] = [];
  for (const o of scene.objects ?? []) {
    if (o.type !== 'label' || o.phase === 'reveal') continue;
    try {
      out.push(typeof o.text === 'string' ? o.text : evalText(o.text, scope as never));
    } catch {
      continue;
    }
  }
  return out;
}

function studentText(slide: SlideIR): string[] {
  const ex = slide.exercise;
  const out = [slide.title ?? '', slide.prose ?? ''];
  for (const g of slide.goals ?? []) out.push(g.prompt, g.hint ?? '', ...(g.hints ?? []));
  if (ex) {
    out.push(ex.prompt, ex.explanation ?? '', ...ex.hints);
    if (ex.kind === 'quiz') for (const o of ex.options) out.push(o.text, o.why ?? '');
    if (ex.kind === 'hotspot') out.push(ex.miss ?? '');
  }
  out.push(...slideScenes(slide).flatMap(labelTexts));
  return out.filter(Boolean);
}

function standaloneNumbers(text: string): number[] {
  const stripped = text.replace(/[\^_]\{[^}]*\}|[\^_]-?\d+(\.\d+)?/g, ' ');
  const out: number[] = [];
  for (const m of stripped.matchAll(/(?<![\w.])-?\d+(?:\.\d+)?(?![\w.])/g)) out.push(Number(m[0]));
  return out;
}

function checkGoals(slide: SlideIR, out: Finding[]) {
  if (!slide.goals?.length) return;
  const scope = initialScope(slide.scene);
  const state = slide.scene?.state ?? {};
  const snapped = new Set(
    slideScenes(slide)
      .flatMap((sc) => sc.objects)
      .flatMap((o) => {
        const d = (o as { draggable?: { bind: string; bindY?: string; snap?: unknown } }).draggable;
        return d?.snap != null ? [d.bind, d.bindY].filter((b): b is string => Boolean(b)) : [];
      })
  );

  slide.goals.forEach((g, i) => {
    let met = false;
    try {
      met = Boolean(evalExpr(g.when as ExprIR, scope as never));
    } catch {
      met = false;
    }
    if (met) {
      out.push({
        slideId: slide.id,
        code: 'V_GOAL_MET_AT_LOAD',
        severity: 'error',
        message: `goal ${i + 1} ("${g.prompt}") is already true with the scene's starting values, so Continue opens before the student touches anything`,
      });
    }

    if (g.showme) {
      let lands = false;
      try {
        lands = Boolean(evalExpr(g.when as ExprIR, { ...scope, ...g.showme.set } as never));
      } catch {
        lands = false;
      }
      if (!lands) {
        out.push({
          slideId: slide.id,
          code: 'V_SHOWME_MISSES',
          severity: 'error',
          message: `goal ${i + 1}'s showme: leaves the goal unmet, so Show me would play and still leave Continue locked`,
        });
      }
    }

    for (const name of floatEquals(g.when as ExprIR)) {
      const def = state[name];
      if (def?.type !== 'number' || def.step != null || snapped.has(name)) continue;
      out.push(
        warn(
          slide.id,
          'V_GOAL_FLOAT_EQ',
          `goal ${i + 1} tests "${name}" with ==, but "${name}" has no step, so a slider or drag almost never lands on it exactly. Give it a step: or compare with < and >`
        )
      );
    }
  });
}

function floatEquals(e: ExprIR | undefined): string[] {
  if (!e || typeof e !== 'object') return [];
  if (e.k === 'bin') {
    const here =
      e.op === '=='
        ? [e.l, e.r].filter((s): s is { k: 'id'; name: string } => s.k === 'id').map((s) => s.name)
        : [];
    return [...here, ...floatEquals(e.l), ...floatEquals(e.r)];
  }
  if (e.k === 'un') return floatEquals(e.e);
  if (e.k === 'call') return e.args.flatMap(floatEquals);
  return [];
}

function checkTask(slide: SlideIR, out: Finding[]) {
  if (slide.exercise || slide.goals?.length) return;
  if (slideScenes(slide).some(isInteractive)) {
    out.push(
      warn(
        slide.id,
        'V_SCENE_NO_TASK',
        'the scene has something to drag or slide but nothing to find: add a goal or a question that needs it'
      )
    );
  } else if (!slide.hidden) {
    out.push(
      warn(
        slide.id,
        'V_SLIDE_NO_ACTION',
        'nothing to do on this slide, so a student can click Continue without reading it'
      )
    );
  }
}

function checkAnswerOnScreen(slide: SlideIR, out: Finding[]) {
  const ex = slide.exercise;
  if (ex?.kind !== 'numeric') return;
  const answers = ex.answers;
  const hit = (n: number) => answers.some((a) => Math.abs(a - n) <= Math.max(ex.tolerance, 1e-9));

  for (const text of slideScenes(slide).flatMap(labelTexts)) {
    if (standaloneNumbers(text).some(hit)) {
      out.push(
        warn(
          slide.id,
          'V_ANSWER_ON_SCREEN',
          `a label reads "${text}" when the slide loads, which already shows the answer`
        )
      );
      return;
    }
  }
  const meaningful = answers.filter((a) => Math.abs(a) > 1);
  if (!meaningful.length) return;
  const inProse = [slide.prose ?? '', ex.prompt].flatMap(standaloneNumbers);
  const shown = meaningful.find((a) =>
    inProse.some((n) => Math.abs(a - n) <= Math.max(ex.tolerance, 1e-9))
  );
  if (shown !== undefined) {
    out.push(
      warn(
        slide.id,
        'V_ANSWER_ON_SCREEN',
        `the answer ${shown} is already written in the slide's text`
      )
    );
  }
}

function checkVoice(slide: SlideIR, out: Finding[]) {
  const text = studentText(slide);
  if (text.some((t) => t.includes('—'))) {
    out.push(
      warn(
        slide.id,
        'V_EM_DASH',
        'student-facing text uses an em dash; use a comma, colon or full stop'
      )
    );
  }
  const lower = text.join('\n').toLowerCase();
  const found = BANNED_PHRASES.filter((p) => new RegExp(`\\b${p}\\b`).test(lower));
  if (found.length) {
    out.push(
      warn(
        slide.id,
        'V_BANNED_PHRASE',
        `uses ${found.map((p) => `"${p}"`).join(', ')}, which claims something instead of showing it`
      )
    );
  }
}

function checkBeats(lesson: LessonIR, out: Finding[]) {
  const main = lesson.slides.filter((s) => !s.hidden);
  if (!main.some((s) => s.beat)) return;
  const first = main[0].id;
  const beats = main.map((s) => s.beat);
  if (!beats.includes('trap'))
    out.push(
      warn(first, 'V_BEAT_NO_TRAP', 'no trap beat: the main misconception never gets walked into')
    );
  if (!beats.includes('transfer'))
    out.push(
      warn(first, 'V_BEAT_NO_TRANSFER', 'no transfer beat: the idea is never used somewhere new')
    );
  const name = beats.indexOf('name');
  const explore = beats.indexOf('explore');
  if (name >= 0 && (explore < 0 || name < explore)) {
    out.push(
      warn(
        main[name].id,
        'V_BEAT_NAME_FIRST',
        'the symbols get named before the student has explored the idea they name'
      )
    );
  }
}

function checkRequires(lesson: LessonIR, out: Finding[]) {
  const requires = lesson.requires ?? [];
  const checks = lesson.slides.filter((s) => s.beat === 'check' && !s.hidden);
  const tested = new Set<string>();
  for (const s of checks) {
    const skill = s.exercise?.skill ?? s.skill;
    if (skill) tested.add(skill);
    if (!skill || !requires.includes(skill))
      out.push(
        warn(
          s.id,
          'V_CHECK_NOT_REQUIRED',
          skill
            ? `this check tests "${skill}", which isn't in the lesson's requires:, so it can never be skipped for a student who has it`
            : 'this check has no skill:, so it can never be skipped for a student who already has the prerequisite'
        )
      );
  }
  const first = lesson.slides.find((s) => !s.hidden)?.id ?? '';
  for (const skill of requires) {
    if (!tested.has(skill))
      out.push(
        warn(
          first,
          'V_REQUIRES_UNCHECKED',
          `requires "${skill}" but no check beat tests it, so a student without it gets no warm up and no bridge`
        )
      );
  }
}

function checkAlt(slide: SlideIR, out: Finding[]) {
  if (slide.hidden) return;
  slideScenes(slide).forEach((scene, i) => {
    if (scene.space.alt) return;
    out.push(
      warn(
        slide.id,
        'V_SCENE_NO_ALT',
        `the ${i ? 'second ' : ''}scene has no alt: description, so a screen reader gets nothing. Say what the picture shows and what the student can change`
      )
    );
  });
}

export function checkStandard(lesson: LessonIR): Finding[] {
  const out: Finding[] = [];
  for (const slide of lesson.slides) {
    checkAlt(slide, out);
    checkGoals(slide, out);
    checkTask(slide, out);
    checkAnswerOnScreen(slide, out);
    checkVoice(slide, out);
  }
  if (lesson.kind !== 'bank') checkBeats(lesson, out);
  checkRequires(lesson, out);
  return out;
}
