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
  ],
};
