import type { DocSection } from '../types';

export const exercisesSection: DocSection = {
  id: 'exercises',
  title: 'Exercises',
  description:
    'An exercise is the checkable part of a slide — the thing the learner answers. Every exercise shares four optional lines: `ask "..."` (the prompt), `hint "..."` (repeatable — a hint ladder), `! "..."` (the explanation shown after checking), and `skill: "..."` (the skill it tests).',
  entries: [
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
        'build {\n  ask "..."\n  bank: ["tok", "tok", ...]\n  answer: ["tok", ...]\n  [answer: ["...alt ordering..."]]\n  [slots: <n>]\n  [reusable]\n}',
      description:
        'Tap tokens from the bank into slots to assemble an expression. List multiple `answer:` lines to accept equivalent orderings (e.g. commutative forms). `slots` defaults to the length of the first answer. Add `reusable` when a token can be placed more than once.',
      props: [
        { name: 'bank', type: 'string[]', description: 'the tokens the learner can place' },
        { name: 'answer', type: 'string[]', description: 'an accepted sequence (repeatable)' },
        {
          name: 'slots',
          type: 'number',
          description: 'number of slots (defaults to first answer length)',
        },
        { name: 'reusable', type: 'flag', description: 'allow a token to be used more than once' },
      ],
      example:
        'build {\n  ask "Factor x² + 5x + 6."\n  reusable\n  bank: ["(", ")", "x", "+", "2", "3"]\n  answer: ["(", "x", "+", "2", ")", "(", "x", "+", "3", ")"]\n  ! "2 × 3 = 6 and 2 + 3 = 5, so (x + 2)(x + 3)."\n}',
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
        'sketch curve {\n  ask "..."\n  near (x, y)\n  [near (x, y) ...]\n  [tol: <n>]\n}\nsketch points {\n  ask "..."\n  near (x, y)\n  [near (x, y) ...]\n  [tol: <n>]\n}\nsketch line {\n  ask "..."\n  through (x, y)\n  slope: <n>\n  [tol: <n>]\n  [slopeTol: <n>]\n}',
      description:
        "Draw directly on the slide's scene — a freehand curve, a handful of tapped points, or a dragged straight line. `curve` and `points` check against `near` landmark points (the drawn shape must pass within `tol` of each); `curve` is checked as a connected stroke, `points` as independent taps. `line` checks the drawn segment's slope against `slope` (within `slopeTol`) and that it passes within `tol` of `through`. Pairs naturally with a `reveal { ... }` block for predict-then-reveal.",
      props: [
        { name: 'near', type: '(number, number)', description: 'a landmark point (repeatable)' },
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
        'sketch curve {\n  ask "Draw $y = (x-1)^2 - 3$ — vertex and both crossings roughly right."\n  near (1, -3)\n  near (1-sqrt(3), 0)\n  near (1+sqrt(3), 0)\n  tol: 0.6\n  hint "Vertex form puts the vertex at (h, k)."\n}',
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
  ],
};
