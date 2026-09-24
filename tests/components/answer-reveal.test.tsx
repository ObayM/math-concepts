import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import NumericExercise from '@/components/lesson/exercises/NumericExercise';
import QuizExercise from '@/components/lesson/exercises/QuizExercise';

const slideOf = (body: string) =>
  lessonSchema.parse(compileLesson(`lesson "L" {\n  slide "s" {\n${body}\n  }\n}`)).slides[0];

const numeric = slideOf(`    numeric {
      ask "What is 6 times 7?"
      answer: 42
      ! "Six sevens make 42."
    }`);

describe('a wrong numeric answer', () => {
  it('names the answer once the student is done', () => {
    render(
      <NumericExercise slide={numeric} value="41" checked correct={false} onChange={() => {}} />
    );
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('Six sevens make 42.')).toBeTruthy();
  });

  it('keeps it hidden while a retry detour is still to come', () => {
    render(
      <NumericExercise
        slide={numeric}
        value="41"
        checked
        correct={false}
        revealAnswer={false}
        onChange={() => {}}
      />
    );
    expect(screen.queryByText(/42/)).toBeNull();
    expect(screen.getByText(/not quite/i)).toBeTruthy();
  });
});

describe('a wrong quiz answer before a retry', () => {
  const quiz = slideOf(`    quiz {
      ask "Pick one"
      * "right"
      - "wrong"
    }`);

  it('does not light up the right option', () => {
    render(
      <QuizExercise slide={quiz} value={1} checked revealAnswer={false} onChange={() => {}} />
    );
    const right = screen.getByRole('radio', { name: 'right' });
    expect(right.className).not.toMatch(/success/);
  });
});
