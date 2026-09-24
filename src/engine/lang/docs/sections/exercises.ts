import type { DocSection } from '../types';

export const exercisesSection: DocSection = {
  id: 'exercises',
  title: 'Exercises',
  description:
    'An exercise is the checkable part of a slide — the thing the learner answers. Every exercise shares four optional lines: `ask "..."` (the prompt), `hint "..."` (repeatable — a hint ladder), `! "..."` (the explanation shown after checking), and `skill: "..."` (the skill it tests).',
  entries: [
    {
      keyword: 'expect',
      syntax: 'expect: <expression>',
      description:
        "A correctness check for the author, not the learner. Goes inside a `numeric` exercise and states, as a formula, *why* the answer is what it is. The compiler works it out and refuses to build if it disagrees with `answer:`. It's double-entry bookkeeping for math: writing `answer: 0.8` next to `expect: 4/sqrt(4^2+9)` means a slipped decimal becomes a compile error instead of a wrong answer a student has to argue with. Nothing about it reaches the browser. Only `numeric` takes it, since it needs one unambiguous value to compare against.",
      props: [
        {
          name: 'expect',
          type: 'expr',
          description: 'closed-form value the answer must match, within tolerance',
          required: true,
        },
      ],
      example:
        'lesson "Chain rule" {\n  slide "Under a root" {\n    numeric {\n      ask "For $h(x) = \\sqrt{x^2+9}$, find $h\'(4)$."\n      answer: 0.8\n      tolerance: 0.001\n      expect: 4/sqrt(4^2+9)\n      ! "$h\'(x) = x/\\sqrt{x^2+9}$, so $h\'(4) = 4/5$."\n    }\n  }\n}',
    },
    {
      keyword: 'quiz',
      syntax:
        'quiz {\n  ask "Question?"\n  - "wrong option" { [why: "..."] }\n  * "correct option"\n  [hint "..."]\n  [! "explanation"]\n}',
      description:
        'Multiple choice. Mark the correct option with `*` and wrong options with `-`. Each option may carry a `{ why: "..." }` giving per-option feedback shown when the learner picks it.',
      example:
        'quiz {\n  ask "If a < 0, the parabola..."\n  - "opens upward" { why: "Check the sign — a negative flips it." }\n  * "opens downward"\n  hint "Picture y = -x²."\n  ! "A negative a flips the U so it opens downward."\n}',
    },
    {
      keyword: 'numeric',
      syntax:
        'numeric {\n  ask "..."\n  answer: <number>\n  [answer: <another accepted value>]\n  [tolerance: <n>]\n  [unit: "..."]\n}',
      description:
        'A free-entry numeric answer. The learner types a number and it counts as correct if it lands within `tolerance` of any listed `answer`. Answers fold from expressions, so `64/3` or `sqrt(2)` are fine. `tolerance` defaults to a tiny epsilon (so type an exact expected value, or widen it for estimates). `unit` is shown as a suffix in the input.',
      props: [
        { name: 'answer', type: 'number', description: 'an accepted value (repeatable)' },
        {
          name: 'tolerance',
          type: 'number',
          description: 'how far off is still correct (default ~0)',
        },
        { name: 'unit', type: 'string', description: 'label shown next to the input' },
      ],
      example:
        'numeric {\n  ask "As $n \\to \\infty$, the area under x² on [0,4]?"\n  answer: 64/3\n  tolerance: 0.05\n  hint "The antiderivative of x² is x³/3."\n  ! "x³/3 evaluated from 0 to 4 is 64/3."\n}',
    },
    {
      keyword: 'build',
      syntax:
        'build {\n  ask "..."\n  bank: ["tok", "tok", ...]\n  answer: ["tok", ...]\n  [answer: ["...alt ordering..."]]\n  [template: "text with ___ blanks"]\n  [slots: <n>]\n  [reusable]\n}',
      description:
        'Tap tokens from the bank into slots to assemble an answer. List multiple `answer:` lines to accept equivalent orderings (e.g. commutative forms). Add `reusable` when a token can be placed more than once. Bank tokens and slots render as rich text, so `"$f(a)$"` is a perfectly good token.\n\nWithout `template`, the slots are a bare row and `slots` defaults to the length of the first answer. With `template`, the slots sit inline in the text you write, which turns the same exercise into an expression builder or a fill-in-the-blank sentence. Mark each blank with `___` (three or more underscores). Underscores **inside** a `$...$` span are left alone, so `$x_1$` is safe — which also means a blank cannot go inside a math group like `x^{...}`; make the whole group a bank token instead. When a template is present it decides the slot count, so leave `slots` off.',
      props: [
        { name: 'bank', type: 'string[]', description: 'the tokens the learner can place' },
        { name: 'answer', type: 'string[]', description: 'an accepted sequence (repeatable)' },
        {
          name: 'template',
          type: 'string',
          description: 'text the slots sit inside; each ___ outside math is a slot',
        },
        {
          name: 'slots',
          type: 'number',
          description: 'number of slots (defaults to first answer length; unused with a template)',
        },
        { name: 'reusable', type: 'flag', description: 'allow a token to be used more than once' },
      ],
      example:
        'build {\n  ask "Complete the power rule."\n  template: "$\\frac{d}{dx}\\left[x^{3}\\right] =$ ___ $\\cdot$ ___"\n  bank: ["3", "2", "$x^{2}$", "$x^{3}$"]\n  answer: ["3", "$x^{2}$"]\n  hint "Bring the exponent down, then drop it by one."\n  ! "$3x^{2}$ — the 3 comes down and the power drops to 2."\n}',
    },
    {
      keyword: 'hotspot',
      syntax:
        'hotspot {\n  ask "..."\n  target rect (x, y) { w: <n>, h: <n> }\n  [target circle (x, y) { r: <n> }]\n  [miss "..."]\n}',
      description:
        "Tap the right spot directly on the slide's scene, rather than picking from a list or typing a value. `target` is a rect or circle region in scene (data) coordinates — a tap inside it is correct. The tapped point is marked on the scene; `miss` is shown instead of the usual explanation when the tap lands outside the target.",
      props: [
        {
          name: 'target',
          type: 'rect | circle',
          description: 'the hit region, in scene coordinates',
          required: true,
        },
        { name: 'miss', type: 'string', description: 'feedback shown when the tap misses' },
      ],
      example:
        'hotspot {\n  ask "Tap where the parabola crosses y = 4."\n  target circle (2, 4) { r: 0.6 }\n  miss "Try solving x² = 4."\n  ! "x² = 4 at x = 2 (and x = -2, off to the left)."\n}',
    },
    {
      keyword: 'sketch',
      syntax:
        'sketch curve {\n  ask "..."\n  [follows: <expr in x>]\n  [over: [start, end]]\n  [near (x, y) ...]\n  [tol: <n>]\n}\nsketch points {\n  ask "..."\n  near (x, y)\n  [near (x, y) ...]\n  [tol: <n>]\n}\nsketch line {\n  ask "..."\n  through (x, y)\n  slope: <n>\n  [tol: <n>]\n  [slopeTol: <n>]\n}',
      description:
        "Draw directly on the slide's scene — a freehand curve, a handful of tapped points, or a dragged straight line. `curve` and `points` check against `near` landmark points (the drawn shape must pass within `tol` of each); `curve` is checked as a connected stroke, `points` as independent taps. Give a `curve` a `follows:` function and the whole drawing is graded against it over `over:` (or the span of the `near` points), which is what you want whenever the shape matters and not just a few landmarks. `line` checks the drawn segment's slope against `slope` (within `slopeTol`) and that it passes within `tol` of `through`. Pairs naturally with a `reveal { ... }` block for predict-then-reveal.",
      props: [
        { name: 'near', type: '(number, number)', description: 'a landmark point (repeatable)' },
        {
          name: 'follows',
          type: 'expression in x',
          description: 'the function the drawn curve has to match (curve mode)',
        },
        {
          name: 'over',
          type: '[number, number]',
          description: 'the x range follows: is checked on (default: the near points)',
        },
        {
          name: 'through',
          type: '(number, number)',
          description: 'point the line must pass near (line mode)',
        },
        {
          name: 'slope',
          type: 'number',
          description: 'expected slope (line mode)',
          required: true,
        },
        { name: 'tol', type: 'number', description: 'position tolerance, in scene units' },
        {
          name: 'slopeTol',
          type: 'number',
          description: 'slope tolerance (line mode, default 0.5)',
        },
      ],
      example:
        'sketch curve {\n  ask "Draw $y = (x-1)^2 - 3$, vertex and both crossings roughly right."\n  follows: (x-1)^2 - 3\n  near (1, -3)\n  near (1-sqrt(3), 0)\n  near (1+sqrt(3), 0)\n  tol: 0.6\n  hint "Vertex form puts the vertex at (h, k)."\n}',
    },
    {
      keyword: 'match',
      syntax:
        'match {\n  ask "..."\n  pair "left" -> "right"\n  [pair "left2" -> "right2" ...]\n  [decoy "extra wrong right"]\n  [hint "..."]\n  [! "explanation"]\n}',
      description:
        'Tap-left-then-tap-right pairing. Tap a left item, then tap the right item it belongs with — at least two `pair` lines are required. `decoy` adds extra right-side entries that never pair with anything, making the match harder to guess. The right column is shuffled (seeded off the left texts, so it stays put across re-renders of the same exercise).',
      props: [
        {
          name: 'pair',
          type: '"left" -> "right"',
          description: 'a correct pairing (repeatable, min 2)',
        },
        {
          name: 'decoy',
          type: 'string',
          description: 'an extra unpaired right-side option (repeatable)',
        },
      ],
      example:
        'match {\n  ask "Match each derivative rule to its result."\n  pair "d/dx(x^n)" -> "n·x^(n-1)"\n  pair "d/dx(sin x)" -> "cos x"\n  pair "d/dx(cos x)" -> "-sin x"\n  decoy "n·x^n"\n  ! "Power rule brings the exponent down and drops it by one."\n}',
    },
    {
      keyword: 'order',
      syntax:
        'order {\n  ask "..."\n  item "..."\n  [item "..." ...]\n  [decoy "..."]\n  [hint "..."]\n  [! "explanation"]\n}',
      description:
        "Put a shuffled list of items back into the right order. The `item` lines are declared in their correct sequence — that's both the answer and the source of the tokens shown (shuffled) to the learner. `decoy` adds extra tokens that don't belong in the sequence at all. Like `build`, but without the operator/operand token styling and without separate `bank:`/`answer:` arrays — there is exactly one correct order.",
      props: [
        {
          name: 'item',
          type: 'string',
          description: 'a step in the correct sequence (repeatable, min 2)',
        },
        {
          name: 'decoy',
          type: 'string',
          description: "an extra token that isn't part of the sequence (repeatable)",
        },
      ],
      example:
        'order {\n  ask "Order these steps of order of operations."\n  item "Parentheses"\n  item "Exponents"\n  item "Multiply / Divide"\n  item "Add / Subtract"\n  ! "PEMDAS, left to right within each tier."\n}',
    },
    {
      keyword: 'sort',
      syntax:
        'sort {\n  ask "..."\n  bin "Label": ["item", "item", ...]\n  bin "Other label": ["item", ...]\n  [hint "..."]\n  [! "explanation"]\n}',
      description:
        'Drop each item into the bin it belongs to. Declare at least two `bin` groups; every item listed under a bin is shown in a shuffled tray and has to be put back. Reach for this when the lesson is about *telling cases apart* (which rule opens a derivative, which kind of discontinuity a function has), where a multiple choice only ever probes one case at a time. An item may appear in exactly one bin, or the compiler refuses to build, since there would be no single right answer. Items render as rich text, so `"$x^2\\sin x$"` is a fine item.',
      props: [
        {
          name: 'bin',
          type: 'string: string[]',
          description: 'a labelled bin and the items belonging in it (repeatable, min 2)',
        },
      ],
      example:
        'sort {\n  ask "Which rule opens each derivative?"\n  bin "Product rule": ["$x^{2}\\sin x$", "$e^{x}\\ln x$"]\n  bin "Chain rule": ["$(x^{2}+1)^{3}$", "$\\sin(3x)$"]\n  bin "Quotient rule": ["$\\frac{\\sin x}{x}$"]\n  hint "Look at the outermost operation: a product, a composition, or a division?"\n  ! "Read the outermost operation first, and that names the rule you start with."\n}',
    },
    {
      keyword: 'table',
      syntax:
        'table {\n  ask "..."\n  [header: ["col", "col", ...]]\n  row: <value|blank(answer)>, <value|blank(answer)>, ...\n  [row: ...]\n  [tolerance: <n>]\n}',
      description:
        'Fill in the blanks of a function table. Each `row:` line lists one value per column — plain numbers are given, `blank(<answer>)` marks a cell the learner fills in (the argument is the expected value, and folds from an expression like any other answer). Every row needs the same number of cells; at least one cell across the whole table must be a `blank(...)`. `tolerance` applies to every blank. Correctness is shown per-blank plus an overall "X / N correct" count — partial credit is surfaced but never blocks Continue, same as every other exercise.',
      props: [
        { name: 'header', type: 'string[]', description: 'column headings (optional)' },
        {
          name: 'row',
          type: 'value, value, ...',
          description: 'one row — mix plain numbers and blank(answer) cells (repeatable)',
          required: true,
        },
        {
          name: 'tolerance',
          type: 'number',
          description: 'how far off a blank can be (default ~0)',
        },
      ],
      example:
        'table {\n  ask "Complete the table for f(x) = x² - 1."\n  header: ["x", "f(x)"]\n  row: -2, blank(3)\n  row: -1, blank(0)\n  row: 0, blank(-1)\n  row: 1, blank(0)\n  row: 2, blank(3)\n  ! "Square x, then subtract 1."\n}',
    },
  ],
};
