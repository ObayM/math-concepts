import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { compile } from '@/engine/lang';
import { Scene } from '@/engine';

// P5.39: a timeline step can carry an optional `hint`, shown behind a
// click-to-reveal button — additive alongside the existing `narrate`.

const wrap = (step: string) =>
  `scene plane {\n  x: [-3, 3]\n  y: [-3, 3]\n  param a = 1 { range: [-3, 3] }\n  curve f = a*x^2\n  ${step}\n}`;

describe('timeline step hint (compile)', () => {
  it('carries an optional hint alongside narrate', () => {
    const ir = compile(
      wrap('step "watch it stretch" { animate: { a: 3 }, hint: "bigger a stretches it" }')
    );
    expect(ir.timeline?.[0].narrate).toBe('watch it stretch');
    expect(ir.timeline?.[0].hint).toBe('bigger a stretches it');
  });

  it('a step without hint has no hint field', () => {
    const ir = compile(wrap('step "just watch" { animate: { a: 3 } }'));
    expect(ir.timeline?.[0].hint).toBeUndefined();
  });
});

describe('timeline step hint (SSR render)', () => {
  it('renders a Hint button for the current step, not the revealed text', () => {
    const ir = compile(
      wrap('step "watch it stretch" { animate: { a: 3 }, hint: "bigger a stretches it" }')
    );
    const html = renderToStaticMarkup(React.createElement(Scene, { ir }));
    expect(html).toContain('Hint');
    expect(html).not.toContain('bigger a stretches it');
  });

  it('renders no Hint button when the step has none', () => {
    const ir = compile(wrap('step "just watch" { animate: { a: 3 } }'));
    const html = renderToStaticMarkup(React.createElement(Scene, { ir }));
    expect(html).not.toContain('Hint');
  });
});
