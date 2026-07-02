// the only functions callable from prism expressions. call-position and
// id-position are separate namespaces, so a state var named `min` never
// collides with the function `min(...)`.

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
};

export const BUILTIN_NAMES = Object.keys(BUILTINS) as [string, ...string[]];

// id-position constants, checked after scope (scope always wins)
export const CONSTS: Record<string, number> = { PI: Math.PI, E: Math.E };
