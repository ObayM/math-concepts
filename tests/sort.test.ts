import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import { verifyLesson } from '@/engine/verify';
import { exercises } from '../src/components/lesson/exercises';

const wrap = (body: string) => `lesson "L" {\n  slide "s" {\n${body}\n  }\n}`;

const THREE_BINS = wrap(
  '    sort {\n' +
    '      ask "Which rule?"\n' +
    '      skill: "deriv-strategy"\n' +
    '      bin "Product": ["$x^{2}\\sin x$", "$e^{x}\\ln x$"]\n' +
    '      bin "Chain": ["$(x^{2}+1)^{3}$"]\n' +
    '      bin "Quotient": ["$\\frac{\\sin x}{x}$"]\n' +
    '      ! "Read the outermost operation."\n' +
    '    }'
);

function lessonOf(src: string) {
  return lessonSchema.parse(compileLesson(src));
}

function slideOf(src: string) {
  return lessonOf(src).slides[0];
}

describe('sort exercise compile', () => {
  it('keeps bins in declared order with their items', () => {
    const ex = slideOf(THREE_BINS).exercise!;
    expect(ex.kind).toBe('sort');
    if (ex.kind === 'sort') {
      expect(ex.bins.map((b) => b.label)).toEqual(['Product', 'Chain', 'Quotient']);
      expect(ex.bins[0].items).toEqual(['$x^{2}\\sin x$', '$e^{x}\\ln x$']);
      expect(ex.skill).toBe('deriv-strategy');
      expect(ex.explanation).toBe('Read the outermost operation.');
    }
  });

  it('needs an ask', () => {
    expect(() =>
      compileLesson(wrap('    sort {\n      bin "A": ["x"]\n      bin "B": ["y"]\n    }'))
    ).toThrow(/sort needs an ask/);
  });

  it('needs at least two bins', () => {
    expect(() =>
      compileLesson(wrap('    sort {\n      ask "a"\n      bin "A": ["x", "y"]\n    }'))
    ).toThrow(/at least 2 bin/);
  });

  it('rejects an empty bin', () => {
    expect(() =>
      compileLesson(
        wrap('    sort {\n      ask "a"\n      bin "A": ["x"]\n      bin "B": []\n    }')
      )
    ).toThrow(/bin "B" has no items/);
  });

  it('rejects an item that sits in two bins', () => {
    expect(() =>
      compileLesson(
        wrap('    sort {\n      ask "a"\n      bin "A": ["x", "y"]\n      bin "B": ["y"]\n    }')
      )
    ).toThrow(/"y" is in both "A" and "B"/);
  });

  it('rejects an unknown prop', () => {
    expect(() =>
      compileLesson(wrap('    sort {\n      ask "a"\n      nope: ["x"]\n    }'))
    ).toThrow(/unexpected "nope" in sort/);
  });

  it('refuses a second exercise on the same slide', () => {
    expect(() =>
      compileLesson(
        wrap(
          '    sort {\n      ask "a"\n      bin "A": ["x"]\n      bin "B": ["y"]\n    }\n' +
            '    quiz {\n      ask "b"\n      * "yes"\n      - "no"\n    }'
        )
      )
    ).toThrow(/at most one exercise/);
  });
});

describe('sort registry', () => {
  const slide = slideOf(THREE_BINS);
  const reg = exercises.sort;

  it('starts with one empty answer per item, in declared order', () => {
    expect(reg.initial(slide)).toEqual([null, null, null, null]);
  });

  it('is only complete once every item has a bin', () => {
    expect(reg.isComplete(slide, [0, 0, 1, null])).toBe(false);
    expect(reg.isComplete(slide, [0, 0, 1, 2])).toBe(true);
    expect(reg.isComplete(slide, null)).toBe(false);
    expect(reg.isComplete(slide, [0, 0, 1])).toBe(false);
  });

  it('checks against the declared bin of each item', () => {
    expect(reg.check(slide, [0, 0, 1, 2])).toBe(true);
    expect(reg.check(slide, [0, 1, 1, 2])).toBe(false);
    expect(reg.check(slide, [])).toBe(false);
  });

  it('treats bin 0 as a real answer, not as empty', () => {
    expect(reg.isComplete(slide, [0, 0, 0, 0])).toBe(true);
    expect(reg.check(slide, [0, 0, 0, 0])).toBe(false);
  });
});

describe('sort verify', () => {
  it('flags two bins sharing a label', () => {
    const lesson = lessonOf(
      wrap('    sort {\n      ask "a"\n      bin "A": ["x", "z"]\n      bin "A": ["y", "w"]\n    }')
    );
    expect(verifyLesson(lesson).map((f) => f.code)).toContain('V_SORT_DUP_BIN');
  });

  it('flags a sort where every bin holds one item', () => {
    const lesson = lessonOf(
      wrap('    sort {\n      ask "a"\n      bin "A": ["x"]\n      bin "B": ["y"]\n    }')
    );
    expect(verifyLesson(lesson).map((f) => f.code)).toContain('V_SORT_THIN');
  });

  it('says nothing about a healthy sort', () => {
    expect(verifyLesson(lessonOf(THREE_BINS))).toEqual([]);
  });
});
