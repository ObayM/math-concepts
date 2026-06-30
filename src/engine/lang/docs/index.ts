import { sceneSection } from './sections/scene';
import { objectsSection } from './sections/objects';
import { controlsSection } from './sections/controls';
import { timelineSection } from './sections/timeline';
import { logicSection } from './sections/logic';
import { expressionsSection } from './sections/expressions';

export type { DocProp, DocEntry, DocSection } from './types';

export const PRISM_DOCS = {
  tagline: 'A language for interactive math scenes.',
  intro: `Prism compiles to the Scene IR that powers Mathly's interactive lesson engine.
Write a Prism scene and the runtime renders it as a live, manipulable visualization.
The compiler runs at seed-time or on the server — never in the browser.`,
  sections: [
    sceneSection,
    objectsSection,
    controlsSection,
    timelineSection,
    logicSection,
    expressionsSection,
  ],
};

const COMPLETE_EXAMPLE = `# derivative as slope of tangent
scene, plane, x:[-5,5], y:[-5,5], grid, axes

param t = 0, range:[-3,3]
bool show = false

curve f = x^2, color:"primary"
point p = (t, t^2), drag:x->t, color:"accent"
line tan, through:p, slope:2*t, style:dashed, show:show

label at (t, t^2+0.6), "slope = \${2*t}", show:show

slider t, label:"move the point"
toggle show, label:"show tangent line"

step "here's f(x) = x²"
step "the tangent at x has slope 2x", set:{show:true}
step "drag the point and watch the slope update", animate:{t:3}, dur:2000, ease:easeInOut`;

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
