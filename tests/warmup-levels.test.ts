import { describe, it, expect } from 'vitest';
import { LEVELS } from '@/lib/warmup/levels';
import { questionAt, levelById, isValidLevel, MAX_LEVEL } from '@/lib/warmup/questions';
import { shuffled, hashSeed } from '@/lib/warmup/rng';

const SEEDS = ['a1b2c3d4', 'deadbeef', '0000', 'ffffffff', 'warmup-seed-9', 'z'];
const PER_SEED = 120;

function arithmetic(expr: string): number {
  const tokens = expr.split(' ');
  const nums = [Number(tokens[0])];
  const ops: string[] = [];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const n = Number(tokens[i + 1]);
    if (op === '×') nums[nums.length - 1] *= n;
    else if (op === '÷') nums[nums.length - 1] /= n;
    else if (op === '+' || op === '-') {
      ops.push(op);
      nums.push(n);
    } else throw new Error(`unknown operator "${op}" in "${expr}"`);
  }
  return ops.reduce(
    (total, op, i) => (op === '+' ? total + nums[i + 1] : total - nums[i + 1]),
    nums[0]
  );
}

function solveForX(prompt: string): number {
  const [lhs, rhs] = prompt.split(' = ');
  const bothSides = /^(\d+)x \+ (\d+)$/.exec(lhs) && /^(\d+)x \+ (\d+)$/.exec(rhs);
  if (bothSides) {
    const [, a, b] = /^(\d+)x \+ (\d+)$/.exec(lhs)!;
    const [, c, d] = /^(\d+)x \+ (\d+)$/.exec(rhs)!;
    return (Number(d) - Number(b)) / (Number(a) - Number(c));
  }
  const target = Number(rhs);
  const shapes: [RegExp, (m: RegExpExecArray) => number][] = [
    [/^x \+ (\d+)$/, (m) => target - Number(m[1])],
    [/^x - (\d+)$/, (m) => target + Number(m[1])],
    [/^x ÷ (\d+)$/, (m) => target * Number(m[1])],
    [/^(\d+)x$/, (m) => target / Number(m[1])],
    [/^(\d+)x \+ (\d+)$/, (m) => (target - Number(m[2])) / Number(m[1])],
    [/^(\d+)x - (\d+)$/, (m) => (target + Number(m[2])) / Number(m[1])],
    [/^(\d+)\(x \+ (\d+)\)$/, (m) => target / Number(m[1]) - Number(m[2])],
    [/^(\d+)\(x - (\d+)\)$/, (m) => target / Number(m[1]) + Number(m[2])],
  ];
  for (const [re, solve] of shapes) {
    const m = re.exec(lhs);
    if (m) return solve(m);
  }
  throw new Error(`unrecognised equation "${prompt}"`);
}

function evaluateFromPromptTextAlone(prompt: string): number {
  if (prompt.includes('=')) return solveForX(prompt);
  const squared = /^(\d+)²$/.exec(prompt);
  if (squared) return Number(squared[1]) ** 2;
  const bracket = /^\((\d+) \+ (\d+)\) × (\d+) - (\d+)$/.exec(prompt);
  if (bracket) {
    const [, a, b, c, d] = bracket;
    return (Number(a) + Number(b)) * Number(c) - Number(d);
  }
  const of = /^(.+) of (-?\d+)$/.exec(prompt);
  if (of) {
    const whole = Number(of[2]);
    const pct = /^(\d+)%$/.exec(of[1]);
    if (pct) return (Number(pct[1]) / 100) * whole;
    const frac = /^(\d+)\/(\d+)$/.exec(of[1]);
    if (frac) return (Number(frac[1]) / Number(frac[2])) * whole;
    throw new Error(`unrecognised quantity "${of[1]}" in "${prompt}"`);
  }
  return arithmetic(prompt);
}

const everyQuestion = () =>
  SEEDS.flatMap((seed) =>
    LEVELS.flatMap((level) =>
      Array.from({ length: PER_SEED }, (_, i) => ({
        level: level.id,
        seed,
        index: i,
        question: questionAt(level.id, seed, i)!,
      }))
    )
  );

