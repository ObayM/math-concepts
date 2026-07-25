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

describe('expect: as a compile-time answer check', () => {
  const numeric = (body: string) =>
    `lesson "L" {\n  slide "s" {\n    numeric {\n      ask "q"\n${body}\n    }\n  }\n}`;

  it('compiles when the derivation agrees with the answer', () => {
    const l = lesson(
      numeric('      answer: 0.8\n      tolerance: 0.001\n      expect: 4/sqrt(4^2+9)')
    );
    const ex = l.slides[0].exercise!;
    expect(ex.kind).toBe('numeric');
    if (ex.kind === 'numeric') expect(ex.answers).toEqual([0.8]);
  });

  it('never reaches the IR, since it is only an author-time assertion', () => {
    const l = lesson(numeric('      answer: 4\n      expect: 2+2'));
    expect(JSON.stringify(l)).not.toContain('expect');
  });

  it('fails when the derivation disagrees, naming both values', () => {
    expect(() =>
      compileLesson(numeric('      answer: 0.75\n      tolerance: 0.001\n      expect: 4/5'))
    ).toThrow(/works out to 0.8, but the answer is 0.75/);
  });

  it('accepts any of several answers', () => {
    expect(() =>
      compileLesson(numeric('      answer: 2\n      answer: 3\n      expect: 3'))
    ).not.toThrow();
  });

  it('respects the declared tolerance', () => {
    expect(() =>
      compileLesson(numeric('      answer: 0.33\n      tolerance: 0.01\n      expect: 1/3'))
    ).not.toThrow();
    expect(() =>
      compileLesson(numeric('      answer: 0.33\n      tolerance: 0.0001\n      expect: 1/3'))
    ).toThrow(/one of them is wrong/);
  });

  it('rejects a derivation that is not finite', () => {
    expect(() => compileLesson(numeric('      answer: 1\n      expect: 1/0'))).toThrow(
      /can't be an answer/
    );
  });

  it('rejects expect: on exercise kinds with no single answer to check', () => {
    expect(() =>
      compileLesson(
        'lesson "L" {\n  slide "s" {\n    quiz {\n      ask "q"\n      * "a"\n      - "b"\n      expect: 2\n    }\n  }\n}'
      )
    ).toThrow(/only works on a numeric exercise, not quiz/);
  });

  it('points the error at the expect: line', () => {
    try {
      compileLesson(numeric('      answer: 9\n      expect: 1+1'));
      expect.unreachable();
    } catch (e) {
      expect((e as CompileError).line).toBe(6);
    }
  });
});
