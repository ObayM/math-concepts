import type { DocSection } from '../types';

export const expressionsSection: DocSection = {
  id: 'expressions',
  title: 'Expressions & Math',
  description:
    "Expressions appear in object properties (like the `expr` in `curve f = <expr>`), control bounds, and `${...}` label interpolations. They're evaluated at runtime against the current state.",
  entries: [
    {
      keyword: 'operators',
      syntax: '+ - * / ^ %',
      description:
        '`^` is exponentiation (e.g. `x^2`). All standard arithmetic. Standard precedence.',
      example: 'curve f = (x^2 + 2*x + 1) / (x + 1) { color: primary }',
    },
    {
      keyword: 'math functions',
      syntax:
        'sin cos tan asin acos atan atan2 sinh cosh tanh sec csc cot\nsqrt cbrt abs log log2 log10 exp pow hypot\nfloor ceil round sign min max clamp lerp mod\ndeg rad fact nCr nPr',
      description:
        'All standard math functions, called without a namespace prefix. Trig works in radians — `deg`/`rad` convert. `mod` is a true modulo (unlike the `%` operator, `mod(-1, 3)` is `2`). `fact`, `nCr` and `nPr` are the counting functions; they return nothing usable for negative, non-integer, or out-of-range input.',
      example:
        'curve s = sin(x) * exp(-x/4) { color: primary }\nlabel at (0, 0) = "C(5,2) = ${nCr(5, 2)}"',
    },
    {
      keyword: 'constants',
      syntax: 'PI  E',
      description: 'Mathematical constants (uppercase).',
      example: `param t = 1.57 { range: [0, 6.28] }\ncircle unit = (0,0) { r: 1 }\narc a = (0,0) { r: 0.3, from: 0, to: t*180/PI }`,
    },
    {
      keyword: 'interpolation',
      syntax: '"text ${expr} more text"',
      description:
        'In label text, `${expr}` is evaluated at runtime and shown rounded to 2 decimal places.',
      example: 'param t = 1 { range: [-3, 3] }\nlabel at (t, t^2+0.5) = "f(${t}) = ${t^2}"',
    },
    {
      keyword: 'f-strings',
      syntax: 'f"text {expr}"',
      description:
        'Compile-time string interpolation. Used to generate unique object IDs and string values inside `for` loops. Uses `{expr}`, not `${expr}`.',
      example: `for i in range(0, 5) {\n  point f"p{i}" = (i, i^2) { label: f"p{i}" }\n}`,
    },
  ],
};
