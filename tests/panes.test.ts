import { describe, it, expect } from 'vitest';
import { compileLesson, CompileError } from '@/engine/lang';
import { lessonSchema, slideScenes } from '@/engine/ir/lesson';
import { evalGoals } from '@/engine/runtime/goals';
import { exerciseVisible } from '@/engine/runtime/flow';
import { emptyMemory, keepFromScope, keptInitial } from '@/engine/runtime/memory';
import { checkStandard } from '@/engine/standard';
import { verifyLesson } from '@/engine/verify';
import { buildTutorContext, renderContext } from '@/lib/tutor';
import { compileAny } from '@/components/prism/compileAny';

const lesson = (body: string) => lessonSchema.parse(compileLesson(`lesson "L" {\n${body}\n}`));
const slide = (body: string) => lesson(`  slide "S" {\n${body}\n  }`).slides[0];
const codes = (body: string) =>
  verifyLesson(lesson(`  slide "S" {\n${body}\n  }`)).map((f) => f.code);

function compileError(body: string): CompileError {
  try {
    slide(body);
  } catch (e) {
    if (e instanceof CompileError) return e;
    throw e;
  }
  throw new Error('expected a compile error');
}

const FACE = `    scene space3 {
      x: [-2, 2]
      y: [-2, 2]
      z: [-2, 2]
      alt: "a panel with edges a and b"
      segment3 a = (0, 0, 0) -> (1, 0, 0) { color: primary }
      segment3 b = (0, 0, 0) -> (cos(th), sin(th), 0) { color: accent }
      slider th { label: "swing b" }
    }
    scene plane {
      x: [-2, 2]
      y: [-2, 2]
      aspect: equal
      alt: "the same floor from above"
      param th = 0.5 { range: [0, 3.14], step: 0.01 }
      bool showN = false
      vector a = (0, 0) -> (1, 0) { color: primary }
      vector b = (0, 0) -> (cos(th), sin(th)) { color: accent }
      toggle showN { label: "normal" }
    }
    goal "Swing b past a right angle" { when: th > 1.6, showme: { th: 2 } }`;

describe('linked views: compile', () => {
  it('puts the whole slide state, controls and timeline on the first scene', () => {
    const s = slide(FACE);
    expect(s.scene!.space.type).toBe('space3');
    expect(Object.keys(s.scene!.state)).toEqual(['th', 'showN']);
    expect(s.scene!.controls!.map((c) => c.as)).toEqual(['slider', 'toggle']);
    expect(s.pane!.space.type).toBe('plane');
    expect(s.pane!.space.alt).toBe('the same floor from above');
    expect(s.pane!.objects.map((o) => o.id)).toEqual(['a', 'b']);
    expect(Object.keys(s.pane!)).toEqual(['space', 'objects']);
  });

  it('leaves a one-scene slide without a pane', () => {
    const s = slide('    scene plane {\n      x: [0, 1]\n      y: [0, 1]\n    }');
    expect(s.pane).toBeUndefined();
    expect(slideScenes(s)).toHaveLength(1);
  });

  it('still parses stored IR written before panes existed', () => {
    const old = { ...lesson(`  slide "S" {\n${FACE}\n  }`) };
    old.slides = old.slides.map(({ pane: _pane, ...rest }) => rest);
    expect(lessonSchema.safeParse(old).success).toBe(true);
  });

  it('gives the second pane the shared state when read through slideScenes', () => {
    const [first, second] = slideScenes(slide(FACE));
    expect(second.state).toBe(first.state);
    expect(second.controls).toBeUndefined();
  });

  it('resolves a name in the first scene that the second one declares', () => {
    const s = slide(FACE);
    const b = s.scene!.objects.find((o) => o.id === 'b') as { x2: unknown };
    expect(JSON.stringify(b.x2)).toContain('"th"');
  });

  it('refuses the same param declared in both scenes, pointing at the second', () => {
    const src = `    scene plane {
      x: [0, 1]
      y: [0, 1]
      param t = 0
    }
    scene plane {
      x: [0, 1]
      y: [0, 1]
      param t = 1
    }`;
    const e = compileError(src);
    expect(e.message).toMatch(/"t" is already declared in the other scene/);
    expect(e.line).toBe(11);
  });

  it('suggests a name from the other scene for a typo', () => {
    const e = compileError(FACE.replace('sin(th), 0)', 'sin(thh), 0)'));
    expect(e.message).toMatch(/"thh" is not defined here/);
    expect(e.message).toMatch(/did you mean "th"/);
  });

  it('checks a control binding against both scenes', () => {
    const e = compileError(FACE.replace('slider th {', 'slider tth {'));
    expect(e.message).toMatch(/slider binds "tth" but there is no such state/);
    expect(e.message).toMatch(/did you mean "th"/);
  });

  it('allows at most two scenes', () => {
    const one = '    scene plane {\n      x: [0, 1]\n      y: [0, 1]\n    }\n';
    expect(compileError(one + one + one).message).toMatch(/at most two scenes/);
  });

  it('allows steps in only one of the two scenes', () => {
    const withStep =
      '    scene plane {\n      x: [0, 1]\n      y: [0, 1]\n      step "hi"\n    }\n';
    expect(compileError(withStep + withStep).message).toMatch(/only one of the two scenes/);
  });

  it('lets a step in one scene point attention at an object in the other', () => {
    const pair = (ids: string) => `    scene plane {
      x: [0, 1]
      y: [0, 1]
      curve f = x
    }
    scene plane {
      x: [0, 1]
      y: [0, 1]
      step "look" { indicate: [${ids}] }
    }`;
    expect(slide(pair('f')).scene!.timeline![0].indicate).toEqual(['f']);
    expect(compileError(pair('g')).message).toMatch(/indicate: no object "g"/);
  });

  it('counts after: steps against the one shared timeline', () => {
    const src = FACE.replace(
      'toggle showN',
      'step "one"\n      step "two"\n      toggle showN'
    ).concat(
      '\n    quiz {\n      ask "which way?"\n      * "up"\n      - "down"\n      after: 2\n    }'
    );
    const s = slide(src);
    expect(exerciseVisible(s, [], 0)).toBe(false);
    expect(exerciseVisible(s, [], 1)).toBe(true);
  });

  it('wraps a bare pair of scenes as one slide in snippets', () => {
    const { lesson: l, error } = compileAny(
      'scene plane {\n  x: [0, 1]\n  y: [0, 1]\n  param t = 0\n}\nscene plane {\n  x: [0, 1]\n  y: [0, 1]\n  point p = (t, t)\n}'
    );
    expect(error).toBeNull();
    expect(l!.slides[0].pane).toBeDefined();
  });
});

