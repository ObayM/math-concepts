import type { DocSection } from '../types';

export const logicSection: DocSection = {
  id: 'logic',
  title: 'Loops & Logic',
  description:
    'Prism has compile-time loops and conditionals that unroll before the scene is built. They use Python-style colon + indented blocks. Generates static objects — the scene structure is always fixed at runtime.',
  entries: [
    {
      keyword: 'for',
      syntax: 'for <var> in range(start, end[, step]):\n  ...',
      description:
        'Unrolls at compile time. Loop body is indented (spaces, not tabs). The loop variable is a compile-time constant inside the block. Use `f"id{i}"` to give each object a unique id.',
      example: `for i in range(0, 8):\n  rect f"bar{i}" = (i*0.5, 0), w:0.45, h:sin(i)*2+2, color:"primary", opacity:0.5`,
    },
    {
      keyword: 'if',
      syntax: 'if <cond>:\n  ...\n[elif <cond>:\n  ...]\n[else:\n  ...]',
      description:
        'Compile-time conditional. Useful for color-by-sign or emitting different objects based on loop variables.',
      example: `for i in range(-4, 5):\n  if i >= 0:\n    rect f"pos{i}" = (i, 0), w:0.8, h:i, color:"primary"\n  else:\n    rect f"neg{i}" = (i, i), w:0.8, h:0-i, color:"neutral"`,
    },
    {
      keyword: 'let',
      syntax: 'let <name> = <expr>',
      description:
        'Assigns a compile-time constant. Can reference other `let` values and loop variables. Not a runtime state variable.',
      example: `let w = 0.4\nlet h = 2.5\nrect r = (0, 0), w:w, h:h`,
    },
    {
      keyword: 'def',
      syntax: 'def <name>(param1, param2, ...):\n  ...',
      description:
        'Defines a reusable macro. Call it like a function — arguments are substituted as compile-time values. Body is indented.',
      example: `def tick(x, len):\n  line f"t{x}" = (x, 0) -> (x, len), color:"neutral"\n\ntick(1, 0.2)\ntick(2, 0.2)\ntick(5, 0.4)`,
    },
  ],
};
