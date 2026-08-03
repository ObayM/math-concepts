export interface Question {
  prompt: string;
  answer: string;
  factKey: string;
}

export interface Variant {
  size: number;
  at(n: number): Question;
}

export interface Level {
  id: number;
  name: string;
  blurb: string;
  example: string;
  size: number;
  variants: readonly Variant[];
  at(n: number): Question;
}

const q = (prompt: string, answer: number, factKey: string): Question => ({
  prompt,
  answer: String(answer),
  factKey,
});

const unordered = (a: number, b: number, glue: string): string =>
  a <= b ? `${a}${glue}${b}` : `${b}${glue}${a}`;

function space(build: (emit: (...values: number[]) => void) => void): number[][] {
  const rows: number[][] = [];
  build((...values) => rows.push(values));
  return rows;
}

const variant = (rows: number[][], make: (row: number[]) => Question): Variant => ({
  size: rows.length,
  at: (n) => make(rows[n]),
});

function ladder(variants: readonly Variant[]): { size: number; at(n: number): Question } {
  const size = variants.reduce((total, v) => total + v.size, 0);
  return {
    size,
    at(n) {
      let offset = ((n % size) + size) % size;
      for (const v of variants) {
        if (offset < v.size) return v.at(offset);
        offset -= v.size;
      }
      return variants[0].at(0);
    },
  };
}

const addToTwenty = variant(
  space((emit) => {
    for (let a = 2; a <= 17; a++) for (let b = 2; b <= 20 - a; b++) emit(a, b);
  }),
  ([a, b]) => q(`${a} + ${b}`, a + b, `add:${unordered(a, b, '+')}`)
);

const subToTwenty = variant(
  space((emit) => {
    for (let a = 5; a <= 20; a++) for (let b = 2; b <= a - 2; b++) emit(a, b);
  }),
  ([a, b]) => q(`${a} - ${b}`, a - b, `sub:${a}-${b}`)
);

const addToHundred = variant(
  space((emit) => {
    for (let a = 11; a <= 88; a++) for (let b = 11; b <= 99 - a; b++) emit(a, b);
  }),
  ([a, b]) => q(`${a} + ${b}`, a + b, `add:${unordered(a, b, '+')}`)
);

const subToHundred = variant(
  space((emit) => {
    for (let a = 25; a <= 99; a++) for (let b = 11; b <= a - 11; b++) emit(a, b);
  }),
  ([a, b]) => q(`${a} - ${b}`, a - b, `sub:${a}-${b}`)
);

const timesTable = variant(
  space((emit) => {
    for (let a = 2; a <= 12; a++) for (let b = 2; b <= 12; b++) emit(a, b);
  }),
  ([a, b]) => q(`${a} × ${b}`, a * b, `mul:${unordered(a, b, 'x')}`)
);

const divisionFact = variant(
  space((emit) => {
    for (let d = 2; d <= 12; d++)
      for (let quotient = 2; quotient <= 12; quotient++) emit(d, quotient);
  }),
  ([d, quotient]) => q(`${d * quotient} ÷ ${d}`, quotient, `div:${d * quotient}/${d}`)
);

const mulThenAdd = variant(
  space((emit) => {
    for (let a = 2; a <= 9; a++)
      for (let b = 2; b <= 9; b++) for (let c = 2; c <= 20; c++) emit(a, b, c);
  }),
  ([a, b, c]) => q(`${a} × ${b} + ${c}`, a * b + c, 'mix:mul-add')
);

const mulThenSub = variant(
  space((emit) => {
    for (let a = 3; a <= 9; a++)
      for (let b = 3; b <= 9; b++) for (let c = 2; c <= Math.min(20, a * b - 1); c++) emit(a, b, c);
  }),
  ([a, b, c]) => q(`${a} × ${b} - ${c}`, a * b - c, 'mix:mul-sub')
);

const addThenMul = variant(
  space((emit) => {
    for (let a = 2; a <= 20; a++)
      for (let b = 2; b <= 9; b++) for (let c = 2; c <= 9; c++) emit(a, b, c);
  }),
  ([a, b, c]) => q(`${a} + ${b} × ${c}`, a + b * c, 'mix:add-mul')
);

const divThenAdd = variant(
  space((emit) => {
    for (let d = 2; d <= 9; d++)
      for (let quotient = 2; quotient <= 9; quotient++)
        for (let c = 2; c <= 20; c++) emit(d, quotient, c);
  }),
  ([d, quotient, c]) => q(`${d * quotient} ÷ ${d} + ${c}`, quotient + c, 'mix:div-add')
);

const addEquation = variant(
  space((emit) => {
    for (let root = 1; root <= 15; root++) for (let a = 2; a <= 15; a++) emit(root, a);
  }),
  ([root, a]) => q(`x + ${a} = ${root + a}`, root, `eq1:x+${a}`)
);

const subEquation = variant(
  space((emit) => {
    for (let a = 2; a <= 12; a++) for (let root = a + 1; root <= a + 20; root++) emit(a, root);
  }),
  ([a, root]) => q(`x - ${a} = ${root - a}`, root, `eq1:x-${a}`)
);

const mulEquation = variant(
  space((emit) => {
    for (let a = 2; a <= 12; a++) for (let root = 2; root <= 20; root++) emit(a, root);
  }),
  ([a, root]) => q(`${a}x = ${a * root}`, root, `eq1:${a}x`)
);

const divEquation = variant(
  space((emit) => {
    for (let a = 2; a <= 12; a++) for (let rhs = 2; rhs <= 15; rhs++) emit(a, rhs);
  }),
  ([a, rhs]) => q(`x ÷ ${a} = ${rhs}`, a * rhs, `eq1:x÷${a}`)
);

