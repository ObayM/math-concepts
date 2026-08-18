export interface DocError {
  code: string;
  title: string;
  explanation: string;
  bad: string;
  good: string;
}

// curated, not exhaustive — the ~10 mistakes new Prism authors (human or AI)
// actually make. `code` is a docs-only mnemonic for linking/citing; it isn't
// threaded onto CompileError itself (message + line/col already identify the
// error precisely — a formal code system would mean touching every throw
// site in the compiler for no reader-facing benefit over this curated list).
export const PRISM_ERRORS: DocError[] = [
  {
    code: 'E_UNKNOWN_ID',
    title: 'Unknown identifier',
    explanation:
      'An expression referenced a name that was never declared as `param`/`bool`/`choice` state (or isn\'t a frame variable like `x`/`t`). Typos get a "did you mean" suggestion.',
    bad: 'param t = 0\ncurve f = t2 { color: primary }',
    good: 'param t = 0\ncurve f = t { color: primary }',
  },
  {
    code: 'E_NONE',
    title: '"None" is not a value',
    explanation:
      "Older versions silently turned `None` into `Infinity`, producing baffling off-screen geometry. It's a parse error now — omit the prop instead, or bind it to a real boolean.",
    bad: 'curve f = x^2 { show: None }',
    good: 'bool showF = true\ncurve f = x^2 { show: showF }',
  },
  {
    code: 'E_DOT',
    title: 'Member access ("a.b") is unsupported',
    explanation:
      "Prism is state-centric, not object-centric — there's no `point.x`. Give each coordinate its own state variable instead.",
    bad: 'param p = 0\ncurve f = p.x',
    good: 'param px = 0\ncurve f = px',
  },
  {
    code: 'E_SCENE_DOMAIN',
    title: 'Scene needs an x domain',
    explanation:
      '`x: [min, max]` is required on every scene (and `y:` too, for `plane`). Without it the renderer has no coordinate system to map to pixels.',
    bad: 'scene plane {\n  grid\n  axes\n}',
    good: 'scene plane {\n  x: [-5, 5]\n  y: [-5, 5]\n  grid\n  axes\n}',
  },
  {
    code: 'E_DUPLICATE_EXERCISE',
    title: 'A slide can have at most one exercise',
    explanation:
      'A slide is prose? + scene? + exercise? + goal* — exactly zero or one exercise. Two answerable things on one slide is ambiguous for the Check button. Split into two slides instead.',
    bad: 'lesson "L" {\n  slide "s" {\n    quiz {\n      ask "pick one"\n      * "a"\n      - "b"\n    }\n    numeric {\n      ask "and a number?"\n      answer: 1\n    }\n  }\n}',
    good: 'lesson "L" {\n  slide "s1" {\n    quiz {\n      ask "pick one"\n      * "a"\n      - "b"\n    }\n  }\n  slide "s2" {\n    numeric {\n      ask "and a number?"\n      answer: 1\n    }\n  }\n}',
  },
  {
    code: 'E_QUIZ_CORRECT',
    title: 'Quiz needs a correct option',
    explanation: 'Exactly one option must be marked `*` — the rest use `-`.',
    bad: 'quiz {\n  ask "pick one"\n  - "a"\n  - "b"\n}',
    good: 'quiz {\n  ask "pick one"\n  - "a"\n  * "b"\n}',
  },
  {
    code: 'E_UNDEFINED_BIND',
    title: "Control binds to state that doesn't exist",
    explanation:
      'Every `slider`/`toggle`/`stepper`/`picker`/`button` writes to a `param`/`bool`/`choice` declared earlier in the same scene — declare the state first.',
    bad: 'slider t { label: "t" }',
    good: 'param t = 0 { range: [-3, 3] }\nslider t { label: "t" }',
  },
  {
    code: 'E_HOTSPOT_TARGET',
    title: 'Hotspot needs a target',
    explanation:
      'A `hotspot` exercise needs exactly one `target rect (...)` or `target circle (...)`.',
    bad: 'hotspot {\n  ask "tap it"\n}',
    good: 'hotspot {\n  ask "tap it"\n  target circle (0, 0) { r: 1 }\n}',
  },
  {
    code: 'E_TABLE_BLANK',
    title: 'Table needs at least one blank',
    explanation:
      "Every `row:` cell is either a plain given number or a `blank(<answer>)` — at least one cell across the whole table must be a blank, or there's nothing for the learner to fill in.",
    bad: 'table {\n  ask "fill it in"\n  row: 1, 2\n}',
    good: 'table {\n  ask "fill it in"\n  row: 1, blank(2)\n}',
  },
  {
    code: 'E_MATCH_PAIR',
    title: 'Match pair needs both sides',
    explanation:
      'Each `pair` line is `"left" -> "right"` — both the left and right text are required.',
    bad: 'match {\n  ask "match them"\n  pair "a"\n  pair "b" -> "2"\n}',
    good: 'match {\n  ask "match them"\n  pair "a" -> "1"\n  pair "b" -> "2"\n}',
  },
  {
    code: 'E_ONWRONG_TARGET',
    title: 'Detour target must be a hidden slide',
    explanation:
      'An `onwrong:` target has to name a slide in the same lesson that is marked `hidden: true`. Without `hidden`, the scaffold would also appear on the main path, so every learner would see the remediation whether they needed it or not. Unknown ids get a "did you mean" suggestion.',
    bad: 'lesson "L" {\n  slide "Question" {\n    numeric {\n      ask "2 + 2?"\n      answer: 4\n      onwrong: "help"\n    }\n  }\n  slide "Help" {\n    id: "help"\n    > count on your fingers\n  }\n}',
    good: 'lesson "L" {\n  slide "Question" {\n    numeric {\n      ask "2 + 2?"\n      answer: 4\n      onwrong: "help" retry\n    }\n  }\n  slide "Help" {\n    id: "help"\n    hidden: true\n    > count on your fingers\n  }\n}',
  },
  {
    code: 'E_EXPECT_MISMATCH',
    title: 'expect: disagrees with the answer',
    explanation:
      "`expect:` states the derivation of a numeric answer so the compiler can double-check it. If the two don't agree within the exercise's tolerance, the build fails and names both values. That's the point: it catches a mistyped answer before a learner ever sees it. Fix whichever one is actually wrong.",
    bad: 'numeric {\n  ask "What is 3/8 as a decimal?"\n  answer: 0.385\n  tolerance: 0.0001\n  expect: 3/8\n}',
    good: 'numeric {\n  ask "What is 3/8 as a decimal?"\n  answer: 0.375\n  tolerance: 0.0001\n  expect: 3/8\n}',
  },
  {
    code: 'E_SLIDE_ID_REQUIRED',
    title: 'A non-ascii title needs an explicit id',
    explanation:
      'Slide ids are derived from the title by keeping `[a-z0-9]` and nothing else, so an Arabic (or any non-latin) title leaves nothing to build an id from. The compiler would fall back to a positional `slide-2`, which silently changes the moment you reorder slides, and slide ids are a durable key: saved notes, recorded attempts and every `onwrong:` target point at them. A title mixing Arabic with latin math is worse, because it keeps only the scraps, so two different slides can both end up as `f-x`. Write the id yourself.',
    bad: 'lesson "\u0627\u0644\u0646\u0647\u0627\u064a\u0627\u062a" {\n  slide "\u0627\u0644\u0645\u0634\u062a\u0642\u0629 \u062a\u0642\u064a\u0633 \u0645\u0639\u062f\u0644 \u0627\u0644\u062a\u063a\u064a\u0631" {\n    > \u0646\u0635\n  }\n}',
    good: 'lesson "\u0627\u0644\u0646\u0647\u0627\u064a\u0627\u062a" {\n  slide "\u0627\u0644\u0645\u0634\u062a\u0642\u0629 \u062a\u0642\u064a\u0633 \u0645\u0639\u062f\u0644 \u0627\u0644\u062a\u063a\u064a\u0631" {\n    id: "derivative-intro"\n    > \u0646\u0635\n  }\n}',
  },
];
