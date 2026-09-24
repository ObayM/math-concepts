import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import { initialFlow, next, stageBranch, wrongBranch } from '@/engine/runtime/flow';

const SRC = `lesson "L" {
  slide "Slope" {
    id: "check"
    numeric {
      ask "Slope of the line through (1, 1) and (3, 5)?"
      answer: 2
      wrong 4 "That's the rise on its own." -> "d-rise" retry
      wrong 0.5 -> "d-flip" retry
      wrong 3 "Count the run again."
      onwrong: "d-general" retry
    }
  }
  slide "Pick" {
    id: "pick"
    quiz {
      ask "What does a speedometer show?"
      * "something real, but we need a new idea"
      - "nothing real, it's rounding" { why: "It isn't rounding.", onwrong: "d-rounding", retry }
      - "60 divided by 0" { onwrong: "d-zero" }
      - "the average over the last minute"
    }
  }
  slide "Rise" {
    id: "d-rise"
    hidden: true
    > Slope is rise over run.
  }
  slide "Flip" {
    id: "d-flip"
    hidden: true
    > Up goes on top.
  }
  slide "General" {
    id: "d-general"
    hidden: true
    > Up divided by across.
  }
  slide "Rounding" {
    id: "d-rounding"
    hidden: true
    > Not rounding.
  }
  slide "Zero" {
    id: "d-zero"
    hidden: true
    > Nothing over nothing.
  }
}`;

const lesson = lessonSchema.parse(compileLesson(SRC));
const [check, pick] = lesson.slides;

describe('a detour per wrong answer', () => {
  it('compiles numeric wrong lines with their why and detour', () => {
    const ex = check.exercise!;
    expect(ex.kind === 'numeric' && ex.wrong).toEqual([
      { value: 4, why: "That's the rise on its own.", onwrong: { slide: 'd-rise', retry: true } },
      { value: 0.5, onwrong: { slide: 'd-flip', retry: true } },
      { value: 3, why: 'Count the run again.' },
    ]);
  });

  it('routes each numeric mistake to its own detour, falling back to onwrong:', () => {
    expect(wrongBranch(check, '4')?.slideId).toBe('d-rise');
    expect(wrongBranch(check, '0.5')?.slideId).toBe('d-flip');
    expect(wrongBranch(check, '3')?.slideId).toBe('d-general');
    expect(wrongBranch(check, '7')?.slideId).toBe('d-general');
  });

  it('routes each quiz option to its own detour', () => {
    expect(wrongBranch(pick, 1)).toEqual({ slideId: 'd-rounding', retry: true });
    expect(wrongBranch(pick, 2)).toEqual({ slideId: 'd-zero', retry: false });
    expect(wrongBranch(pick, 3)).toBeNull();
  });

  it('fires each misconception once, but a different one can still fire', () => {
    const slides = lesson.slides;
    let f = stageBranch(slides, initialFlow(0), false, '4');
    expect(f.pending?.slideId).toBe('d-rise');
    f = next(slides, f).state;
    f = next(slides, f).state;
    expect(f.detour).toBeNull();
    expect(stageBranch(slides, f, false, '4').pending).toBeNull();
    expect(stageBranch(slides, f, false, '0.5').pending?.slideId).toBe('d-flip');
  });
});

describe('validation', () => {
  const bad = (body: string) => () =>
    compileLesson(`lesson "L" {
  slide "s" {
${body}
  }
  slide "h" {
    id: "h"
    hidden: true
    > help
  }
}`);

  it('refuses a wrong value that is also right', () => {
    expect(bad(`    numeric {\n      ask "q"\n      answer: 2\n      wrong 2 "no"\n    }`)).toThrow(
      /wrong 2 is also a right answer/
    );
  });

  it('refuses a wrong line with nothing to say', () => {
    expect(bad(`    numeric {\n      ask "q"\n      answer: 2\n      wrong 3\n    }`)).toThrow(
      /needs a "why" or a -> "detour-id"/
    );
  });

  it('refuses an onwrong on the correct option', () => {
    expect(
      bad(`    quiz {\n      ask "q"\n      * "a" { onwrong: "h" }\n      - "b"\n    }`)
    ).toThrow(/correct option "a" can't have an onwrong/);
  });

  it('checks per-answer detours point at hidden slides', () => {
    expect(
      bad(`    numeric {\n      ask "q"\n      answer: 2\n      wrong 3 -> "nope"\n    }`)
    ).toThrow(/"nope" is not a slide/);
  });
});
