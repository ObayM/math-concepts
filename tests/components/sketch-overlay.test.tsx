import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import SlideView from '@/components/lesson/SlideView';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';

const slideOf = (flag: string) =>
  lessonSchema.parse(
    compileLesson(`lesson "L" {
  slide "s" {
    scene plane {
      x: [-3, 3]
      y: [-2, 6]
    }
    sketch curve {
      ask "Draw y = x^2."
      follows: x^2
      over: [-2, 2]
      ${flag}
      tol: 0.5
    }
  }
}`)
  ).slides[0];

const flat: [number, number][] = [
  [-2, 0],
  [0, 0],
  [2, 0],
];

const view = (props: Partial<React.ComponentProps<typeof SlideView>> = {}, flag = 'overlay') =>
  render(
    <SlideView
      slide={slideOf(flag)}
      value={flat}
      checked
      correct={false}
      onChange={() => {}}
      goalsMet={[]}
      onScopeChange={() => {}}
      {...props}
    />
  );

describe('sketch overlay', () => {
  it('draws the real curve over the stroke and shades the gap once checked', () => {
    const { container } = view();
    const truth = container.querySelector('[data-overlay="truth"] path');
    expect(truth).toBeTruthy();
    expect(container.querySelector('[data-overlay="gap"] polygon[data-off="true"]')).toBeTruthy();

    const layers = Array.from(container.querySelectorAll('[data-overlay], polyline'))
      .filter((el) => el.matches('[data-overlay]') || !el.closest('[data-overlay]'))
      .map((el) => el.getAttribute('data-overlay') ?? 'stroke');
    expect(layers).toEqual(['gap', 'stroke', 'truth']);
    expect(truth!.closest('[dir="ltr"]')).toBeTruthy();

    expect(screen.getByText(/within reach of the real curve for \d+% of it/)).toBeTruthy();
  });

  it('keeps it hidden until the check', () => {
    const { container } = view({ checked: false, correct: null });
    expect(container.querySelector('[data-overlay]')).toBeNull();
    expect(screen.queryByText(/within reach/)).toBeNull();
  });

  it('keeps it hidden while a retry detour is still to come', () => {
    const { container } = view({ revealAnswer: false });
    expect(container.querySelector('[data-overlay]')).toBeNull();
  });

  it('stays off without the flag', () => {
    const { container } = view({}, '');
    expect(container.querySelector('[data-overlay]')).toBeNull();
  });

  it('says so in arabic too, with western digits', () => {
    render(
      <LocaleProvider lang="ar">
        <div dir="rtl">
          <SlideView
            slide={slideOf('overlay')}
            value={flat}
            checked
            correct={false}
            onChange={() => {}}
            goalsMet={[]}
            onScopeChange={() => {}}
          />
        </div>
      </LocaleProvider>
    );
    expect(screen.getByText(/قريبة من المنحنى الحقيقي في [0-9]+%/)).toBeTruthy();
  });

  it('calls it when the sketch never strayed', () => {
    const hugging: [number, number][] = [];
    for (let x = -2; x <= 2; x += 0.25) hugging.push([x, x * x]);
    view({ value: hugging, correct: true });
    expect(screen.getByText(/the whole way/)).toBeTruthy();
  });
});
