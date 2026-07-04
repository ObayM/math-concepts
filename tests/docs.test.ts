import { describe, it, expect } from 'vitest';
import { PRISM_DOCS, toAIContext } from '@/engine/lang/docs';

// every construct the parser recognizes must be documented. keep this list in
// sync with the parser's keyword surface — if you add a keyword and forget to
// document it, this test fails.
const GRAMMAR_KEYWORDS = [
  // lesson level
  'lesson',
  'slide',
  '>',
  'goal',
  'quiz',
  'numeric',
  'build',
  'hotspot',
  'sketch',
  'match',
  // scene + state
  'scene',
  'param',
  'bool',
  'choice',
  // objects
  'curve',
  'area',
  'point',
  'line',
  'label',
  'rect',
  'circle',
  'polygon',
  'vector',
  'arc',
  // controls
  'slider',
  'toggle',
  'stepper',
  'picker',
  'button',
  // timeline
  'step',
  // logic
  'for',
  'repeat',
  'if',
  'reveal',
  'let',
  'def',
];

describe('docs completeness', () => {
  const documented = new Set(PRISM_DOCS.sections.flatMap((s) => s.entries.map((e) => e.keyword)));

  for (const kw of GRAMMAR_KEYWORDS) {
    it(`documents "${kw}"`, () => {
      expect(documented.has(kw)).toBe(true);
    });
  }

  it('every entry has a syntax and description', () => {
    for (const s of PRISM_DOCS.sections) {
      for (const e of s.entries) {
        expect(e.syntax, `${s.id}/${e.keyword} syntax`).toBeTruthy();
        expect(e.description, `${s.id}/${e.keyword} description`).toBeTruthy();
      }
    }
  });
});

describe('toAIContext', () => {
  const ctx = toAIContext();

  it('includes the lesson + exercise grammar so the model can author lessons', () => {
    expect(ctx).toContain('lesson');
    expect(ctx).toContain('slide');
    expect(ctx).toContain('quiz');
    expect(ctx).toContain('build');
  });

  it('tells the model to return only source', () => {
    expect(ctx).toContain('ONLY');
  });

  it('is a reasonable size (not empty, not runaway)', () => {
    expect(ctx.length).toBeGreaterThan(1000);
    expect(ctx.length).toBeLessThan(40000);
  });
});
