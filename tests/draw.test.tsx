import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { compile } from '@/engine/lang';
import { Scene } from '@/engine';

const scene = (k: number) =>
  compile(`scene plane {
  x: [0, 4]
  y: [0, 16]
  param k = ${k} { range: [0, 1] }
  curve f = x^2 { draw: k }
  line l = (0, 0) -> (4, 0) { draw: k }
  polygon tri = [(1, 1), (3, 1), (2, 3)] { draw: k }
  area a = x { from: 0, to: 4, draw: k }
  step "draw it" { animate: { k: 1 }, dur: 1500 }
}`);

const html = (k: number) => renderToStaticMarkup(<Scene ir={scene(k)} />);
const curvePoints = (out: string) => (out.match(/d=" M[^"]*"/)?.[0].match(/ L /g) ?? []).length;

describe('draw:', () => {
  it('draws nothing at 0', () => {
    const out = html(0);
    expect(out).not.toContain('data-obj="f"');
    expect(out).not.toContain('data-obj="tri"');
  });

  it('draws part of each object partway through', () => {
    const half = html(0.5);
    const full = html(1);
    expect(curvePoints(half)).toBeGreaterThan(0);
    expect(curvePoints(half)).toBeLessThan(curvePoints(full));
    expect(half).toContain('<polyline');
    expect(full).not.toContain('<polyline');
    expect(half).not.toContain('NaN');
  });

  it('draws a line segment from its start', () => {
    const out = html(0.5);
    const line = out.match(/<g[^>]*data-obj="l"[^>]*><line[^>]*>/)![0];
    const x2 = Number(line.match(/x2="([\d.]+)"/)![1]);
    const x1 = Number(line.match(/x1="([\d.]+)"/)![1]);
    const fullLine = html(1).match(/<g[^>]*data-obj="l"[^>]*><line[^>]*>/)![0];
    const fx2 = Number(fullLine.match(/x2="([\d.]+)"/)![1]);
    expect(x2 - x1).toBeCloseTo((fx2 - x1) / 2, 0);
  });
});
