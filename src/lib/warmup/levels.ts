import { intBetween, pick } from './rng';

export interface Question {
  prompt: string;
  answer: string;
  factKey: string;
}

export type Generator = (rng: () => number) => Question;

export interface Level {
  id: number;
  name: string;
  blurb: string;
  example: string;
  variants: readonly Generator[];
  generate: Generator;
}

const q = (prompt: string, answer: number, factKey: string): Question => ({
  prompt,
  answer: String(answer),
  factKey,
});

const unordered = (a: number, b: number, glue: string): string =>
  a <= b ? `${a}${glue}${b}` : `${b}${glue}${a}`;

const addToTwenty: Generator = (rng) => {
  const a = intBetween(rng, 2, 17);
  const b = intBetween(rng, 2, 20 - a);
  return q(`${a} + ${b}`, a + b, `add:${unordered(a, b, '+')}`);
};

const subToTwenty: Generator = (rng) => {
  const a = intBetween(rng, 5, 20);
  const b = intBetween(rng, 2, a - 2);
  return q(`${a} - ${b}`, a - b, `sub:${a}-${b}`);
};

const addToHundred: Generator = (rng) => {
  const a = intBetween(rng, 11, 88);
  const b = intBetween(rng, 11, 99 - a);
  return q(`${a} + ${b}`, a + b, `add:${unordered(a, b, '+')}`);
};

const subToHundred: Generator = (rng) => {
  const a = intBetween(rng, 25, 99);
  const b = intBetween(rng, 11, a - 11);
  return q(`${a} - ${b}`, a - b, `sub:${a}-${b}`);
};

const timesTable: Generator = (rng) => {
  const a = intBetween(rng, 2, 12);
  const b = intBetween(rng, 2, 12);
  return q(`${a} × ${b}`, a * b, `mul:${unordered(a, b, 'x')}`);
};

const divisionFact: Generator = (rng) => {
  const divisor = intBetween(rng, 2, 12);
  const quotient = intBetween(rng, 2, 12);
  return q(`${divisor * quotient} ÷ ${divisor}`, quotient, `div:${divisor * quotient}/${divisor}`);
};

const mulThenAdd: Generator = (rng) => {
  const a = intBetween(rng, 2, 9);
  const b = intBetween(rng, 2, 9);
  const c = intBetween(rng, 2, 20);
  return q(`${a} × ${b} + ${c}`, a * b + c, 'mix:mul-add');
};

const mulThenSub: Generator = (rng) => {
  const a = intBetween(rng, 3, 9);
  const b = intBetween(rng, 3, 9);
  const c = intBetween(rng, 2, a * b - 1);
  return q(`${a} × ${b} - ${c}`, a * b - c, 'mix:mul-sub');
};

const addThenMul: Generator = (rng) => {
  const a = intBetween(rng, 2, 20);
  const b = intBetween(rng, 2, 9);
  const c = intBetween(rng, 2, 9);
  return q(`${a} + ${b} × ${c}`, a + b * c, 'mix:add-mul');
};

const divThenAdd: Generator = (rng) => {
  const divisor = intBetween(rng, 2, 9);
  const quotient = intBetween(rng, 2, 9);
  const c = intBetween(rng, 2, 20);
  return q(`${divisor * quotient} ÷ ${divisor} + ${c}`, quotient + c, 'mix:div-add');
};

const addEquation: Generator = (rng) => {
  const root = intBetween(rng, 1, 20);
  const a = intBetween(rng, 2, 20);
  return q(`x + ${a} = ${root + a}`, root, `eq1:x+${a}`);
};

const subEquation: Generator = (rng) => {
  const a = intBetween(rng, 2, 15);
  const root = intBetween(rng, a + 1, a + 20);
  return q(`x - ${a} = ${root - a}`, root, `eq1:x-${a}`);
};

const mulEquation: Generator = (rng) => {
  const a = intBetween(rng, 2, 12);
  const root = intBetween(rng, 2, 12);
  return q(`${a}x = ${a * root}`, root, `eq1:${a}x`);
};

