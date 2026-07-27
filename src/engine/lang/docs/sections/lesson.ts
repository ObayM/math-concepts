import type { DocSection } from '../types';
import { LESSON_ICONS } from '../../icons';

export const lessonSection: DocSection = {
  id: 'lesson',
  title: 'Lessons & Slides',
  description:
    'A Prism file is either a bare `scene { ... }` (one visualization) or a `lesson { ... }` (a full multi-slide lesson). A slide is a *composition*: any prose, at most one scene, at most one exercise, and any number of goals — in any order. There is no "text slide" vs "quiz slide"; you just include the parts you need.',
  entries: [
    {
      keyword: 'lesson',
      syntax:
        'lesson "Title" {\n  [course: "..."]\n  [unit: "..."]\n  [difficulty: "Beginner"|"Intermediate"|"Advanced"]\n  [icon: "..."]\n  [summary: "..."]\n  [skills: ["...", "..."]]\n  slide "..." { ... }\n  ...\n}',
      description:
        'The top-level container. Holds lesson metadata and an ordered list of slides. These properties are the source of truth for how the lesson appears in the catalog: `unit` groups it under a heading on the course page, `difficulty` and `icon` render on its card, and `summary` is the one-line description. `course` tags which track it belongs to; `skills` lists the skill ids it teaches. An unknown property here is a compile error, so a typo cannot silently drop your metadata.',
      props: [
        { name: 'course', type: 'string', description: 'track id, e.g. "calculus"' },
        { name: 'unit', type: 'string', description: 'unit heading on the course page' },
        {
          name: 'difficulty',
          type: '"Beginner" | "Intermediate" | "Advanced"',
          description: 'shown on the lesson card',
        },
        {
          name: 'icon',
          type: 'string',
          description: `lesson card icon, one of: ${LESSON_ICONS.join(', ')}`,
        },
        { name: 'summary', type: 'string', description: 'one line describing the lesson' },
        { name: 'skills', type: 'string[]', description: 'skill ids this lesson teaches' },
      ],
      example:
        'lesson "Quadratics" {\n  course: "algebra"\n  unit: "Polynomials"\n  difficulty: "Beginner"\n  icon: "FunctionSquare"\n  summary: "Meet the parabola and its vertex."\n  skills: ["quad-vertex"]\n\n  slide "Meet the parabola" {\n    > A quadratic graphs as a **parabola**.\n  }\n}',
    },
    {
      keyword: 'slide',
      syntax:
        'slide "Title" {\n  [cat: "..."]\n  [skill: "..."]\n  > prose...\n  scene ... { ... }\n  <exercise>\n  goal "..." { ... }\n}',
      description:
        'One screen of a lesson. Compose it from prose, an optional scene, an optional exercise (quiz/build), and optional goals. `cat` groups slides into sections; `skill` tags the specific skill this slide drills.',
      props: [
        { name: 'cat', type: 'string', description: 'section/category label' },
        {
          name: 'id',
          type: 'string',
          description: 'stable id (auto-slugged from the title if omitted)',
        },
        { name: 'skill', type: 'string', description: 'skill id this slide targets' },
        {
          name: 'hidden',
          type: 'boolean',
          description: 'keep off the main path; only reachable as an onwrong: detour',
        },
      ],
      example:
        'slide "Vertex form" {\n  cat: "Forms"\n  > Drag the vertex — the curve follows.\n  scene plane {\n    x: [-6, 6]\n    y: [-6, 6]\n    param h = 1 { range: [-4, 4] }\n    param k = -2 { range: [-4, 4] }\n    curve f = (x-h)^2 + k { color: primary }\n    point v = (h, k) { drag: xy -> (h, k), color: accent }\n  }\n}',
    },
    {
      keyword: '>',
      syntax: '> markdown text with $latex$',
      description:
        'A prose line. Everything after `> ` is raw text — **markdown** (`**bold**`, `*italic*`) and `$inline$` / `$$display$$` LaTeX all work. Consecutive prose lines join into one paragraph.',
      example: '> The **discriminant** $D = b^2 - 4ac$ tells you how many roots exist.',
    },
    {
      keyword: 'goal',
      syntax: 'goal "Instruction" { when: <condition>, [hint: "..."] }',
      description:
        'Gates the slide\'s Continue until the learner satisfies `when` (a boolean expression over the scene\'s state — it latches once true). Use it for guided tasks like "drag the vertex below the axis".',
      props: [
        {
          name: 'when',
          type: 'expr',
          description: 'boolean condition over scene state',
          required: true,
        },
        { name: 'hint', type: 'string', description: 'nudge shown if the learner is stuck' },
      ],
      example:
        'scene plane {\n  x: [-6, 6]\n  y: [-6, 6]\n  grid\n  axes\n  param r1 = -3 { range: [-6, 6] }\n  param r2 = 2 { range: [-6, 6] }\n  point p1 = (r1, 0) { drag: x -> r1, color: danger }\n  point p2 = (r2, 0) { drag: x -> r2, color: danger }\n}\ngoal "Make both roots negative" { when: r1 < 0 and r2 < 0, hint: "Drag both points left." }',
    },
    {
      keyword: 'onwrong',
      syntax: 'onwrong: "slide-id" [retry]',
      description:
        'Adaptive branching. Goes inside any exercise: if the learner gets it wrong, they take a detour to the named slide (which must be a `hidden: true` slide in the same lesson) and then come back. A scaffold is an ordinary slide, so it can carry its own prose, scene, and exercise. Add `retry` to return the learner to the original question for another attempt; leave it off to move them forward instead. Detours fire at most once per question and cannot chain.',
      props: [
        {
          name: 'onwrong',
          type: 'string',
          description: 'id of the hidden slide to detour to',
          required: true,
        },
        {
          name: 'retry',
          type: 'flag',
          description: 'send them back to the question afterwards instead of onward',
        },
      ],
      example:
        'lesson "Chain rule" {\n  slide "Differentiate it" {\n    quiz {\n      ask "What is the derivative of $(3x+1)^2$?"\n      * "$6(3x+1)$"\n      - "$2(3x+1)$" { why: "That drops the inner derivative." }\n      onwrong: "forgot-inner" retry\n      ! "Outer derivative times inner derivative."\n    }\n  }\n\n  slide "The inner bit" {\n    id: "forgot-inner"\n    hidden: true\n    > The outside is squaring, so its derivative is $2(3x+1)$. But the inside $3x+1$ changes **three times as fast** as $x$, so you multiply by $3$ too.\n    numeric {\n      ask "What is the derivative of the inside, $3x+1$?"\n      answer: 3\n    }\n  }\n}',
    },
  ],
};
