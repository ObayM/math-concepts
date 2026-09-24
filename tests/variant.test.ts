import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import { instantiate, variantCount } from '@/engine/runtime/variant';
import { exercises } from '@/components/lesson/exercises';
import { wrongBranch } from '@/engine/runtime/flow';

const lesson = (numeric: string) =>
  lessonSchema.parse(
    compileLesson(`lesson "L" {
  slide "s" {
    id: "s"
    > Differentiate $x^2$ at a point.
${numeric}
  }
  slide "d" {
    id: "d"
    hidden: true
    > value, not slope
  }
}`)
  );

const SRC = `    numeric {
      vary a in range(2, 10)
      vary b in [1, 3]
      ask "$f(x) = x^2 + \${b}x$. What's $f'(\${a})$?"
      answer: 2*a + b
      expect: 2*a + b
      wrong a^2 + b*a "That's the height at \${a}." -> "d" retry
    }`;

describe('fresh numbers each attempt', () => {
  const slide = lesson(SRC).slides[0];

  it('enumerates every combination', () => {
    const ex = slide.exercise!;
    expect(ex.kind === 'numeric' && variantCount(ex.vary)).toBe(16);
  });

  it('fills the numbers in and grades against that variant', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 16; seed++) {
      const v = instantiate(slide, seed);
      const ex = v.exercise!;
      if (ex.kind !== 'numeric') throw new Error('kind');
      expect(ex.prompt).not.toContain('${');
      const [, b, a] = ex.prompt.match(/x\^2 \+ (\d)x\$\. What's \$f'\((\d)\)\$/)!.map(Number);
      expect(ex.answers).toEqual([2 * a + b]);
      expect(exercises.numeric.check(v, String(2 * a + b))).toBe(true);
      expect(exercises.numeric.check(v, String(a * a + b * a))).toBe(false);
      expect(wrongBranch(v, String(a * a + b * a))?.slideId).toBe('d');
      expect(ex.wrong![0].why).toBe(`That's the height at ${a}.`);
      seen.add(ex.prompt);
    }
    expect(seen.size).toBe(16);
  });

  it('checks expect: across every variant at compile time', () => {
    expect(() => lesson(SRC.replace('expect: 2*a + b', 'expect: 2*a + 1'))).toThrow(
      /expect: works out to .* when a = \d, b = 3/
    );
  });

  it('refuses a wrong answer that is right for some variant', () => {
    expect(() => lesson(SRC.replace('wrong a^2 + b*a', 'wrong a*b + 2*a + b - a*b'))).toThrow(
      /is also a right answer when a = 2, b = 1/
    );
  });

  it('refuses a vary that explodes', () => {
    expect(() => lesson(SRC.replace('vary b in [1, 3]', 'vary b in range(0, 1000)'))).toThrow(
      /too many/
    );
  });

  it('leaves a plain numeric alone', () => {
    const plain = lesson(`    numeric {\n      ask "q"\n      answer: 2\n    }`).slides[0];
    expect(instantiate(plain, 7)).toBe(plain);
  });
});

describe('wrong lines that collide', () => {
  it('refuses two mistakes that mean the same number for some variant', () => {
    expect(() =>
      lesson(`    numeric {
      vary a in [1, 2, 3]
      ask "f'(-\${a})?"
      answer: 0 - 2*a
      wrong 2*a "sign" -> "d" retry
      wrong a^2 "value" -> "d" retry
    }`)
    ).toThrow(/two wrong lines both mean 4 when a = 2/);
  });
});
