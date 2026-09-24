import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import GoalBanner, { GOAL_STUCK_MS } from '@/components/lesson/GoalBanner';
import SlideView from '@/components/lesson/SlideView';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';

afterEach(() => vi.useRealTimers());

const goal = {
  prompt: 'Shrink the gap',
  when: { k: 'bool', v: false },
  hints: ['Watch the readout', 'Try 0.1, then 0.01'],
  showme: { set: { h: 0.001 } },
};

const stuck = () => act(() => vi.advanceTimersByTime(GOAL_STUCK_MS));

describe('goal hint ladder', () => {
  it('starts with the first hint once stuck, and escalates on request', () => {
    vi.useFakeTimers();
    render(<GoalBanner goals={[goal]} goalsMet={[false]} onShowMe={() => {}} />);
    stuck();
    expect(screen.getByText('Watch the readout')).toBeTruthy();
    expect(screen.queryByText('Try 0.1, then 0.01')).toBeNull();
    expect(screen.queryByRole('button', { name: /show me/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /another hint/i }));
    expect(screen.getByText('Try 0.1, then 0.01')).toBeTruthy();
  });

  it('offers show me only after the last hint, and marks the goal as helped', () => {
    vi.useFakeTimers();
    const onShowMe = vi.fn();
    const { rerender } = render(
      <GoalBanner goals={[goal]} goalsMet={[false]} onShowMe={onShowMe} />
    );
    stuck();
    fireEvent.click(screen.getByRole('button', { name: /another hint/i }));
    fireEvent.click(screen.getByRole('button', { name: /show me/i }));
    expect(onShowMe).toHaveBeenCalledWith(0);
    rerender(<GoalBanner goals={[goal]} goalsMet={[true]} onShowMe={onShowMe} />);
    expect(screen.getByText(/we showed you/i)).toBeTruthy();
  });
});

describe('goal show me in a slide', () => {
  const slide = lessonSchema.parse(
    compileLesson(`lesson "L" {
  slide "s" {
    scene plane {
      x: [0, 1]
      y: [0, 1]
      param h = 1 { range: [0, 1], step: 0.001 }
      slider h
    }
    goal "Get h below 0.01" {
      when: h < 0.01
      hints: ["Drag the slider left"]
      showme: { h: 0.001 }
      dur: 0
    }
  }
}`)
  ).slides[0];

  it('compiles the ladder and the animation', () => {
    expect(slide.goals![0].hints).toEqual(['Drag the slider left']);
    expect(slide.goals![0].showme).toEqual({ set: { h: 0.001 }, duration: 0 });
  });

  it('drives the scene to the goal when show me is pressed', () => {
    vi.useFakeTimers();
    const scopes: Record<string, unknown>[] = [];
    render(
      <SlideView
        slide={slide}
        value={null}
        checked={false}
        correct={null}
        onChange={() => {}}
        goalsMet={[false]}
        onScopeChange={(s: Record<string, unknown>) => scopes.push(s)}
      />
    );
    stuck();
    fireEvent.click(screen.getByRole('button', { name: /show me/i }));
    act(() => vi.advanceTimersByTime(100));
    expect(scopes.some((s) => (s.h as number) < 0.01)).toBe(true);
  });
});
