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
