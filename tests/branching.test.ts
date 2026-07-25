import { describe, it, expect } from 'vitest';
import { compileLesson, CompileError } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';

function lesson(src: string) {
  return lessonSchema.parse(compileLesson(src));
}

function withBranch(branch: string, scaffold = 'hidden: true') {
  return `lesson "L" {
  slide "main" {
    id: "m1"
    quiz {
      ask "pick"
      * "right"
      - "wrong"
      ${branch}
    }
  }
  slide "scaffold" {
    id: "s1"
    ${scaffold}
    > let's back up
  }
}`;
}

describe('onwrong detours', () => {
  it('carries the branch target onto the exercise', () => {
    const l = lesson(withBranch('onwrong: "s1"'));
    expect(l.slides[0].exercise?.onwrong).toEqual({ slide: 's1' });
  });

  it('records the retry flag when present', () => {
    const l = lesson(withBranch('onwrong: "s1" retry'));
    expect(l.slides[0].exercise?.onwrong).toEqual({ slide: 's1', retry: true });
  });

  it('marks the scaffold slide hidden and leaves the main path alone', () => {
    const l = lesson(withBranch('onwrong: "s1"'));
    expect(l.slides[0].hidden).toBeUndefined();
    expect(l.slides[1].hidden).toBe(true);
  });

  it('works on every exercise kind, not just quiz', () => {
    const l = lesson(`lesson "L" {
  slide "main" {
    numeric {
      ask "2 + 2?"
      answer: 4
      onwrong: "s1" retry
    }
  }
  slide "scaffold" {
    id: "s1"
    hidden: true
    > counting up
  }
}`);
    expect(l.slides[0].exercise?.onwrong).toEqual({ slide: 's1', retry: true });
  });

  it('rejects a target that does not exist, with a suggestion', () => {
    expect(() => compileLesson(withBranch('onwrong: "s2"'))).toThrow(/did you mean "s1"/);
  });

  it('rejects a target that is not hidden', () => {
    expect(() => compileLesson(withBranch('onwrong: "s1"', 'cat: "extra"'))).toThrow(
      /needs hidden: true/
    );
  });

  it('rejects a slide branching to itself', () => {
    expect(() => compileLesson(withBranch('onwrong: "m1"'))).toThrow(/points at its own slide/);
  });

  it('rejects chained detours', () => {
    expect(() =>
      compileLesson(`lesson "L" {
  slide "main" {
    quiz {
      ask "pick"
      * "right"
      - "wrong"
      onwrong: "s1"
    }
  }
  slide "first" {
    id: "s1"
    hidden: true
    quiz {
      ask "again"
      * "right"
      - "wrong"
      onwrong: "s2"
    }
  }
  slide "second" {
    id: "s2"
    hidden: true
    > deeper
  }
}`)
    ).toThrow(/detours can't chain/);
  });

  it('rejects a lesson where every slide is hidden', () => {
    expect(() =>
      compileLesson('lesson "L" {\n  slide "only" {\n    hidden: true\n    > nothing\n  }\n}')
    ).toThrow(/at least one slide that is not hidden/);
  });

  it('rejects duplicate slide ids', () => {
    expect(() =>
      compileLesson(
        'lesson "L" {\n  slide "a" {\n    id: "x"\n    > one\n  }\n  slide "b" {\n    id: "x"\n    > two\n  }\n}'
      )
    ).toThrow(/share the id "x"/);
  });

  it('raises a CompileError with the offending line', () => {
    try {
      compileLesson(withBranch('onwrong: "nope"'));
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(CompileError);
      expect((e as CompileError).line).toBe(2);
    }
  });
});
