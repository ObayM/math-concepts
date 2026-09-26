export interface CookbookEntry {
  id: string;
  title: string;
  description: string;
  source: string;
}

// six pedagogical patterns, each a full runnable lesson — the highest-ROI
// docs item for AI-generated lesson quality, since these are the shapes an
// author (human or model) actually reaches for, not just syntax reference.
export const PRISM_COOKBOOK: CookbookEntry[] = [
  {
    id: 'predict-then-reveal',
    title: 'Predict, then reveal',
    description:
      'The learner commits to a sketch before seeing the real curve. `follows:` grades the whole stroke, `overlay` then draws the true curve over it and shades the gap, and `reveal { ... }` holds back anything else until the check.',
    source:
      'lesson "Predict then Reveal" {\n  slide "Guess the curve" {\n    > Sketch what $y = (x-1)^2 - 3$ looks like before we draw it.\n    scene plane {\n      x: [-5, 6]\n      y: [-5, 6]\n      grid\n      axes\n      reveal {\n        point v = (1, -3) { color: accent }\n        label at (1, -3.8) = "vertex"\n      }\n    }\n    sketch curve {\n      ask "Draw the parabola, vertex and both crossings roughly right."\n      follows: (x-1)^2 - 3\n      over: [-1.5, 3.5]\n      overlay\n      tol: 0.6\n      hint "Vertex form puts the vertex at (h, k)."\n    }\n  }\n}',
  },
  {
    id: 'build-the-thing',
    title: 'Build the thing',
    description:
      'The learner assembles an expression from a token bank instead of picking or typing an answer — good for factoring, simplification, and any step with a well-defined token sequence.',
    source:
      'lesson "Build the Thing" {\n  slide "Factor it" {\n    > Assemble the factored form of $x^2 + 5x + 6$.\n    build {\n      ask "Factor x^2 + 5x + 6."\n      reusable\n      bank: ["(", ")", "x", "+", "2", "3"]\n      answer: ["(", "x", "+", "2", ")", "(", "x", "+", "3", ")"]\n      ! "2 × 3 = 6 and 2 + 3 = 5, so (x + 2)(x + 3)."\n    }\n  }\n}',
  },
  {
    id: 'fill-in-the-definition',
    title: 'Fill in the definition',
    description:
      'A `build` with a `template` turns a sentence into blanks the learner fills from a bank. Same kind as the token-bank builder above — the only difference is that the literal text around the slots is prose instead of math. Much harder to guess than the equivalent multiple choice, since the distractors sit in the bank rather than next to the answer.',
    source:
      'lesson "Fill in the Definition" {\n  slide "Continuity" {\n    > Three things have to line up for a function to be continuous at a point.\n    build {\n      ask "Finish the definition."\n      template: "$f$ is ___ at $a$ when $f(a)$ exists, the limit at $a$ exists, and the two are ___."\n      bank: ["continuous", "bounded", "differentiable", "equal", "opposite"]\n      answer: ["continuous", "equal"]\n      hint "The limit has to actually reach the value the function takes."\n      ! "Continuous at $a$ means $\\lim_{x \\to a} f(x) = f(a)$ — the limit exists and equals the value."\n    }\n  }\n}',
  },
  {
    id: 'step-through',
    title: 'Step through',
    description:
      'A `timeline` walks the learner through a scene one beat at a time — narrate, reveal, animate — instead of dumping the whole picture at once.',
    source:
      'lesson "Step Through" {\n  slide "Tangent line, one step at a time" {\n    scene plane {\n      x: [-5, 5]\n      y: [-5, 5]\n      grid\n      axes\n      param t = 0 { range: [-3, 3] }\n      bool showTangent = false\n      curve f = x^2 { color: primary }\n      point p = (t, t^2) { drag: x -> t, color: accent }\n      line tangent { through: p, slope: 2*t, style: dashed, show: showTangent }\n      step "Here\'s f(x) = x²."\n      step "The tangent at any point has slope 2x." { set: { showTangent: true } }\n      step "Drag the point and watch the slope update." { animate: { t: 3 }, dur: 2000, ease: easeInOut }\n    }\n  }\n}',
  },
  {
    id: 'explore-then-formalize',
    title: 'Explore, then formalize',
    description:
      'Free play with sliders first, so the learner notices the pattern themselves — then a quiz/numeric slide names what they just discovered.',
    source:
      'lesson "Explore then Formalize" {\n  slide "Explore" {\n    > Drag $a$ and watch the parabola change. What does it control?\n    scene plane {\n      x: [-6, 6]\n      y: [-6, 6]\n      grid\n      axes\n      param a = 1 { range: [-3, 3], step: 0.1 }\n      curve f = a*x^2 { color: primary }\n      slider a { label: "a" }\n    }\n  }\n  slide "Formalize" {\n    quiz {\n      ask "As |a| grows, the parabola..."\n      * "gets narrower"\n      - "gets wider"\n      - "shifts sideways"\n      ! "Bigger |a| means y grows faster per unit of x, so the curve hugs the y-axis more tightly."\n    }\n  }\n}',
  },
  {
    id: 'draw-your-guess',
    title: 'Draw your guess',
    description:
      'Like predict-then-reveal, but the answer is a handful of tapped points (`sketch points`) rather than a whole curve — good for intercepts, roots, or landmark values.',
    source:
      'lesson "Draw Your Guess" {\n  slide "Where does it cross?" {\n    > Tap where you think $y = x^2 - 4$ crosses the x-axis.\n    scene plane {\n      x: [-5, 5]\n      y: [-5, 8]\n      grid\n      axes\n      reveal {\n        curve f = x^2 - 4 { color: primary, width: 3 }\n      }\n    }\n    sketch points {\n      ask "Tap both x-intercepts."\n      near (-2, 0)\n      near (2, 0)\n      tol: 0.5\n      hint "Solve x^2 - 4 = 0."\n    }\n  }\n}',
  },
  {
    id: 'parameter-hunt',
    title: 'Parameter hunt',
    description:
      'A dashed target curve and a `goal` gate Continue until the learner\'s sliders match it — turns "adjust these three numbers" into a game with a clear win condition.',
    source:
      'lesson "Parameter Hunt" {\n  slide "Match the target" {\n    > Adjust $a$, $h$, $k$ until the curve matches the dashed target.\n    scene plane {\n      x: [-6, 6]\n      y: [-6, 6]\n      grid\n      axes\n      param a = 1 { range: [-3, 3], step: 0.1 }\n      param h = 0 { range: [-4, 4], step: 0.1 }\n      param k = 0 { range: [-4, 4], step: 0.1 }\n      curve target = 0.5*(x-2)^2 - 1 { color: neutral, style: dashed }\n      curve f = a*(x-h)^2 + k { color: primary }\n      slider a { label: "a" }\n      slider h { label: "h" }\n      slider k { label: "k" }\n    }\n    goal "Match the target curve" { when: abs(a-0.5) < 0.15 and abs(h-2) < 0.3 and abs(k+1) < 0.3, hint: "Try a ≈ 0.5, h ≈ 2, k ≈ -1." }\n  }\n}',
  },
  {
    id: 'catch-the-misconception',
    title: 'Catch the misconception',
    description:
      'Name the specific wrong answer you expect, then `onwrong:` sends anyone who picks it to a hidden scaffold slide that re-teaches the missing idea before returning them to the question. Write one detour per misconception, not one per question. The point is to answer *why* they went wrong, which a generic explanation cannot.',
    source:
      'lesson "Catch the Misconception" {\n  slide "Average rate of change" {\n    > The slope between two points on a curve is the **average** rate of change.\n    numeric {\n      ask "For $f(x) = x^2$, what is the average rate of change from $x = 1$ to $x = 3$?"\n      answer: 4\n      onwrong: "slope-is-a-ratio" retry\n      hint "Rise over run: use the two function values."\n      ! "$(9 - 1)/(3 - 1) = 8/2 = 4$."\n    }\n  }\n\n  slide "Rise over run" {\n    id: "slope-is-a-ratio"\n    hidden: true\n    > Slope is a **ratio**, not a difference. Watch the two legs of the triangle as you slide the second point.\n    scene plane {\n      x: [-1, 5]\n      y: [-2, 12]\n      grid\n      axes\n      param b = 3 { range: [1.5, 4], step: 0.1 }\n      curve f = x^2 { color: primary, width: 3 }\n      point p = (1, 1) { color: accent }\n      point q = (b, b^2) { drag: x -> b, color: accent }\n      line sec { through: p, slope: (b^2 - 1)/(b - 1), style: dashed, color: success }\n      label at (b, 1) = "run = ${b - 1}" { color: neutral }\n      label at (0.2, 10) = "slope = ${(b^2 - 1)/(b - 1)}" { color: success }\n    }\n    numeric {\n      ask "With $b = 3$: the rise is $8$ and the run is $2$. What is the slope?"\n      answer: 4\n      ! "Divide the rise by the run, never subtract them."\n    }\n  }\n}',
  },
];
