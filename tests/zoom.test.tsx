import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { compile } from '@/engine/lang';
import { Scene } from '@/engine';

const zoomed = (z: number) =>
  compile(`scene plane {
  x: [1 - z, 1 + z]
  y: [1 - 2*z, 1 + 2*z]
  grid
  param z = ${z} { range: [0.001, 1], step: 0.001 }
  curve f = x^2
  slider z { label: "zoom" }
}`);

describe('2D zoom', () => {
  it('compiles a live view with its starting domain', () => {
    const ir = zoomed(1);
    expect(ir.space.xView).toBeTruthy();
    expect(ir.space.xDomain).toEqual([0, 2]);
    expect(ir.space.yDomain).toEqual([-1, 3]);
  });

  it('draws the ticks of the zoomed-in window', () => {
    const wide = renderToStaticMarkup(<Scene ir={zoomed(1)} />);
    const close = renderToStaticMarkup(<Scene ir={zoomed(0.01)} />);
    expect(wide).toContain('>1.4<');
    expect(close).toContain('>1.004<');
    expect(close).not.toContain('NaN');
  });

  it('refuses a window that starts out empty', () => {
    expect(() =>
      compile(`scene plane {
  x: [z, 0]
  y: [0, 1]
  param z = 1 { range: [0, 1] }
}`)
    ).toThrow(/x: starts out empty/);
  });

  it('keeps a numberline fixed', () => {
    expect(() =>
      compile(`scene numberline {
  x: [0, z]
  param z = 1 { range: [0.5, 1] }
}`)
    ).toThrow(/a numberline cannot zoom/);
  });
});