describe('warmup question generators', () => {
  const all = everyQuestion();

  it('generates a question for every level, seed and index', () => {
    expect(all).toHaveLength(SEEDS.length * LEVELS.length * PER_SEED);
    for (const { question } of all) {
      expect(question).toBeTruthy();
      expect(question.prompt.length).toBeGreaterThan(0);
      expect(question.factKey.length).toBeGreaterThan(0);
    }
  });

  it('every answer is an integer, so the keypad needs no decimal point', () => {
    for (const { question, level } of all) {
      const n = Number(question.answer);
      expect(Number.isInteger(n), `L${level} "${question.prompt}" = "${question.answer}"`).toBe(
        true
      );
      expect(question.answer).toBe(String(n));
    }
  });

  it('every answer actually solves its own prompt', () => {
    for (const { question, level } of all) {
      expect(evaluateFromPromptTextAlone(question.prompt), `L${level} "${question.prompt}"`).toBe(
        Number(question.answer)
      );
    }
  });

  it('keeps answers inside a range a student can hold in their head', () => {
    const ceiling: Record<number, number> = { 9: 1000, 10: 200 };
    for (const { question, level } of all) {
      const n = Math.abs(Number(question.answer));
      expect(n, `L${level} "${question.prompt}"`).toBeLessThanOrEqual(ceiling[level] ?? 200);
    }
  });
});

describe('warmup level ranges', () => {
  const byLevel = (id: number) =>
    SEEDS.flatMap((seed) => Array.from({ length: PER_SEED }, (_, i) => questionAt(id, seed, i)!));

  it('level 1 stays inside 20 and never goes negative', () => {
    for (const q of byLevel(1)) {
      const n = Number(q.answer);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(20);
      for (const operand of q.prompt.match(/\d+/g)!) {
        expect(Number(operand)).toBeLessThanOrEqual(20);
      }
    }
  });

  it('level 2 stays inside 100 and never goes negative', () => {
    for (const q of byLevel(2)) {
      const n = Number(q.answer);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(100);
    }
  });

  it('level 3 only uses tables 2 through 12', () => {
    for (const q of byLevel(3)) {
      const [a, b] = q.prompt.split(' × ').map(Number);
      for (const operand of [a, b]) {
        expect(operand).toBeGreaterThanOrEqual(2);
        expect(operand).toBeLessThanOrEqual(12);
      }
      expect(Number(q.answer)).toBe(a * b);
    }
  });

  it('level 4 always divides exactly', () => {
    for (const q of byLevel(4)) {
      const [dividend, divisor] = q.prompt.split(' ÷ ').map(Number);
      expect(dividend % divisor).toBe(0);
      expect(Number(q.answer)).toBe(dividend / divisor);
    }
  });

  it('level 5 never asks for a negative result', () => {
    for (const q of byLevel(5)) {
      expect(Number(q.answer)).toBeGreaterThanOrEqual(0);
    }
  });

  it('level 7 keeps the constant small enough to do in your head', () => {
    for (const q of byLevel(7)) {
      const b = Number(/[+-] (\d+) =/.exec(q.prompt)![1]);
      expect(b, q.prompt).toBeLessThanOrEqual(20);
      expect(Number(q.prompt.split(' = ')[1]), q.prompt).toBeGreaterThan(0);
    }
  });

  it('levels 6 and 7 always have a positive integer root', () => {
    for (const q of [...byLevel(6), ...byLevel(7)]) {
      const n = Number(q.answer);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThan(0);
      expect(q.prompt).toContain('x');
      expect(q.prompt).toContain('=');
    }
  });

  it('level 8 actually produces negative answers as well as positive ones', () => {
    const answers = byLevel(8).map((q) => Number(q.answer));
    expect(answers.some((n) => n < 0)).toBe(true);
    expect(answers.some((n) => n > 0)).toBe(true);
  });

  it('every question in the whole space of every level is valid', () => {
    for (const level of LEVELS) {
      for (let n = 0; n < level.size; n++) {
        const question = level.at(n);
        expect(Number.isInteger(Number(question.answer)), `L${level.id} #${n}`).toBe(true);
        expect(
          evaluateFromPromptTextAlone(question.prompt),
          `L${level.id} "${question.prompt}"`
        ).toBe(Number(question.answer));
      }
    }
  });

  it('deals every question in the space before repeating any of them', () => {
    for (const level of LEVELS) {
      const window = Math.min(level.size, 200);
      const prompts = Array.from(
        { length: window },
        (_, i) => questionAt(level.id, 'no-repeats', i)!.prompt
      );
      expect(new Set(prompts).size, `level ${level.id} repeats within ${window}`).toBe(window);
    }
  });

  it('reshuffles rather than stalling once the space runs out', () => {
    const small = LEVELS[2];
    const first = Array.from(
      { length: small.size },
      (_, i) => questionAt(small.id, 'wrap', i)!.prompt
    );
    const second = Array.from(
      { length: small.size },
      (_, i) => questionAt(small.id, 'wrap', small.size + i)!.prompt
    );
    expect(new Set(second).size).toBe(small.size);
    expect(second).not.toEqual(first);
    expect(new Set(second)).toEqual(new Set(first));
  });

  it('gives no shape of a level so little room that it barely shows up', () => {
    for (const level of LEVELS) {
      if (level.variants.length < 2) continue;
      for (const v of level.variants) {
        const share = v.size / level.size;
        expect(share, `level ${level.id} shape ${v.at(0).factKey}`).toBeGreaterThan(0.08);
        expect(share, `level ${level.id} shape ${v.at(0).factKey}`).toBeLessThan(0.6);
      }
    }
  });

  it('reaches every variant of every level', () => {
    for (const level of LEVELS) {
      const reached = new Set<string>();
      for (let n = 0; n < level.size; n++) reached.add(level.at(n).factKey.split(':')[0]);
      const expected = new Set(level.variants.map((v) => v.at(0).factKey.split(':')[0]));
      for (const key of expected) expect(reached, `level ${level.id}`).toContain(key);
    }
  });
});

