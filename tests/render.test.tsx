import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { compile, compileLesson } from '@/engine/lang';
import { Scene } from '@/engine';

// smoke test: server-render every scene in the flagship lesson to SVG. this
// exercises the v2 IR → runtime path (evalExpr over every primitive) and would
// catch a render crash that tsc can't. drag/effects don't run under SSR, but
// the initial render evaluates all objects, which is what we care about.

const differentiation1 = compileLesson(
  readFileSync(
    fileURLToPath(new URL('../prisma/lessons/differentiation-1.prism', import.meta.url)),
    'utf8'
  )
);

describe('v2 scene render (SSR smoke)', () => {
  const sceneSlides = differentiation1.slides.filter((s) => s.scene);

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

describe('hotspot tap layer + marker render to clean SVG (P3 step 24)', () => {
  const ir = compile(
    'scene plane {\n  x: [-5, 5]\n  y: [-5, 5]\n  grid\n  axes\n  curve f = x^2\n}'
  );

  it('renders the tap-catcher rect when onTap is passed', () => {
    const html = renderToStaticMarkup(React.createElement(Scene, { ir, onTap: () => {} }));
    expect(html).toContain('crosshair');
    expect(html).not.toContain('NaN');
  });

  it('renders a marker circle at the tapped point', () => {
    const html = renderToStaticMarkup(
      React.createElement(Scene, { ir, marker: { x: 2, y: 4, correct: true } })
    );
    expect(html).toContain('<circle');
    expect(html).not.toContain('NaN');
  });

  it('renders neither when onTap/marker are absent (no regression)', () => {
    const html = renderToStaticMarkup(React.createElement(Scene, { ir }));
    expect(html).not.toContain('crosshair');
  });
});

describe('reveal phase gates object visibility (P3 step 25)', () => {
  const ir = compile(
    'scene plane {\n  x: [-5, 5]\n  y: [-5, 5]\n  curve guess = 0 { color: neutral }\n  reveal {\n    curve f = (x-1)^2 - 3 { color: primary, width: 3 }\n  }\n}'
  );

  it('hides the revealed curve until revealed=true', () => {
    const html = renderToStaticMarkup(React.createElement(Scene, { ir, revealed: false }));
    expect((html.match(/<path/g) ?? []).length).toBe(1);
  });

  it('shows both curves once revealed', () => {
    const html = renderToStaticMarkup(React.createElement(Scene, { ir, revealed: true }));
    expect((html.match(/<path/g) ?? []).length).toBe(2);
  });

  it('defaults to hidden when revealed is omitted', () => {
    const html = renderToStaticMarkup(React.createElement(Scene, { ir }));
    expect((html.match(/<path/g) ?? []).length).toBe(1);
  });
});

describe('InputLayer draw capture renders to clean SVG (P3 step 26)', () => {
  const ir = compile(
    'scene plane {\n  x: [-5, 5]\n  y: [-5, 5]\n  grid\n  axes\n  curve f = x^2\n}'
  );

  it('renders the capture rect for curve mode when not disabled', () => {
    const html = renderToStaticMarkup(
      React.createElement(Scene, {
        ir,
        inputLayer: { mode: 'curve', value: null, onChange: () => {} },
      })
    );
    expect(html).toContain('crosshair');
    expect(html).not.toContain('NaN');
  });

  it('renders a committed curve as a polyline', () => {
    const html = renderToStaticMarkup(
      React.createElement(Scene, {
        ir,
        inputLayer: {
          mode: 'curve',
          value: [
            [-2, 4],
            [0, 0],
            [2, 4],
          ],
          onChange: () => {},
        },
      })
    );
    expect(html).toContain('<polyline');
    expect(html).not.toContain('NaN');
  });

  it('renders committed points as circles, not a polyline', () => {
    const html = renderToStaticMarkup(
      React.createElement(Scene, {
        ir,
        inputLayer: {
          mode: 'points',
          value: [
            [-1, 1],
            [1, 1],
          ],
          onChange: () => {},
        },
      })
    );
    expect(html).toContain('<circle');
    expect(html).not.toContain('<polyline');
  });

  it('suppresses the capture rect once disabled, but keeps the drawn value visible', () => {
    const html = renderToStaticMarkup(
      React.createElement(Scene, {
        ir,
        inputLayer: {
          mode: 'curve',
          value: [
            [-2, 4],
            [2, 4],
          ],
          onChange: () => {},
          disabled: true,
        },
      })
    );
    expect(html).not.toContain('crosshair');
    expect(html).toContain('<polyline');
  });

  it('renders nothing extra when inputLayer is absent (no regression)', () => {
    const html = renderToStaticMarkup(React.createElement(Scene, { ir }));
    expect(html).not.toContain('crosshair');
    expect(html).not.toContain('<polyline');
  });
});

describe('P2.17 primitives render to clean SVG', () => {
  const cases: Record<string, string> = {
    'parametric curve':
      'scene plane {\n  x: [-2, 2]\n  y: [-2, 2]\n  curve c = (cos(t), sin(t)) { t: [0, 2*PI] }\n}',
    'area under a curve':
      'scene plane {\n  x: [-3, 3]\n  y: [-1, 9]\n  curve f = x^2\n  area a = x^2 { from: 0, to: 2, opacity: 0.2 }\n}',
    'area between two curves':
      'scene plane {\n  x: [-3, 3]\n  y: [-3, 9]\n  area band = x^2 { lower: -1 }\n}',
  };
  for (const [name, src] of Object.entries(cases)) {
    it(name, () => {
      const ir = compile(src);
      const html = renderToStaticMarkup(React.createElement(Scene, { ir }));
      expect(html).toContain('<path');
      expect(html).not.toContain('NaN');
    });
  }
});

describe('P5.37 image object renders to clean SVG', () => {
  const imgSrc =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const ir = compile(
    `scene plane {\n  x: [-5, 5]\n  y: [-5, 5]\n  image logo = (-1, -1) { w: 2, h: 2, src: "${imgSrc}", alt: "a small placeholder square" }\n}`
  );

  it('renders an <image> with the accessible alt text and no NaN coords', () => {
    const html = renderToStaticMarkup(React.createElement(Scene, { ir }));
    expect(html).toContain('<image');
    expect(html).toContain('aria-label="a small placeholder square"');
    expect(html).not.toContain('NaN');
  });
});
