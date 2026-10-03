import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import MiniPlayer from '@/components/prism/MiniPlayer';

const lesson = lessonSchema.parse(
  compileLesson(`lesson "L" {
  slide "pair" {
    match {
      ask "pair them"
      pair "$1$" -> "one"
      pair "$2$" -> "two"
    }
  }
  slide "solve" {
    moves {
      ask "Solve"
      from "2x + 3 = 11"
      move "2x = 8" {
        * "Subtract 3"
        - "Divide by 2"
      }
    }
  }
}`)
);

describe('MiniPlayer', () => {
  it('never hands one slide the answer state of the slide before it', () => {
    const { container } = render(<MiniPlayer lesson={lesson} />);
    fireEvent.click(container.querySelectorAll('.mini-player-tab')[1]);
    expect(screen.getByRole('button', { name: 'Subtract 3' })).toBeTruthy();
  });
});
