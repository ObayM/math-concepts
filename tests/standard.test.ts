import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import { checkStandard } from '@/engine/standard';
import { verifyLesson, isBlocking } from '@/engine/verify';

const lesson = (body: string) => lessonSchema.parse(compileLesson(`lesson "L" {\n${body}\n}`));
const codes = (body: string) => checkStandard(lesson(body)).map((f) => f.code);

const quizSlide = (id: string, extra = '') => `  slide "${id}" {
    id: "${id}"
${extra}
    quiz {
      ask "q"
      * "a"
      - "b"
    }
  }`;

describe('goals', () => {
  const goalSlide = (init: number, step = ', step: 0.1') => `  slide "g" {
    scene plane {
      x: [0, 1]
      y: [0, 1]
      param h = ${init} { range: [0, 1]${step} }
      slider h
    }
    goal "Make h small" { when: h < 0.1 }
  }`;

  it('flags a goal that is already met when the slide loads, as a blocking error', () => {
    const found = checkStandard(lesson(goalSlide(0.05)));
    const met = found.find((f) => f.code === 'V_GOAL_MET_AT_LOAD')!;
    expect(met).toBeTruthy();
    expect(isBlocking(met)).toBe(true);
  });

  it('leaves a goal that needs work alone', () => {
    expect(codes(goalSlide(0.9))).not.toContain('V_GOAL_MET_AT_LOAD');
  });

  it('warns on == against a param with no step', () => {
    const body = `  slide "g" {
    scene plane {
      x: [0, 1]
      y: [0, 1]
      param h = 1 { range: [0, 1] }
      slider h
    }
    goal "Make h exactly a half" { when: h == 0.5 }
  }`;
    expect(codes(body)).toContain('V_GOAL_FLOAT_EQ');
    expect(codes(body.replace('range: [0, 1] }', 'range: [0, 1], step: 0.1 }'))).not.toContain(
      'V_GOAL_FLOAT_EQ'
    );
  });
});

describe('something to do', () => {
  it('flags an interactive scene with no goal or exercise', () => {
    expect(
      codes(`  slide "s" {
    scene plane {
      x: [0, 1]
      y: [0, 1]
      param h = 1 { range: [0, 1] }
      slider h
    }
  }`)
    ).toContain('V_SCENE_NO_TASK');
  });

  it('flags a reading-only slide on the main path', () => {
    expect(codes(`  slide "s" {\n    > Just words.\n  }`)).toContain('V_SLIDE_NO_ACTION');
  });

  it('is happy with a slide that asks something', () => {
    expect(codes(quizSlide('q'))).toEqual([]);
  });
});

describe('answer on screen', () => {
  it('flags a numeric answer already written in the prose', () => {
    expect(
      codes(`  slide "s" {
    > The answer is 12, obviously enough.
    numeric {
      ask "What is 3 times 4?"
      answer: 12
    }
  }`)
    ).toContain('V_ANSWER_ON_SCREEN');
  });

  it('flags a readout that shows the answer at load', () => {
    expect(
      codes(`  slide "s" {
    scene plane {
      x: [0, 1]
      y: [0, 1]
      param h = 0.5 { range: [0, 1], step: 0.1 }
      label at (0.5, 0.5) = "slope = \${2 * 3}"
    }
    numeric {
      ask "What is the slope?"
      answer: 6
    }
  }`)
    ).toContain('V_ANSWER_ON_SCREEN');
  });

  it('ignores exponents that happen to match', () => {
    expect(
      codes(`  slide "s" {
    > Differentiate $x^2$ at a point.
    numeric {
      ask "What is the derivative of x squared at 1?"
      answer: 2
    }
  }`)
    ).not.toContain('V_ANSWER_ON_SCREEN');
  });
});

describe('voice', () => {
  it('flags em dashes and banned phrases', () => {
    const found = codes(quizSlide('q', '    > Clearly this is it — done.'));
    expect(found).toContain('V_EM_DASH');
    expect(found).toContain('V_BANNED_PHRASE');
  });
});

describe('beats', () => {
  it('stays quiet for lessons that do not use beat:', () => {
    expect(codes(quizSlide('a'))).toEqual([]);
  });

  it('warns about a lesson with no trap or transfer', () => {
    const found = codes(
      [quizSlide('a', '    beat: hook'), quizSlide('b', '    beat: explore')].join('\n')
    );
    expect(found).toContain('V_BEAT_NO_TRAP');
    expect(found).toContain('V_BEAT_NO_TRANSFER');
  });

  it('warns when the symbols are named before any explore', () => {
    const found = codes(
      [
        quizSlide('a', '    beat: name'),
        quizSlide('b', '    beat: explore'),
        quizSlide('c', '    beat: trap'),
        quizSlide('d', '    beat: transfer'),
      ].join('\n')
    );
    expect(found).toEqual(['V_BEAT_NAME_FIRST']);
  });

  it('refuses an unknown beat', () => {
    expect(() => lesson(quizSlide('a', '    beat: hoook'))).toThrow(/did you mean "hook"/);
  });
});

describe('banks', () => {
  const bank = (body: string) =>
    checkStandard(
      lessonSchema.parse(compileLesson(`lesson "B" {\n  kind: "bank"\n${body}\n}`))
    ).map((f) => f.code);

  it('skips the beat checks, a bank is practice and has no story to tell', () => {
    expect(bank(quizSlide('a', '    beat: name\n    skill: "s"'))).toEqual([]);
  });
});

describe('verifyLesson', () => {
  it('keeps the standard as warnings, which never block a publish', () => {
    const found = verifyLesson(lesson(`  slide "s" {\n    > Just words.\n  }`));
    expect(found.every((f) => !isBlocking(f))).toBe(true);
  });
});

describe('show me', () => {
  const body = (to: number) => `  slide "g" {
    scene plane {
      x: [0, 1]
      y: [0, 1]
      param h = 1 { range: [0, 1], step: 0.001 }
      slider h
    }
    goal "Get h below 0.01" { when: h < 0.01, hints: ["left"], showme: { h: ${to} } }
  }`;

  it('flags a show me that does not meet its goal', () => {
    expect(codes(body(0.5))).toContain('V_SHOWME_MISSES');
    expect(codes(body(0.001))).not.toContain('V_SHOWME_MISSES');
  });

  it('refuses a show me on state that does not exist', () => {
    expect(() => lesson(body(0.5).replace('showme: { h:', 'showme: { hh:'))).toThrow(
      /showme: "hh" is not defined here/
    );
  });

  it('refuses hint and hints together', () => {
    expect(() => lesson(body(0.5).replace('hints: ["left"]', 'hint: "a", hints: ["b"]'))).toThrow(
      /not both/
    );
  });
});

describe('scene alt', () => {
  const body = (alt: string) => `  slide "s" {
    scene plane {
      x: [0, 1]
      y: [0, 1]
${alt}      param h = 1 { range: [0, 1], step: 0.1 }
      slider h
    }
    goal "Make h small" { when: h < 0.5 }
  }`;

  it('asks for alt text on a main-path scene', () => {
    expect(codes(body(''))).toContain('V_SCENE_NO_ALT');
    expect(codes(body('      alt: "A slider for h."\n'))).not.toContain('V_SCENE_NO_ALT');
  });

  it('puts the alt text on the rendered scene', () => {
    const l = lesson(body('      alt: "A slider for h."\n'));
    expect(l.slides[0].scene!.space.alt).toBe('A slider for h.');
  });
});
