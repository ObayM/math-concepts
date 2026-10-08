import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import NumericExercise from '@/components/lesson/exercises/NumericExercise';

const slide = lessonSchema.parse(
  compileLesson(`lesson "L" {
  slide "s" {
    numeric {
      ask "How fast?"
      unit: "m/s"
      answer: 3
    }
  }
}`)
).slides[0];

describe('a numeric answer with a unit on a right to left page', () => {
  it('keeps the input and its unit in one left to right island', () => {
    render(
      <div dir="rtl">
        <NumericExercise
          slide={slide}
          value=""
          checked={false}
          correct={null}
          onChange={() => {}}
        />
      </div>
    );
    const island = screen.getByRole('textbox').closest('[dir]');
    expect(island?.getAttribute('dir')).toBe('ltr');
    expect(island?.contains(screen.getByText('m/s'))).toBe(true);
  });
});
