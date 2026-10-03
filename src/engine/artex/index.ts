import katex from 'katex';
import { texColors } from '@/engine/colors';
import { newReport, toMathML, type PNode, type Report } from './emit';

type Parse = (src: string, settings: Record<string, unknown>) => PNode[];

// katex keeps its parser internal. the version is pinned in package.json and
// tests/artex.test.ts asserts the tree shape, so an upgrade breaks loudly there
const parseTree = (katex as unknown as { __parse: Parse }).__parse;

export type ArabicMath = { html: string; fallback: boolean; report: Report };

export function parseTex(src: string): PNode[] {
  return parseTree(texColors(src), { strict: 'ignore', throwOnError: true });
}

export function arabicMath(src: string, display: boolean): ArabicMath {
  const report = newReport();
  try {
    const body = toMathML(parseTex(src), report);
    const mode = display ? ' display="block"' : '';
    return { html: `<math dir="rtl" class="artex"${mode}>${body}</math>`, fallback: false, report };
  } catch {
    const html = katex.renderToString(texColors(src), {
      throwOnError: false,
      displayMode: display,
    });
    return { html: `<span dir="ltr">${html}</span>`, fallback: true, report };
  }
}

export function collisions(report: Report): [string, string[]][] {
  return [...report.mapped]
    .filter(([, latin]) => latin.size > 1)
    .map(([ar, latin]) => [ar, [...latin].sort()]);
}

export { indicDigits, arabicLetter } from './notation';
