import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import { exercises } from '@/components/lesson/exercises';
import MovesExercise from '@/components/lesson/exercises/MovesExercise';

const SRC = (moves: string) => `lesson "L" {
  slide "s" {
    moves {
      ask "Solve for $x$."
      from "$2x + 3 = 11$"
${moves}
    }
  }
}`;

const GOOD = `      move "$2x = 8$" {
        * "Subtract 3"
        - "Divide by 2" { why: "Get rid of the + 3 first." }
        - "Add 3"
      }
      move "$x = 4$" {
        * "Divide by 2"
        - "Subtract 2"
      }`;

const slide = lessonSchema.parse(compileLesson(SRC(GOOD))).slides[0];

describe('moves exercise', () => {
  it('compiles each move with its right choice', () => {
    const ex = slide.exercise!;
    if (ex.kind !== 'moves') throw new Error('kind');
    expect(ex.start).toBe('$2x + 3 = 11$');
    expect(ex.steps.map((s) => [s.result, s.correct])).toEqual([
      ['$2x = 8$', 0],
      ['$x = 4$', 0],
    ]);
    expect(ex.steps[0].options[1].why).toBe('Get rid of the + 3 first.');
  });

  it('is complete once every move ends on the right choice', () => {
    const m = exercises.moves;
    expect(m.initial(slide)).toEqual([[], []]);
    expect(m.isComplete(slide, [[0], []])).toBe(false);
    expect(m.isComplete(slide, [[1, 0], [0]])).toBe(true);
  });

  it('only counts it correct when every move was right first time', () => {
    expect(exercises.moves.check(slide, [[0], [0]])).toBe(true);
    expect(exercises.moves.check(slide, [[1, 0], [0]])).toBe(false);
    expect(exercises.moves.check(slide, 'nonsense')).toBe(false);
  });

  it('shows the chain so far and the choices for the next move', () => {
    const html = renderToStaticMarkup(
      <MovesExercise slide={slide} value={[[1, 0], []]} checked={false} onChange={vi.fn()} />
    );
    expect(html).toContain('Subtract 3');
    expect(html).toContain('Subtract 2');
    expect(html).toContain('Pick the next move');
  });

  it.each([
    [
      `      move "$x = 4$" {\n        - "a"\n        - "b"\n      }`,
      /exactly one \* right choice/,
    ],
    [`      move "$x = 4$" {\n        * "a"\n      }`, /at least one wrong choice/],
    [`      move "$x = 4$" {\n        * "a"\n        - "a"\n      }`, /same choice twice/],
    ['', /at least one move/],
  ])('refuses a bad move list', (moves, err) => {
    expect(() => compileLesson(SRC(moves))).toThrow(err);
  });
});
