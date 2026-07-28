import { describe, it, expect } from 'vitest';
import { splitTemplate, countSlots } from '@/engine/lang/template';
import { compileLesson, CompileError } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';

function segs(src: string) {
  return splitTemplate(src, 1);
}

function firstExercise(src: string) {
  return lessonSchema.parse(compileLesson(src)).slides[0].exercise!;
}

const wrap = (body: string) => `lesson "L" {\n  slide "s" {\n${body}\n  }\n}`;

describe('splitTemplate', () => {
  it('splits prose around a blank', () => {
    expect(segs('A function is ___ at a.')).toEqual([
      { text: 'A function is ' },
      { slot: true },
      { text: ' at a.' },
    ]);
  });

  it('keeps a math span verbatim in a text segment', () => {
    expect(segs('$\\frac{d}{dx}[x^3] =$ ___')).toEqual([
      { text: '$\\frac{d}{dx}[x^3] =$ ' },
      { slot: true },
    ]);
  });

  it('does not treat underscores inside math as slots', () => {
    expect(segs('$x_1$ and $a_{n}$ then ___')).toEqual([
      { text: '$x_1$ and $a_{n}$ then ' },
      { slot: true },
    ]);
  });

  it('ignores runs shorter than three underscores', () => {
    expect(segs('a_b __c ___')).toEqual([{ text: 'a_b __c ' }, { slot: true }]);
  });

  it('treats a longer run as a single slot', () => {
    expect(segs('______')).toEqual([{ slot: true }]);
  });

  it('handles adjacent slots with no text between them', () => {
    expect(segs('___ ___')).toEqual([{ slot: true }, { text: ' ' }, { slot: true }]);
  });

  it('drops empty leading and trailing text', () => {
    expect(segs('___')).toEqual([{ slot: true }]);
  });

  it('handles display math', () => {
    expect(segs('$$x^2$$ ___')).toEqual([{ text: '$$x^2$$ ' }, { slot: true }]);
  });

  it('throws on an unclosed math span', () => {
    expect(() => segs('$x^2 ___')).toThrow(CompileError);
    expect(() => segs('$x^2 ___')).toThrow(/unbalanced \$/);
  });

  it('counts slots', () => {
    expect(countSlots(segs('___ a ___ b ___'))).toBe(3);
    expect(countSlots(segs('no slots here'))).toBe(0);
  });
});

describe('build with a template', () => {
  it('emits the segments and derives slots from them', () => {
    const ex = firstExercise(
      wrap(
        '    build {\n      ask "power rule"\n      template: "$\\frac{d}{dx}[x^3] =$ ___ $\\cdot$ ___"\n      bank: ["3", "2", "$x^2$"]\n      answer: ["3", "$x^2$"]\n    }'
      )
    );
    expect(ex.kind).toBe('build');
    if (ex.kind === 'build') {
      expect(ex.slots).toBe(2);
      expect(ex.template).toEqual([
        { text: '$\\frac{d}{dx}[x^3] =$ ' },
        { slot: true },
        { text: ' $\\cdot$ ' },
        { slot: true },
      ]);
    }
  });

  it('leaves template off when the author does not use one', () => {
    const ex = firstExercise(
      wrap(
        '    build {\n      ask "factor"\n      bank: ["x", "+", "2"]\n      answer: ["x", "+", "2"]\n    }'
      )
    );
    if (ex.kind === 'build') {
      expect(ex.template).toBeUndefined();
      expect(ex.slots).toBe(3);
    }
  });

  it('rejects a template with no slots', () => {
    expect(() =>
      compileLesson(
        wrap(
          '    build {\n      ask "a"\n      template: "no blanks here"\n      bank: ["x"]\n      answer: ["x"]\n    }'
        )
      )
    ).toThrow(/template has no slots/);
  });

  it('rejects slots: disagreeing with the template', () => {
    expect(() =>
      compileLesson(
        wrap(
          '    build {\n      ask "a"\n      template: "___ and ___"\n      slots: 3\n      bank: ["x"]\n      answer: ["x"]\n    }'
        )
      )
    ).toThrow(/disagrees with the template/);
  });

  it('rejects an unbalanced $ in the template', () => {
    expect(() =>
      compileLesson(
        wrap(
          '    build {\n      ask "a"\n      template: "$x^2 ___"\n      bank: ["x"]\n      answer: ["x"]\n    }'
        )
      )
    ).toThrow(/unbalanced \$/);
  });

  it('classifies a math token by what it says, not by its $ delimiter', () => {
    const ex = firstExercise(
      wrap(
        '    build {\n      ask "a"\n      template: "___ ___ ___"\n      bank: ["$x^{2}$", "$\\cdot$", "+", "^2", "sin x"]\n      answer: ["$x^{2}$", "+", "sin x"]\n    }'
      )
    );
    if (ex.kind === 'build') {
      expect(ex.bank.map((t) => t.kind)).toEqual([
        'operand',
        'operator',
        'operator',
        'operator',
        'operand',
      ]);
    }
  });

  it('reports an unknown prop with the template keyword listed', () => {
    expect(() => compileLesson(wrap('    build {\n      ask "a"\n      nope: "x"\n    }'))).toThrow(
      /ask\/bank\/answer\/slots\/template\/reusable/
    );
  });
});
