import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import GoalBanner, { GOAL_STUCK_MS } from '@/components/lesson/GoalBanner';

const goals = [{ prompt: 'Make the gap small', hint: 'Drag the slider left', when: 0 }];

afterEach(() => vi.useRealTimers());

describe('goal hints', () => {
  it('stay hidden on load and appear once the student has been stuck a while', () => {
    vi.useFakeTimers();
    render(<GoalBanner goals={goals} goalsMet={[false]} />);
    expect(screen.queryByText('Drag the slider left')).toBeNull();
    act(() => vi.advanceTimersByTime(GOAL_STUCK_MS - 1));
    expect(screen.queryByText('Drag the slider left')).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText('Drag the slider left')).toBeTruthy();
  });

  it('never show for a goal that is already met', () => {
    vi.useFakeTimers();
    render(<GoalBanner goals={goals} goalsMet={[true]} />);
    act(() => vi.advanceTimersByTime(GOAL_STUCK_MS));
    expect(screen.queryByText('Drag the slider left')).toBeNull();
  });
});
