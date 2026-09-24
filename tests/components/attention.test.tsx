import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { compile, compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import { Scene } from '@/engine';
import SlideView from '@/components/lesson/SlideView';

const ir = compile(`scene plane {
  x: [0, 4]
  y: [0, 4]
  point a = (1, 1)
  point b = (2, 2)
  label c at (3, 3) = "c"
  step "look at a" { indicate: a }
  step "only b matters" { focus: [b] }
  step "this one" { surround: c }
}`);

const attn = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-obj="${id}"]`)?.getAttribute('data-attention') ?? null;

describe('directing attention', () => {
  it('compiles the ids onto each step', () => {
    expect(ir.timeline!.map((s) => [s.indicate, s.focus, s.surround])).toEqual([
      [['a'], undefined, undefined],
      [undefined, ['b'], undefined],
      [undefined, undefined, ['c']],
    ]);
  });

  it('pulses, then dims everything but the focus, then rings an object', () => {
    const { container } = render(<Scene ir={ir} />);
    expect(attn(container, 'a')).toBe('indicate');
    expect(attn(container, 'b')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(attn(container, 'a')).toBe('dim');
    expect(attn(container, 'b')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(attn(container, 'a')).toBeNull();
    expect(container.querySelector('rect[stroke-dasharray="6 5"]')).toBeTruthy();
  });

  it('refuses an id that is not in the scene', () => {
    expect(() =>
      compile(`scene plane {
  x: [0, 1]
  y: [0, 1]
  point a = (0, 0)
  step "x" { indicate: aa }
}`)
    ).toThrow(/indicate: no object "aa"/);
  });
});

describe('hovering a coloured word', () => {
  const slide = lessonSchema.parse(
    compileLesson(`lesson "L" {
  role gap = primary
  slide "s" {
    > Watch the [gap]{gap}.
    scene plane {
      x: [0, 2]
      y: [0, 2]
      line run = (0, 0) -> (1, 0) { color: gap }
      point p = (1, 1)
    }
    quiz {
      ask "q"
      * "a"
      - "b"
    }
  }
}`)
  ).slides[0];

  it('pulses the object playing that role', () => {
    const { container } = render(
      <SlideView
        slide={slide}
        value={null}
        checked={false}
        correct={null}
        onChange={() => {}}
        goalsMet={[]}
        onScopeChange={() => {}}
      />
    );
    const word = container.querySelector('[data-role="gap"]')!;
    fireEvent.pointerEnter(word);
    expect(attn(container, 'run')).toBe('indicate');
    expect(attn(container, 'p')).toBeNull();
    fireEvent.pointerLeave(word);
    expect(attn(container, 'run')).toBeNull();
  });
});
