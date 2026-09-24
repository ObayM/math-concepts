import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import SlideView from '@/components/lesson/SlideView';
import { exerciseVisible } from '@/engine/runtime/flow';

const slideOf = (body: string) =>
  lessonSchema.parse(compileLesson(`lesson "L" {\n  slide "s" {\n${body}\n  }\n}`)).slides[0];

const goalFirst = slideOf(`    scene plane {
      x: [0, 1]
      y: [0, 1]
      param h = 1 { range: [0, 1], step: 0.1 }
      slider h
    }
    goal "Shrink h" { when: h < 0.5 }
    numeric {
      ask "Where is it heading?"
      answer: 0
      after: goals
    }`);

const stepped = slideOf(`    scene plane {
      x: [0, 1]
      y: [0, 1]
      param h = 1 { range: [0, 1], step: 0.1 }
      slider h
      step "first"
      step "then shrink it" { wait: h < 0.5 }
      step "and here's the question"
    }
    quiz {
      ask "Why can we divide by h?"
      * "h isn't 0"
      - "h is 0"
      after: 3
    }`);

const view = (slide: typeof goalFirst, goalsMet: boolean[]) => (
  <SlideView
    slide={slide}
    value={null}
    checked={false}
    correct={null}
    onChange={() => {}}
    goalsMet={goalsMet}
    onScopeChange={() => {}}
  />
);

describe('exercise after goals', () => {
  it('compiles', () => {
    expect(goalFirst.exercise!.after).toBe('goals');
    expect(stepped.exercise!.after).toBe(3);
  });

  it('hides the question until the goal is met', () => {
    const { rerender } = render(view(goalFirst, [false]));
    expect(screen.queryByText('Where is it heading?')).toBeNull();
    rerender(view(goalFirst, [true]));
    expect(screen.getByText('Where is it heading?')).toBeTruthy();
  });

  it('agrees with the pure helper the player uses for its Check button', () => {
    expect(exerciseVisible(goalFirst, [false])).toBe(false);
    expect(exerciseVisible(goalFirst, [true])).toBe(true);
    expect(exerciseVisible(stepped, [], 1)).toBe(false);
    expect(exerciseVisible(stepped, [], 2)).toBe(true);
  });
});

describe('exercise after a timeline step', () => {
  it('holds the question back until its step, and a wait: step until its condition', () => {
    render(view(stepped, []));
    const play = () => screen.getByRole('button', { name: /play/i });
    expect(screen.queryByText('Why can we divide by h?')).toBeNull();
    fireEvent.click(play());
    expect(screen.getByText('then shrink it')).toBeTruthy();
    expect(play()).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.2' } });
    expect(play()).toHaveProperty('disabled', false);
    fireEvent.click(play());
    expect(screen.getByText('Why can we divide by h?')).toBeTruthy();
  });
});

describe('validation', () => {
  it('refuses after: goals with no goal', () => {
    expect(() =>
      slideOf(`    quiz {\n      ask "q"\n      * "a"\n      - "b"\n      after: goals\n    }`)
    ).toThrow(/after: goals needs a goal/);
  });

  it('refuses a step that does not exist', () => {
    expect(() =>
      slideOf(`    scene plane {
      x: [0, 1]
      y: [0, 1]
      step "one"
    }
    quiz {
      ask "q"
      * "a"
      - "b"
      after: 2
    }`)
    ).toThrow(/after: 2 is not a step; the timeline has steps 1 to 1/);
  });
});
