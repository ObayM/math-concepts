import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { compile } from '@/engine/lang';
import { Scene } from '@/engine';

describe('dragging a point from the keyboard', () => {
  it('steps a snapped point with the arrow keys, faster with shift', () => {
    const ir = compile(`scene plane {
  x: [-4, 4]
  y: [-4, 4]
  param a = 0 { range: [-4, 4] }
  point p = (a, 0) { drag: x -> a, snap: 0.5, label: "move me" }
}`);
    render(<Scene ir={ir} />);
    const handle = screen.getByRole('slider', { name: 'move me' });
    expect(handle.getAttribute('tabindex')).toBe('0');
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle.getAttribute('aria-valuetext')).toBe('(0.5, 0)');
    fireEvent.keyDown(handle, { key: 'ArrowRight', shiftKey: true });
    expect(handle.getAttribute('aria-valuetext')).toBe('(3, 0)');
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(handle.getAttribute('aria-valuetext')).toBe('(3, 0)');
  });

  it('moves a free xy point on both axes', () => {
    const ir = compile(`scene plane {
  x: [-4, 4]
  y: [-4, 4]
  param a = 0 { range: [-4, 4] }
  param b = 0 { range: [-4, 4] }
  point p = (a, b) { drag: xy -> (a, b), snap: 1 }
}`);
    render(<Scene ir={ir} />);
    const handle = screen.getByRole('slider', { name: 'p' });
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(handle.getAttribute('aria-valuetext')).toBe('(-1, 1)');
  });

  it('walks a point round a circle', () => {
    const ir = compile(`scene plane {
  x: [-2, 2]
  y: [-2, 2]
  param t = 0 { range: [-3.14, 3.14] }
  circle c = (0, 0) { r: 1 }
  point p = (cos(t), sin(t)) { drag: along(c) -> t }
}`);
    render(<Scene ir={ir} />);
    const handle = screen.getByRole('slider', { name: 'p' });
    for (let i = 0; i < 18; i++) fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle.getAttribute('aria-valuetext')).toBe('(0, 1)');
  });
});
