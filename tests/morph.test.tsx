import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { compile } from '@/engine/lang';
import { Scene } from '@/engine';

const scene = (m: number) =>
  compile(`scene plane {
  x: [0, 10]
  y: [0, 10]
  param m = ${m} { range: [0, 1], step: 0.1 }
  label word at (1, 5) = "gap = 0.01"
  label sym at (6, 5) = "h = 0.01"
  morph word -> sym { by: m }
  circle c = (5, 5) { r: 1, alpha: 1 - m }
  step "the words" { set: { m: 0 } }
  step "become symbols" { animate: { m: 1 } }
}`);

const html = (m: number) => renderToStaticMarkup(<Scene ir={scene(m)} />);

describe('morph', () => {
  it("starts as the word, in the word's place", () => {
    const out = html(0);
    expect(out).toContain('gap = 0.01');
    expect(out).not.toContain('h = 0.01');
  });

  it("ends as the symbol, in the symbol's place", () => {
    const out = html(1);
    expect(out).toContain('h = 0.01');
    expect(out).not.toContain('gap = 0.01');
  });

  it('crossfades both halfway, sharing one position', () => {
    const out = html(0.5);
    expect(out).toContain('gap = 0.01');
    expect(out).toContain('h = 0.01');
    expect(out.match(/opacity="0.5"/g)?.length).toBeGreaterThanOrEqual(2);
    const ir = scene(0.5);
    const word = ir.objects.find((o) => o.id === 'word')!;
    const sym = ir.objects.find((o) => o.id === 'sym')!;
    expect(JSON.stringify((word as { x: unknown }).x)).toBe(
      JSON.stringify((sym as { x: unknown }).x)
    );
  });

  it('fades any object with alpha:', () => {
    expect(html(1)).not.toContain('<circle');
  });

  it('refuses a morph to an object that is not there', () => {
    expect(() =>
      compile(`scene plane {
  x: [0, 1]
  y: [0, 1]
  param m = 0 { range: [0, 1] }
  label word at (0, 0) = "a"
  morph word -> sim { by: m }
}`)
    ).toThrow(/morph: no object "sim"/);
  });

  it('needs by:', () => {
    expect(() =>
      compile(`scene plane {
  x: [0, 1]
  y: [0, 1]
  label a at (0, 0) = "a"
  label b at (0, 0) = "b"
  morph a -> b
}`)
    ).toThrow(/morph needs by:/);
  });
});