const twoStepAdd = variant(
  space((emit) => {
    for (let a = 2; a <= 9; a++)
      for (let root = 1; root <= 12; root++) for (let b = 1; b <= 20; b++) emit(a, root, b);
  }),
  ([a, root, b]) => q(`${a}x + ${b} = ${a * root + b}`, root, `eq2:${a}x+${b}`)
);

const twoStepSub = variant(
  space((emit) => {
    for (let a = 2; a <= 9; a++)
      for (let root = 2; root <= 12; root++)
        for (let b = 1; b <= Math.min(20, a * root - 1); b++) emit(a, root, b);
  }),
  ([a, root, b]) => q(`${a}x - ${b} = ${a * root - b}`, root, `eq2:${a}x-${b}`)
);

const negativeAdd = variant(
  space((emit) => {
    for (let a = 2; a <= 12; a++) for (let b = 2; b <= 20; b++) emit(a, b);
  }),
  ([a, b]) => q(`-${a} + ${b}`, b - a, `neg:-${a}+${b}`)
);

const negativeSub = variant(
  space((emit) => {
    for (let a = 2; a <= 12; a++) for (let b = 2; b <= 12; b++) emit(a, b);
  }),
  ([a, b]) => q(`-${a} - ${b}`, -a - b, `neg:-${a}-${b}`)
);

const negativeMul = variant(
  space((emit) => {
    for (let a = 2; a <= 12; a++) for (let b = 2; b <= 12; b++) emit(a, b);
  }),
  ([a, b]) => q(`-${a} × ${b}`, -a * b, `neg:-${a}×${b}`)
);

const unitFraction = variant(
  space((emit) => {
    for (let n = 2; n <= 10; n++) for (let k = 2; k <= 20; k++) emit(n, k);
  }),
  ([n, k]) => q(`1/${n} of ${n * k}`, k, `frac:1/${n}`)
);

const PERCENTS = [
  [10, 10],
  [20, 5],
  [25, 4],
  [30, 10],
  [40, 5],
  [50, 2],
  [60, 5],
  [75, 4],
  [80, 5],
];

const percentOf = variant(
  space((emit) => {
    for (const [pct, step] of PERCENTS) for (let k = 2; k <= 20; k++) emit(pct, step * k);
  }),
  ([pct, whole]) => q(`${pct}% of ${whole}`, (pct * whole) / 100, `pct:${pct}%`)
);

const bigProduct = variant(
  space((emit) => {
    for (let a = 12; a <= 25; a++) for (let b = 12; b <= 19; b++) if (a !== b) emit(a, b);
  }),
  ([a, b]) => q(`${a} × ${b}`, a * b, `big:${unordered(a, b, 'x')}`)
);

const square = variant(
  space((emit) => {
    for (let n = 11; n <= 30; n++) emit(n);
  }),
  ([n]) => q(`${n}²`, n * n, `sq:${n}`)
);

const twoByOne = variant(
  space((emit) => {
    for (let a = 13; a <= 39; a++) for (let b = 6; b <= 9; b++) emit(a, b);
  }),
  ([a, b]) => q(`${a} × ${b}`, a * b, `big:${unordered(a, b, 'x')}`)
);

const bracketFirst = variant(
  space((emit) => {
    for (let a = 2; a <= 9; a++)
      for (let b = 2; b <= 9; b++)
        for (let c = 2; c <= 5; c++)
          for (let d = 2; d <= Math.min(12, (a + b) * c - 1); d++) emit(a, b, c, d);
  }),
  ([a, b, c, d]) => q(`(${a} + ${b}) × ${c} - ${d}`, (a + b) * c - d, 'brk:(a+b)×c-d')
);

const factoredAdd = variant(
  space((emit) => {
    for (let a = 2; a <= 9; a++)
      for (let b = 1; b <= 12; b++) for (let root = 1; root <= 20; root++) emit(a, b, root);
  }),
  ([a, b, root]) => q(`${a}(x + ${b}) = ${a * (root + b)}`, root, `eq3:${a}(x+${b})`)
);

const factoredSub = variant(
  space((emit) => {
    for (let a = 2; a <= 9; a++)
      for (let b = 1; b <= 12; b++) for (let root = b + 1; root <= b + 20; root++) emit(a, b, root);
  }),
  ([a, b, root]) => q(`${a}(x - ${b}) = ${a * (root - b)}`, root, `eq3:${a}(x-${b})`)
);

const bothSides = variant(
  space((emit) => {
    for (let a = 3; a <= 9; a++)
      for (let c = 2; c < a; c++)
        for (let root = 1; root <= 12; root++) for (let b = 1; b <= 8; b++) emit(a, c, root, b);
  }),
  ([a, c, root, b]) => q(`${a}x + ${b} = ${c}x + ${(a - c) * root + b}`, root, `eq4:${a}x-${c}x`)
);

const level = (
  id: number,
  name: string,
  blurb: string,
  example: string,
  variants: readonly Variant[]
): Level => {
  const combined = ladder(variants);
  return { id, name, blurb, example, size: combined.size, variants, at: combined.at };
};

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
  level(9, 'Two-digit multiplication', 'Big products, no paper.', '23 × 17', [
    bigProduct,
    square,
    twoByOne,
  ]),
  level(10, 'Brackets and both sides', 'Unpack it first, then hunt down x.', '5x + 3 = 2x + 18', [
    bracketFirst,
    factoredAdd,
    factoredSub,
    bothSides,
  ]),
];
