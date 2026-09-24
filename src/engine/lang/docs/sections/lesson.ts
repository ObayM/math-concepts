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
        'slide "Title" {\n  [beat: explore]\n  [cat: "..."]\n  [skill: "..."]\n  > prose...\n  scene ... { ... }\n  <exercise>\n  goal "..." { ... }\n}',
      description:
        'One screen of a lesson. Compose it from prose, an optional scene, an optional exercise (quiz/build), and optional goals. `cat` groups slides into sections; `skill` tags the specific skill this slide drills. `beat` says which part of the lesson standard the slide is (hook, explore, trap, name, transfer...), so `dsl verify --standard` can warn about a lesson with no trap, no transfer, or symbols named before anything was explored.',
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
        {
          name: 'then',
          type: 'string',
          description: 'on a hidden slide: the next hidden slide of the same detour (up to 3 long)',
        },
        {
          name: 'beat',
          type: 'check | bridge | hook | explore | reveal | trap | name | breaker | example | transfer | detour',
          description: 'the beat this slide plays in the lesson, for the linter',
        },
      ],
      example:
        'slide "Vertex form" {\n  beat: explore\n  cat: "Forms"\n  > Drag the vertex and the curve follows.\n  scene plane {\n    x: [-6, 6]\n    y: [-6, 6]\n    param h = 1 { range: [-4, 4] }\n    param k = -2 { range: [-4, 4] }\n    curve f = (x-h)^2 + k { color: primary }\n    point v = (h, k) { drag: xy -> (h, k), color: accent }\n  }\n}',
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
      syntax:
        'goal "Instruction" { when: <condition>, [hints: ["...", "..."]], [showme: {k: v}], [dur: <ms>] }',
      description:
        "Gates the slide's Continue until the learner satisfies `when` (a boolean expression over the scene's state, which latches once true). Use it for guided tasks like \"drag the vertex below the axis\". Hints stay hidden until the learner has been stuck for a while, then arrive one at a time, broadest first. Once the last hint is out, `showme` offers a Show me button that animates the scene to the given values, so the goal gets met in front of them and is marked as helped. `dsl verify` checks that the goal starts unmet and that `showme` really meets it. Put `after: goals` inside the slide's exercise to keep the question hidden until every goal is met, so the student explores first and gets asked second.",
      props: [
        {
          name: 'when',
          type: 'expr',
          description: 'boolean condition over scene state',
          required: true,
        },
        {
          name: 'hint',
          type: 'string',
          description: 'a single nudge shown if the learner is stuck',
        },
        {
          name: 'hints',
          type: '[string]',
          description: 'a ladder of nudges, broadest first, one more per tap',
        },
        {
          name: 'showme',
          type: '{ key: value }',
          description: 'state the Show me button animates to, which must meet the goal',
        },
        {
          name: 'dur',
          type: 'ms',
          description: 'how long the Show me animation takes (default 2000)',
        },
      ],
      example:
        'scene plane {\n  x: [-6, 6]\n  y: [-6, 6]\n  grid\n  axes\n  param r1 = -3 { range: [-6, 6] }\n  param r2 = 2 { range: [-6, 6] }\n  point p1 = (r1, 0) { drag: x -> r1, color: danger }\n  point p2 = (r2, 0) { drag: x -> r2, color: danger }\n}\ngoal "Make both roots negative" {\n  when: r1 < 0 and r2 < 0\n  hints: ["Where does a negative root sit on the axis?", "Drag both red points left of zero."]\n  showme: { r1: -4, r2: -1 }\n}',
    },
    {
      keyword: 'role',
      syntax: 'role <name> = <colour>\n[words]{name}\n$\\textcolor{name}{x}$\ncolor: name',
      description:
        'Colour roles tie a word in the text to the thing it names in the picture. Declare `role distance = accent` once at the top of the lesson, then use `distance` wherever a colour goes: `color: distance` on a scene object, `[the distance]{distance}` around words in prose, questions and goals, and `\\textcolor{distance}{d}` inside math. Everything playing that role comes out the same colour, so "distance" in the sentence and the distance leg on the graph are visibly the same thing. The colour is one of primary, accent, success, danger, warning or neutral, and about three roles per lesson is plenty.',
      example:
        'lesson "Speed" {\n  role distance = accent\n  role gap = primary\n\n  slide "Average speed" {\n    > Average speed is the [distance]{distance} covered, $\\textcolor{distance}{d}$, over the [time gap]{gap}, $\\textcolor{gap}{h}$.\n    scene plane {\n      x: [0, 2.2]\n      y: [0, 4.5]\n      grid\n      axes\n      param h = 1 { range: [0.1, 1], step: 0.1 }\n      curve f = x^2 { color: neutral }\n      line run = (1, 1) -> (1 + h, 1) { color: gap, width: 3 }\n      line rise = (1 + h, 1) -> (1 + h, (1 + h)^2) { color: distance, width: 3 }\n      slider h { label: "gap" }\n    }\n    goal "Make the [gap]{gap} smaller than 0.5" { when: h < 0.5 }\n  }\n}',
    },
    {
      keyword: 'answer',
      syntax: '${answer("slide-id")}\n${answer("slide-id", "fallback")}\n${recall("param")}',
      description:
        'Lesson memory. Inside prose, a question or a goal, `${answer("slide-id")}` shows what the student answered on an earlier quiz or numeric slide (the option they picked, or the number they typed), and `${recall("name")}` shows the last value of a `keep` param. This is how a reveal can say "you guessed rounding" and how the naming slide can use the number the student found themselves. The slide has to come earlier in the lesson, which the compiler checks. Before there is an answer the fallback shows, or `?` if you gave none.',
      example:
        'lesson "Speed" {\n  slide "Bet" {\n    id: "bet"\n    quiz {\n      ask "What does a speedometer show at one instant?"\n      * "something real, we need a new idea for it"\n      - "nothing real, it is rounding"\n    }\n  }\n\n  slide "Shrink the gap" {\n    id: "shrink"\n    scene plane {\n      x: [0, 2]\n      y: [0, 4]\n      param h = 1 { range: [0.001, 1], step: 0.001, keep }\n      curve f = x^2\n      slider h { label: "gap" }\n    }\n    goal "Get the gap below 0.01" { when: h < 0.01 }\n  }\n\n  slide "What you found" {\n    > You bet on ${answer("bet", "a guess")}, and you shrank the gap to ${recall("h")}.\n    quiz {\n      ask "Was the bet right?"\n      * "it shows something real"\n      - "it shows nothing"\n    }\n  }\n}',
    },
    {
      keyword: 'onwrong',
      syntax:
        'onwrong: "slide-id" [retry]\n- "wrong option" { why: "...", onwrong: "slide-id", retry }\nwrong <value> ["why"] [-> "slide-id" [retry]]',
      description:
        'Adaptive branching. Goes inside any exercise: if the learner gets it wrong, they take a detour to the named slide (which must be a `hidden: true` slide in the same lesson) and then come back. A scaffold is an ordinary slide, so it can carry its own prose, scene, and exercise. Add `retry` to return the learner to the original question for another attempt; leave it off to move them forward instead.\n\nDifferent mistakes usually mean different misconceptions, so each can get its own detour: put `onwrong:` on a quiz option, or add a `wrong <value> -> "slide-id"` line to a numeric (with an optional `\"why\"` for the mistake). The exercise-level `onwrong:` catches every wrong answer nobody named. Each detour fires at most once per question, so a student who comes back and makes a different mistake still gets the fix for that one, and detours cannot chain. A detour that needs more than one slide (a short bridge for a missing prerequisite) links its hidden slides with `then: "next-id"`, up to three in a row, before sending the learner back.',
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
        'lesson "Chain rule" {\n  slide "Differentiate it" {\n    quiz {\n      ask "What is the derivative of $(3x+1)^2$?"\n      * "$6(3x+1)$"\n      - "$2(3x+1)$" { why: "That drops the inner derivative.", onwrong: "forgot-inner", retry }\n      - "$3x+1$" { why: "The power went missing." }\n      onwrong: "chain-again" retry\n      ! "Outer derivative times inner derivative."\n    }\n  }\n\n  slide "The inner bit" {\n    id: "forgot-inner"\n    hidden: true\n    > The outside is squaring, so its derivative is $2(3x+1)$. But the inside $3x+1$ changes **three times as fast** as $x$, so you multiply by $3$ too.\n    numeric {\n      ask "What is the derivative of the inside, $3x+1$?"\n      answer: 3\n    }\n  }\n\n  slide "Outside, then inside" {\n    id: "chain-again"\n    hidden: true\n    > Differentiate the outside and leave the inside alone, then multiply by the derivative of the inside.\n    numeric {\n      ask "What is the derivative of $(2x)^2$ at $x = 1$?"\n      answer: 8\n      wrong 4 "That is the outside only."\n    }\n  }\n}',
    },
  ],
};
