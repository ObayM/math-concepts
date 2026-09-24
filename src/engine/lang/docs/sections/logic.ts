import type { DocSection } from '../types';

export const logicSection: DocSection = {
  id: 'logic',
  title: 'Loops & Logic',
  description:
    'Prism has compile-time loops and conditionals that unroll before the scene is built. They use brace blocks, same as everything else. Generates static objects — the scene structure is always fixed at runtime.',
  entries: [
    {
      keyword: 'for',
      syntax: 'for <var> in range(start, end[, step]) {\n  ...\n}',
      description:
        'Unrolls at compile time. The loop variable is a compile-time constant inside the block. Use `f"id{i}"` to give each object a unique id.',
      example: `for i in range(0, 8) {\n  rect f"bar{i}" = (i*0.5, 0) { w: 0.45, h: sin(i)*2+2, color: primary, opacity: 0.5 }\n}`,
    },
    {
      keyword: 'if',
      syntax: 'if <cond> {\n  ...\n} [elif <cond> {\n  ...\n}] [else {\n  ...\n}]',
      description:
        'Compile-time conditional. Useful for color-by-sign or emitting different objects based on loop variables.',
      example: `for i in range(-4, 5) {\n  if i >= 0 {\n    rect f"pos{i}" = (i, 0) { w: 0.8, h: i, color: primary }\n  } else {\n    rect f"neg{i}" = (i, i) { w: 0.8, h: 0-i, color: neutral }\n  }\n}`,
    },
    {
      keyword: 'repeat',
      syntax: 'repeat <var> in range(0, <count>) {\n  ...\n}',
      description:
        "Expands at render time, not compile time — `<count>` can be a state expression (e.g. a slider), so the number of instances updates live as the learner drags it. The range must start at 0. Inside the body, `<var>` is a live runtime value (0..count-1), usable in any expression alongside real state. Each body object's id gets `#<i>` appended automatically, so plain ids are fine (no f-string needed). Capped at 500 instances.",
      example: `param n = 4 { range: [1, 40], step: 1 }\nrepeat i in range(0, n) {\n  rect r = (i*4/n, 0) { w: 4/n, h: (i*4/n)^2, color: accent, opacity: 0.3 }\n}\nslider n { label: "rectangles" }`,
    },
    {
      keyword: 'reveal',
      syntax: 'reveal {\n  ...objects...\n}',
      description:
        "Objects inside stay hidden until the slide's exercise has been checked, then appear — the predict-then-reveal pattern (sketch/guess first, see the real answer after). Any normal object statement is allowed inside; a slide needs an exercise for the reveal to ever trigger.",
      example: `curve guess = 0 { color: neutral, style: dashed }\nreveal {\n  curve f = (x-1)^2 - 3 { color: primary, width: 3 }\n}`,
    },
    {
      keyword: 'morph',
      syntax: 'morph <from-id> -> <to-id> { by: <expr from 0 to 1> }',
      description:
        "Turns one object into another without losing track of it. As `by` goes from 0 to 1 the first object fades out and the second fades in, and when both have a position they travel together from the first one's spot to the second's. Drive `by` with a param that a timeline step animates, and a word can visibly become its symbol right where it was. Any object can also take `alpha: <expr>` to fade as a whole, where `opacity:` is only a shape's fill.",
      example: `param m = 0 { range: [0, 1] }\nlabel word at (-4, 3) = "the gap"\nlabel sym at (2, 3) = "h"\nmorph word -> sym { by: m }\nstep "In words, it's the gap." { set: { m: 0 } }\nstep "Mathematicians call it h." { animate: { m: 1 }, dur: 900 }`,
    },
    {
      keyword: 'let',
      syntax: 'let <name> = <expr>',
      description:
        'Assigns a compile-time constant. Can reference other `let` values and loop variables. Not a runtime state variable.',
      example: `let w = 0.4\nlet h = 2.5\nrect r = (0, 0) { w: w, h: h }`,
    },
    {
      keyword: 'def',
      syntax: 'def <name>(param1, param2, ...) {\n  ...\n}',
      description:
        "Defines a reusable macro. Call it like a function — arguments are substituted as compile-time values. Declared inside a `scene`, it's callable only in that scene. Declared at the top of a `lesson` (alongside its `slide`s), it's callable from every slide's scene in that lesson.",
      example: `def tick(x, len) {\n  line f"t{x}" = (x, 0) -> (x, len) { color: neutral }\n}\n\ntick(1, 0.2)\ntick(2, 0.2)\ntick(5, 0.4)`,
    },
  ],
};
