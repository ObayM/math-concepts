import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import MovesExercise from '@/components/lesson/exercises/MovesExercise';

const slide = lessonSchema.parse(
  compileLesson(`lesson "L" {
  slide "s" {
    moves {
      ask "Solve"
      from "2x + 3 = 11"
      move "2x = 8" {
        * "Subtract 3"
        - "Divide by 2" { why: "Get rid of the + 3 first." }
      }
    }
  }
}`)
).slides[0];

describe('MovesExercise', () => {
  it('records a wrong pick, shows its why, and keeps the move open', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MovesExercise slide={slide} value={[[]]} checked={false} onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Divide by 2' }));
    expect(onChange).toHaveBeenLastCalledWith([[1]]);
    rerender(<MovesExercise slide={slide} value={[[1]]} checked={false} onChange={onChange} />);
    expect(screen.getByText('Get rid of the + 3 first.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Divide by 2' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Subtract 3' }));
    expect(onChange).toHaveBeenLastCalledWith([[1, 0]]);
  });

  it('shows the next line once the right move is picked', () => {
    render(<MovesExercise slide={slide} value={[[0]]} checked={false} onChange={() => {}} />);
    expect(screen.getByText('2x = 8')).toBeTruthy();
    expect(screen.getByText(/Every move right first time/)).toBeTruthy();
  });
});
