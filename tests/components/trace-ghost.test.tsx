import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { compile } from '@/engine/lang';
import { Scene } from '@/engine';

describe('ghost', () => {
  const ir = compile(`scene plane {
  x: [-3, 3]
  y: [-1, 9]
  param a = 1 { range: [0.5, 3] }
  curve f = a * x^2 { ghost: { a: [0.5, 2, 3] } }
}`);

  it('draws faint copies of the object for each value', () => {
    const html = renderToStaticMarkup(<Scene ir={ir} />);
    expect(html.match(/opacity="0.28"/g)?.length).toBe(3);
    expect(html).toContain('data-obj="f"');
  });

  it('refuses a ghost over a param that does not exist', () => {
    expect(() =>
      compile(`scene plane {
  x: [0, 1]
  y: [0, 1]
  param a = 1 { range: [0, 2] }
  curve f = a * x { ghost: { b: [1, 2] } }
}`)
    ).toThrow(/ghost: "b" is not a param here/);
  });
});

describe('trace', () => {
  it('leaves the path a point has travelled', () => {
    const ir = compile(`scene plane {
  x: [-2, 2]
  y: [-2, 2]
  param t = 0 { range: [0, 6.28], step: 0.01 }
  point p = (cos(t), sin(t)) { trace }
  slider t
}`);
    const { container } = render(<Scene ir={ir} />);
    const slider = screen.getByRole('slider');
    for (const v of ['0.5', '1', '1.5', '2']) fireEvent.change(slider, { target: { value: v } });
    const trail = container.querySelector('polyline');
    expect(trail).toBeTruthy();
    expect(trail!.getAttribute('points')!.split(' ').length).toBeGreaterThanOrEqual(4);
  });
});
