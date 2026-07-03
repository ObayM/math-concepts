import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';
import { Scene } from '@/engine';

// smoke test: server-render every scene in the flagship lesson to SVG. this
// exercises the v2 IR → runtime path (evalExpr over every primitive) and would
// catch a render crash that tsc can't. drag/effects don't run under SSR, but
// the initial render evaluates all objects, which is what we care about.

const quadratics = compileLesson(
  readFileSync(
    fileURLToPath(new URL('../prisma/lessons/quadratics-1.prism', import.meta.url)),
    'utf8'
  )
);

describe('v2 scene render (SSR smoke)', () => {
  const sceneSlides = quadratics.slides.filter((s) => s.scene);

  it('has scenes to render', () => {
    expect(sceneSlides.length).toBeGreaterThan(0);
  });

  for (const slide of sceneSlides) {
    it(`renders "${slide.title}" to SVG without throwing`, () => {
      const html = renderToStaticMarkup(React.createElement(Scene, { ir: slide.scene! }));
      expect(html).toContain('<svg');
      // no unresolved template markers or NaN coords leaking into output
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('${');
    });
  }
});
