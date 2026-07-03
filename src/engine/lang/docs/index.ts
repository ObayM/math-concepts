import { lessonSection } from './sections/lesson';
import { exercisesSection } from './sections/exercises';
import { sceneSection } from './sections/scene';
import { objectsSection } from './sections/objects';
import { controlsSection } from './sections/controls';
import { timelineSection } from './sections/timeline';
import { logicSection } from './sections/logic';
import { expressionsSection } from './sections/expressions';

export type { DocProp, DocEntry, DocSection } from './types';

export const PRISM_DOCS = {
  tagline: 'A language for interactive math lessons.',
  intro: `Prism compiles to the IR that powers Mathly's interactive lesson engine.
The compiler runs at seed-time or on the server, and its output is validated data —
it never executes code, so it is safe to compile AI-generated source.

A Prism file is one of two things:
  • a bare "scene <type> { ... }" block — a single interactive visualization, or
  • a "lesson \\"Title\\" { ... }" block — a full lesson of composed slides.

Block structure is brace-delimited. Object/control properties go in a trailing
"{ key: value }" block whose opening "{" is on the same line as the statement.`,
  sections: [
    lessonSection,
    exercisesSection,
    sceneSection,
    objectsSection,
    controlsSection,
    timelineSection,
    logicSection,
    expressionsSection,
  ],
};

const COMPLETE_EXAMPLE = `# derivative as slope of tangent
scene plane {
  x: [-5, 5]
  y: [-5, 5]
  grid
  axes

  param t = 0 { range: [-3, 3] }
  bool show = false

  curve f = x^2 { color: primary }
  point p = (t, t^2) { drag: x -> t, color: accent }
  line tan { through: p, slope: 2*t, style: dashed, show: show }

  label at (t, t^2+0.6) = "slope = \${2*t}" { show: show }

  slider t { label: "move the point" }
  toggle show { label: "show tangent line" }

  step "here's f(x) = x²"
  step "the tangent at x has slope 2x" { set: { show: true } }
  step "drag the point and watch the slope update" { animate: { t: 3 }, dur: 2000, ease: easeInOut }
}`;

export function toAIContext(): string {
  const lines: string[] = [
    `Prism — ${PRISM_DOCS.tagline}`,
    '',
    PRISM_DOCS.intro,
    '',
    'IMPORTANT: Return ONLY valid Prism source. No markdown fences, no explanation.',
    '',
    '# LANGUAGE REFERENCE',
    '',
  ];

  for (const section of PRISM_DOCS.sections) {
    lines.push(`## ${section.title}`);
    lines.push(section.description);
    lines.push('');

    for (const entry of section.entries) {
      lines.push(`### ${entry.keyword}`);
      lines.push(`Syntax: ${entry.syntax}`);
      lines.push(entry.description);
      if (entry.props?.length) {
        lines.push('Props:');
        for (const p of entry.props) {
          lines.push(`  ${p.name} (${p.type})${p.required ? ' [required]' : ''}: ${p.description}`);
        }
      }
      if (entry.example) {
        lines.push('Example:');
        lines.push(
          entry.example
            .split('\n')
            .map((l) => '  ' + l)
            .join('\n')
        );
      }
      lines.push('');
    }
  }

  lines.push('# COMPLETE EXAMPLE');
  lines.push('');
  lines.push(COMPLETE_EXAMPLE);

  return lines.join('\n');
}
