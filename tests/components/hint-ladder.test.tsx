import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HintLadder from '@/components/lesson/HintLadder';

describe('HintLadder', () => {
  it('shows nothing but a button until asked', () => {
    render(<HintLadder hints={['first', 'second']} />);
    expect(screen.queryByText('first')).toBeNull();
    expect(screen.getByRole('button', { name: /hint/i })).toBeTruthy();
  });

  it('reveals one hint per tap and stops at the last', () => {
    render(<HintLadder hints={['first', 'second']} />);
    fireEvent.click(screen.getByRole('button', { name: /need a hint/i }));
    expect(screen.getByText('first')).toBeTruthy();
    expect(screen.queryByText('second')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /another hint/i }));
    expect(screen.getByText('second')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders nothing without hints', () => {
    const { container } = render(<HintLadder hints={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('offers no more hints once the answer is checked', () => {
    render(<HintLadder hints={['first']} disabled />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
