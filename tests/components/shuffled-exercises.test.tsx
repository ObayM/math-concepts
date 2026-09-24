import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import QuizExercise from '@/components/lesson/exercises/QuizExercise';
import OrderExercise from '@/components/lesson/exercises/OrderExercise';
import BuildExercise from '@/components/lesson/exercises/BuildExercise';
import { exercises } from '@/components/lesson/exercises';
import { shuffledOrder } from '@/components/lesson/exercises/shuffle';

const slideOf = (body: string) =>
  lessonSchema.parse(compileLesson(`lesson "L" {\n  slide "s" {\n${body}\n  }\n}`)).slides[0];

describe('shuffledOrder', () => {
  it('is a permutation that never leaves the declared order in place', () => {
    for (let seed = 1; seed < 200; seed++) {
      const order = shuffledOrder(3, seed);
      expect([...order].sort()).toEqual([0, 1, 2]);
      expect(order).not.toEqual([0, 1, 2]);
    }
  });

  it('is stable for a seed', () => {
    expect(shuffledOrder(5, 42)).toEqual(shuffledOrder(5, 42));
  });
});

describe('quiz', () => {
  const slide = slideOf(`    quiz {
      ask "Pick one"
      * "right"
      - "wrong a"
      - "wrong b"
    }`);

  it('does not put the options on screen in source order', () => {
    render(<QuizExercise slide={slide} value={null} checked={false} onChange={() => {}} />);
    const shown = screen.getAllByRole('radio').map((r) => r.textContent);
    expect(shown).not.toEqual(['right', 'wrong a', 'wrong b']);
  });

  it('still reports the source index, so grading is unchanged', () => {
    const onChange = vi.fn();
    render(<QuizExercise slide={slide} value={null} checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'right' }));
    expect(onChange).toHaveBeenCalledWith(0);
    expect(exercises.quiz.check(slide, 0)).toBe(true);
  });
});

describe('order', () => {
  const slide = slideOf(`    order {
      ask "Sort them"
      item "one"
      item "two"
      item "three"
    }`);

  it('does not deal the tray in the correct order', () => {
    render(<OrderExercise slide={slide} value={[]} checked={false} onChange={() => {}} />);
    const tray = screen.getByRole('group');
    const shown = [...tray.querySelectorAll('button')].map((b) => b.textContent);
    expect(shown).not.toEqual(['one', 'two', 'three']);
  });

  it('places by bank index, whatever the tray order', () => {
    const onChange = vi.fn();
    render(<OrderExercise slide={slide} value={[]} checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'two' }));
    expect(onChange).toHaveBeenCalledWith([1]);
  });
});

describe('build', () => {
  const slide = slideOf(`    build {
      ask "Build it"
      bank: ["a", "b", "c"]
      answer: ["a", "b", "c"]
    }`);

  it('does not deal the bank in answer order', () => {
    render(
      <BuildExercise slide={slide} value={[]} checked={false} correct={null} onChange={() => {}} />
    );
    const shown = [...document.querySelectorAll('[data-token]')].map((b) =>
      b.getAttribute('data-token')
    );
    expect(shown).not.toEqual(['a', 'b', 'c']);
    expect([...shown].sort()).toEqual(['a', 'b', 'c']);
  });
});
