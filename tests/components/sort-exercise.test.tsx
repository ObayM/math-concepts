import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import SortExercise from '@/components/lesson/exercises/SortExercise';
import { exercises } from '@/components/lesson/exercises';

const LESSON = `lesson "L" {
  slide "s" {
    sort {
      ask "Which rule?"
      bin "Product": ["x sin x", "e ln x"]
      bin "Chain": ["(x+1)^3"]
    }
  }
}`;

const slide = lessonSchema.parse(compileLesson(LESSON)).slides[0];

function setup(value: (number | null)[] | null, checked = false) {
  const onChange = vi.fn();
  render(<SortExercise slide={slide} value={value} checked={checked} onChange={onChange} />);
  return onChange;
}

const binButton = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label}`) });

describe('SortExercise tap-to-place', () => {
  it('places an armed tray item into the bin you pick', () => {
    const onChange = setup(exercises.sort.initial(slide));
    fireEvent.click(screen.getByRole('button', { name: 'x sin x' }));
    fireEvent.click(binButton('Chain'));
    expect(onChange).toHaveBeenCalledWith([1, null, null]);
  });

  it('does nothing when a bin is picked with no item armed', () => {
    const onChange = setup(exercises.sort.initial(slide));
    fireEvent.click(binButton('Product'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('takes an item back out of its bin', () => {
    const onChange = setup([0, null, null]);
    fireEvent.click(screen.getByRole('button', { name: /x sin x in Product/ }));
    expect(onChange).toHaveBeenCalledWith([null, null, null]);
  });

  it('keeps every item reachable by keyboard as a real button', () => {
    setup(exercises.sort.initial(slide));
    for (const text of ['x sin x', 'e ln x', '(x+1)^3']) {
      expect(screen.getByRole('button', { name: text })).toBeTruthy();
    }
  });

  it('locks every control once the answer is checked', () => {
    setup([0, 0, 1], true);
    expect(screen.getByRole('button', { name: /x sin x in Product/ })).toHaveProperty(
      'disabled',
      true
    );
    expect(binButton('Product')).toHaveProperty('disabled', true);
  });

  it('recovers from a value left behind by another slide', () => {
    const onChange = setup(null);
    fireEvent.click(screen.getByRole('button', { name: 'e ln x' }));
    fireEvent.click(binButton('Product'));
    expect(onChange).toHaveBeenCalledWith([null, 0, null]);
  });
});
