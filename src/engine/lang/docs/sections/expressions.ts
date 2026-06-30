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
      example: '(x^2 + 2*x + 1) / (x + 1)',
    },
    {
      keyword: 'math functions',
      syntax:
        'sin cos tan asin acos atan atan2 sinh cosh tanh sqrt cbrt abs log log2 log10 exp floor ceil round sign pow hypot min max',
      description: 'All standard math functions. Called without a namespace prefix.',
      example: `curve s = sin(x) * exp(-x/4), color:"primary"\nlabel at (PI, 0), "π"`,
    },
    {
      keyword: 'constants',
      syntax: 'PI  E',
      description: 'Mathematical constants (uppercase).',
      example: `circle unit = (0,0), r:1\narc a = (0,0), r:0.3, from:0, to:t*180/PI`,
    },
    {
      keyword: 'interpolation',
      syntax: '"text ${expr} more text"',
      description:
        'In label text, `${expr}` is evaluated at runtime and shown rounded to 2 decimal places.',
      example: 'label at (t, t^2+0.5), "f(${t}) = ${t^2}"',
    },
    {
      keyword: 'f-strings',
      syntax: 'f"text {expr}"',
      description:
        'Compile-time string interpolation. Used to generate unique object IDs and string values inside `for` loops. Uses `{expr}`, not `${expr}`.',
      example: `for i in range(0, 5):\n  point f"p{i}" = (i, i^2), label:f"p{i}"`,
    },
  ],
};
