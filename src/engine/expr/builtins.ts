// the only functions callable from prism expressions. call-position and
// id-position are separate namespaces, so a state var named `min` never
// collides with the function `min(...)`.

// bad input must return NaN, never throw — the emitter folds these calls and
// swallows a throw, leaving a live tree instead of failing loudly. 170! is the
// last one that fits a double.
const FACT_MAX = 170;

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0 || n > FACT_MAX) return NaN;
  let out = 1;
  for (let i = 2; i <= n; i++) out *= i;
  return out;
}

function choose(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n) return NaN;
  const m = Math.min(k, n - k);
  let out = 1;
  for (let i = 0; i < m; i++) out = (out * (n - i)) / (i + 1);
  return Math.round(out);
}

function permute(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n) return NaN;
  let out = 1;
  for (let i = 0; i < k; i++) out *= n - i;
  return out;
}

export const BUILTINS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  atan2: Math.atan2,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  log: Math.log,
  log2: Math.log2,
  log10: Math.log10,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
  pow: Math.pow,
  hypot: Math.hypot,
  min: Math.min,
  max: Math.max,
  clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  sec: (x) => 1 / Math.cos(x),
  csc: (x) => 1 / Math.sin(x),
  cot: (x) => 1 / Math.tan(x),
  deg: (r) => (r * 180) / Math.PI,
  rad: (d) => (d * Math.PI) / 180,
  mod: (a, n) => ((a % n) + n) % n,
  fact: factorial,
  nCr: choose,
  nPr: permute,
};

export const BUILTIN_NAMES = Object.keys(BUILTINS) as [string, ...string[]];

// id-position constants, checked after scope (scope always wins)
export const CONSTS: Record<string, number> = { PI: Math.PI, E: Math.E };
