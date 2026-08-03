import { describe, it, expect } from 'vitest';
import { LEVELS } from '@/lib/warmup/levels';
import { questionAt, levelById, isValidLevel, MAX_LEVEL } from '@/lib/warmup/questions';
import { rngFor, intBetween, pick, hashSeed } from '@/lib/warmup/rng';

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
  const target = Number(rhs);
  const shapes: [RegExp, (m: RegExpExecArray) => number][] = [
    [/^x \+ (\d+)$/, (m) => target - Number(m[1])],
    [/^x - (\d+)$/, (m) => target + Number(m[1])],
    [/^x ÷ (\d+)$/, (m) => target * Number(m[1])],
    [/^(\d+)x$/, (m) => target / Number(m[1])],
    [/^(\d+)x \+ (\d+)$/, (m) => (target - Number(m[2])) / Number(m[1])],
    [/^(\d+)x - (\d+)$/, (m) => (target + Number(m[2])) / Number(m[1])],
  ];
  for (const [re, solve] of shapes) {
    const m = re.exec(lhs);
    if (m) return solve(m);
  }
  throw new Error(`unrecognised equation "${prompt}"`);
}

function evaluateFromPromptTextAlone(prompt: string): number {
  if (prompt.includes('=')) return solveForX(prompt);
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
    for (const { question, level } of all) {
      const n = Math.abs(Number(question.answer));
      expect(n, `L${level} "${question.prompt}"`).toBeLessThanOrEqual(200);
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

  it('exercises every variant of every level', () => {
    for (const level of LEVELS) {
      const keys = new Set(byLevel(level.id).map((q) => q.factKey.split(':')[0]));
      const expected = new Set(
        level.variants.map((v) => v(rngFor('probe', 0)).factKey.split(':')[0])
      );
      for (const key of expected) expect(keys, `level ${level.id}`).toContain(key);
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
    for (let i = 0; i < 2000; i++) {
      const q = times(rngFor('order', i));
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
    expect(MAX_LEVEL).toBe(8);
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
    expect(isValidLevel(8)).toBe(true);
    expect(isValidLevel(0)).toBe(false);
    expect(isValidLevel(9)).toBe(false);
    expect(isValidLevel(2.5)).toBe(false);
    expect(isValidLevel('3')).toBe(false);
    expect(isValidLevel(null)).toBe(false);
    expect(isValidLevel(NaN)).toBe(false);
  });
});

describe('rng', () => {
  it('stays inside the unit interval', () => {
    const rng = rngFor('bounds', 0);
    for (let i = 0; i < 5000; i++) {
      const n = rng();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it('spreads intBetween across the whole inclusive range', () => {
    const rng = rngFor('spread', 1);
    const seen = new Set<number>();
    for (let i = 0; i < 4000; i++) seen.add(intBetween(rng, 2, 12));
    expect(seen.size).toBe(11);
    expect(Math.min(...seen)).toBe(2);
    expect(Math.max(...seen)).toBe(12);
  });

  it('collapses a degenerate range instead of returning NaN', () => {
    const rng = rngFor('degenerate', 0);
    expect(intBetween(rng, 7, 7)).toBe(7);
    expect(intBetween(rng, 7, 3)).toBe(7);
  });

  it('never picks past the end of the list', () => {
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 2000; i++) {
      expect(items).toContain(pick(rngFor('picks', i), items));
    }
  });

  it('hashes adjacent indexes to unrelated seeds', () => {
    const hashes = Array.from({ length: 500 }, (_, i) => hashSeed('adjacent', i));
    expect(new Set(hashes).size).toBe(500);
  });
});