describe('linked views: runtime', () => {
  it('evaluates a goal over a param the second scene declares', () => {
    const s = slide(FACE);
    const state = Object.fromEntries(Object.entries(s.scene!.state).map(([k, d]) => [k, d.init]));
    expect(evalGoals(s.goals!, [], state)).toEqual([false]);
    expect(evalGoals(s.goals!, [], { ...state, th: 2 })).toEqual([true]);
  });

  it('keeps a param declared in the second scene', () => {
    const src = FACE.replace('step: 0.01 }', 'step: 0.01, keep }');
    const s = slide(src);
    const memory = keepFromScope(emptyMemory(), s, { th: 1.2 });
    expect(keptInitial(s, memory)).toEqual({ th: 1.2 });
  });

  it('tells the tutor there are two linked diagrams, with the shared values', () => {
    const l = lesson(`  slide "S" {\n    id: "s"\n${FACE}\n  }`);
    const ctx = buildTutorContext(l, 's', { scope: { th: 1.1, showN: true } })!;
    expect(ctx.scene).toEqual({ space: 'space3', pane: 'plane', values: { th: 1.1, showN: true } });
    expect(renderContext(ctx)).toMatch(/two linked interactive diagrams/);
  });
});

describe('linked views: verify and the standard', () => {
  it('passes the forcing example clean of pane findings', () => {
    const found = codes(FACE);
    expect(found).not.toContain('V_SCENE_NO_ALT');
    expect(found).not.toContain('V_GOAL_MET_AT_LOAD');
    expect(found).not.toContain('V_SHOWME_MISSES');
  });

  it('asks for alt: on the second scene too', () => {
    const found = checkStandard(
      lesson(`  slide "S" {\n${FACE.replace('    alt: "the same floor from above"\n', '')}\n  }`)
    );
    const alt = found.filter((f) => f.code === 'V_SCENE_NO_ALT');
    expect(alt).toHaveLength(1);
    expect(alt[0].message).toMatch(/second scene/);
  });

  it('flags a goal already met by the second scene starting values', () => {
    expect(codes(FACE.replace('param th = 0.5', 'param th = 2'))).toContain('V_GOAL_MET_AT_LOAD');
  });

  it('flags a showme that misses, over second-scene state', () => {
    expect(codes(FACE.replace('showme: { th: 2 }', 'showme: { th: 1 }'))).toContain(
      'V_SHOWME_MISSES'
    );
  });

  it('sees a draggable point in the second scene as interactive', () => {
    const src = `    scene plane {
      x: [0, 4]
      y: [0, 4]
      alt: "one"
      param t = 1 { range: [0, 4] }
    }
    scene plane {
      x: [0, 4]
      y: [0, 4]
      alt: "two"
      point p = (t, 1) { drag: x -> t }
    }`;
    expect(codes(src)).toContain('V_SCENE_NO_TASK');
  });

  it('samples curves in the second scene against its own domain', () => {
    const src = `    scene plane {
      x: [0, 4]
      y: [0, 4]
      alt: "one"
    }
    scene plane {
      x: [-4, -1]
      y: [0, 4]
      alt: "two"
      curve f = sqrt(x)
    }`;
    expect(codes(src)).toContain('V_CURVE_EMPTY');
  });

  it('reads labels in the second scene for the answer-on-screen check', () => {
    const src = `    scene plane {
      x: [0, 4]
      y: [0, 4]
      alt: "one"
    }
    scene plane {
      x: [0, 4]
      y: [0, 4]
      alt: "two"
      label at (1, 1) = "area 12"
    }
    numeric {
      ask "what is the area?"
      answer: 12
    }`;
    expect(codes(src)).toContain('V_ANSWER_ON_SCREEN');
  });
});