const divEquation: Generator = (rng) => {
  const a = intBetween(rng, 2, 9);
  const rhs = intBetween(rng, 2, 12);
  return q(`x ÷ ${a} = ${rhs}`, a * rhs, `eq1:x÷${a}`);
};

const twoStepAdd: Generator = (rng) => {
  const a = intBetween(rng, 2, 9);
  const root = intBetween(rng, 1, 12);
  const b = intBetween(rng, 1, 20);
  return q(`${a}x + ${b} = ${a * root + b}`, root, `eq2:${a}x+${b}`);
};

const twoStepSub: Generator = (rng) => {
  const a = intBetween(rng, 2, 9);
  const root = intBetween(rng, 2, 12);
  const b = intBetween(rng, 1, Math.min(20, a * root - 1));
  return q(`${a}x - ${b} = ${a * root - b}`, root, `eq2:${a}x-${b}`);
};

const negativeAdd: Generator = (rng) => {
  const a = intBetween(rng, 2, 20);
  const b = intBetween(rng, 2, 30);
  return q(`-${a} + ${b}`, b - a, `neg:-${a}+${b}`);
};

const negativeSub: Generator = (rng) => {
  const a = intBetween(rng, 2, 20);
  const b = intBetween(rng, 2, 20);
  return q(`-${a} - ${b}`, -a - b, `neg:-${a}-${b}`);
};

const negativeMul: Generator = (rng) => {
  const a = intBetween(rng, 2, 12);
  const b = intBetween(rng, 2, 9);
  return q(`-${a} × ${b}`, -a * b, `neg:-${a}×${b}`);
};

const unitFraction: Generator = (rng) => {
  const n = intBetween(rng, 2, 10);
  const k = intBetween(rng, 2, 12);
  return q(`1/${n} of ${n * k}`, k, `frac:1/${n}`);
};

const PERCENTS = [
  { pct: 10, step: 10 },
  { pct: 20, step: 5 },
  { pct: 25, step: 4 },
  { pct: 50, step: 2 },
  { pct: 75, step: 4 },
] as const;

const percentOf: Generator = (rng) => {
  const { pct, step } = pick(rng, PERCENTS);
  const whole = step * intBetween(rng, 2, 12);
  return q(`${pct}% of ${whole}`, (pct * whole) / 100, `pct:${pct}%`);
};

const level = (
  id: number,
  name: string,
  blurb: string,
  example: string,
  variants: readonly Generator[]
): Level => ({
  id,
  name,
  blurb,
  example,
  variants,
  generate: (rng) => pick(rng, variants)(rng),
});

export const LEVELS: readonly Level[] = [
  level(1, 'Add and subtract to 20', 'The stuff that should be reflex.', '8 + 5', [
    addToTwenty,
    subToTwenty,
  ]),
  level(2, 'Add and subtract to 100', 'Two digits, carrying and borrowing.', '47 + 38', [
    addToHundred,
    subToHundred,
  ]),
  level(3, 'Times tables', 'Everything from 2 to 12.', '7 × 8', [timesTable]),
  level(4, 'Division facts', 'Times tables, backwards.', '56 ÷ 7', [divisionFact]),
  level(5, 'Mixed four-op', 'Two operations, so order matters.', '9 × 6 - 14', [
    mulThenAdd,
    mulThenSub,
    addThenMul,
    divThenAdd,
  ]),
  level(6, 'One-step equations', 'One move to get x alone.', 'x + 7 = 12', [
    addEquation,
    subEquation,
    mulEquation,
    divEquation,
  ]),
  level(7, 'Two-step equations', 'Undo the add, then undo the multiply.', '3x - 4 = 11', [
    twoStepAdd,
    twoStepSub,
  ]),
  level(8, 'Negatives and fractions', 'Signs, halves, quarters, percents.', '-7 × 3', [
    negativeAdd,
    negativeSub,
    negativeMul,
    unitFraction,
    percentOf,
  ]),
];