describe('factKey', () => {
  it('collapses commutative pairs onto one fact', () => {
    const keys = new Set(
      SEEDS.flatMap((seed) =>
        Array.from({ length: 400 }, (_, i) => questionAt(3, seed, i)!).map((q) => q.factKey)
      )
    );
    for (const key of keys) {
      const [a, b] = key.replace('mul:', '').split('x').map(Number);
      expect(a).toBeLessThanOrEqual(b);
    }
  });

  it('is stable for the same underlying fact regardless of operand order', () => {
    const times = LEVELS[2].variants[0];
    const seen = new Map<string, number>();
    for (let n = 0; n < times.size; n++) {
      const q = times.at(n);
      const [a, b] = q.prompt.split(' × ').map(Number);
      seen.set(q.factKey, a * b);
    }
    for (const [key, product] of seen) {
      const [a, b] = key.replace('mul:', '').split('x').map(Number);
      expect(a * b).toBe(product);
    }
  });

  it('namespaces every level so weak spots never collide across kinds', () => {
    const prefixes = new Set(
      SEEDS.flatMap((seed) =>
        LEVELS.flatMap((l) =>
          Array.from({ length: 40 }, (_, i) => questionAt(l.id, seed, i)!.factKey.split(':')[0])
        )
      )
    );
    expect(prefixes.size).toBeGreaterThan(1);
    for (const p of prefixes) expect(p).toMatch(/^[a-z0-9]+$/);
  });
});

