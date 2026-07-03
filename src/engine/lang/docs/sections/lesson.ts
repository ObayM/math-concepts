import type { DocSection } from '../types';

export const lessonSection: DocSection = {
  id: 'lesson',
  title: 'Lessons & Slides',
  description:
    'A Prism file is either a bare `scene { ... }` (one visualization) or a `lesson { ... }` (a full multi-slide lesson). A slide is a *composition*: any prose, at most one scene, at most one exercise, and any number of goals — in any order. There is no "text slide" vs "quiz slide"; you just include the parts you need.',
  entries: [
    {
      keyword: 'lesson',
      syntax:
        'lesson "Title" {\n  [course: "..."]\n  [skills: ["...", "..."]]\n  slide "..." { ... }\n  ...\n}',
      description:
        'The top-level container. Holds lesson metadata and an ordered list of slides. `course` tags which track it belongs to; `skills` lists the skill ids it teaches (used by personalization).',
      props: [
        { name: 'course', type: 'string', description: 'track id, e.g. "algebra"' },
        { name: 'skills', type: 'string[]', description: 'skill ids this lesson teaches' },
      ],
      example:
        'lesson "Quadratics" {\n  course: "algebra"\n  skills: ["quad-vertex"]\n\n  slide "Meet the parabola" {\n    > A quadratic graphs as a **parabola**.\n  }\n}',
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
        'goal "Make both roots negative" { when: r1 < 0 and r2 < 0, hint: "Drag both points left." }',
    },
  ],
};