describe('questionAt addressing', () => {
  it('is deterministic for the same level, seed and index', () => {
    for (let i = 0; i < 50; i++) {
      const a = questionAt(5, 'repeatable', i);
      const b = questionAt(5, 'repeatable', i);
      expect(a).toEqual(b);
    }
  });

  it('does not need the earlier indexes to derive a later one', () => {
    const direct = questionAt(3, 'jump', 999);
    const walked = Array.from({ length: 1000 }, (_, i) => questionAt(3, 'jump', i)).at(-1);
    expect(direct).toEqual(walked);
  });

  it('gives each level its own stream, so two levels do not move in lockstep', () => {
    const variantOf = (level: number, i: number) =>
      questionAt(level, 'shared', i)!.factKey.split(':')[0];
    const agreements = Array.from({ length: 200 }, (_, i) => variantOf(1, i) === variantOf(2, i));
    const rate = agreements.filter(Boolean).length / agreements.length;
    expect(rate).toBeGreaterThan(0.3);
    expect(rate).toBeLessThan(0.7);
  });

  it('gives different seeds different sequences', () => {
    const one = Array.from({ length: 30 }, (_, i) => questionAt(3, 'seed-one', i)!.prompt);
    const two = Array.from({ length: 30 }, (_, i) => questionAt(3, 'seed-two', i)!.prompt);
    expect(one).not.toEqual(two);
  });

  it('does not repeat itself within a short run', () => {
    const prompts = Array.from({ length: 40 }, (_, i) => questionAt(2, 'variety', i)!.prompt);
    expect(new Set(prompts).size).toBeGreaterThan(30);
  });

  it('refuses an unknown level or a nonsense index', () => {
    expect(questionAt(0, 'x', 0)).toBeNull();
    expect(questionAt(MAX_LEVEL + 1, 'x', 0)).toBeNull();
    expect(questionAt(3, 'x', -1)).toBeNull();
    expect(questionAt(3, 'x', 1.5)).toBeNull();
  });

  it('accepts an empty seed rather than throwing', () => {
    expect(questionAt(1, '', 0)).toBeTruthy();
  });
});

describe('level metadata', () => {
  it('numbers the ladder 1..N with no gaps', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(Array.from({ length: LEVELS.length }, (_, i) => i + 1));
    expect(MAX_LEVEL).toBe(10);
  });

  it('gives every level a name, a blurb and a worked example', () => {
    for (const l of LEVELS) {
      expect(l.name.length).toBeGreaterThan(0);
      expect(l.blurb.length).toBeGreaterThan(0);
      expect(l.variants.length).toBeGreaterThan(0);
      expect(() => evaluateFromPromptTextAlone(l.example)).not.toThrow();
    }
  });

  it('looks a level up by id', () => {
    expect(levelById(4)?.name).toBe('Division facts');
    expect(levelById(99)).toBeNull();
  });

  it('validates levels the way a route param would arrive', () => {
    expect(isValidLevel(1)).toBe(true);
    expect(isValidLevel(10)).toBe(true);
    expect(isValidLevel(0)).toBe(false);
    expect(isValidLevel(11)).toBe(false);
    expect(isValidLevel(2.5)).toBe(false);
    expect(isValidLevel('3')).toBe(false);
    expect(isValidLevel(null)).toBe(false);
    expect(isValidLevel(NaN)).toBe(false);
  });
});

describe('shuffled', () => {
  it('is a true permutation, every index exactly once', () => {
    for (const size of [1, 2, 5, 66, 121, 1000]) {
      const deck = shuffled(size, `seed-${size}`);
      expect(deck).toHaveLength(size);
      expect([...deck].sort((a, b) => a - b)).toEqual(Array.from({ length: size }, (_, i) => i));
    }
  });

  it('is deterministic for the same seed', () => {
    expect(shuffled(121, 'same')).toEqual(shuffled(121, 'same'));
  });

  it('differs between seeds', () => {
    expect(shuffled(121, 'one')).not.toEqual(shuffled(121, 'two'));
  });

  it('actually mixes rather than nudging the identity order', () => {
    const deck = shuffled(200, 'mix');
    const fixed = deck.filter((value, i) => value === i).length;
    expect(fixed).toBeLessThan(10);
  });

  it('leaves no constant stride a student could learn', () => {
    const deck = shuffled(200, 'stride');
    const strides = new Set(deck.slice(1).map((value, i) => value - deck[i]));
    expect(strides.size).toBeGreaterThan(50);
  });

  it('handles a degenerate size without throwing', () => {
    expect(shuffled(0, 'x')).toEqual([]);
    expect(shuffled(-5, 'x')).toEqual([]);
    expect(shuffled(1, 'x')).toEqual([0]);
  });

  it('hashes adjacent seeds to unrelated orders', () => {
    const hashes = Array.from({ length: 500 }, (_, i) => hashSeed('adjacent', i));
    expect(new Set(hashes).size).toBe(500);
  });
});
