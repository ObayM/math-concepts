import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import { evalGoals } from '@/engine/runtime/goals';
import GoalBanner from '@/components/lesson/GoalBanner';

const lesson = lessonSchema.parse(
  compileLesson(
    readFileSync(
      fileURLToPath(new URL('../prisma/lessons/differentiation-1.prism', import.meta.url)),
      'utf8'
    )
  )
);

const goalSlide = lesson.slides.find((s) => s.goals && s.goals.length > 0);

describe('evalGoals (latch semantics)', () => {
  it('finds the real "shrink h" goal in differentiation-1', () => {
    expect(goalSlide).toBeTruthy();
    expect(goalSlide!.goals!.length).toBe(1);
  });

  it('is false while the condition has never held', () => {
    const goals = goalSlide!.goals!;
    const met = evalGoals(goals, [false], { h: 0.9 });
    expect(met).toEqual([false]);
  });

  it('flips true once the condition holds', () => {
    const goals = goalSlide!.goals!;
    const met = evalGoals(goals, [false], { h: 0.1 });
    expect(met).toEqual([true]);
  });

  it('latches: stays true even if scope wobbles back out of range', () => {
    const goals = goalSlide!.goals!;
    const met = evalGoals(goals, [true], { h: 0.9 });
    expect(met).toEqual([true]);
  });
});

describe('GoalBanner render', () => {
  const goals = goalSlide!.goals!;

  it('renders unmet goal with its hint', () => {
    const html = renderToStaticMarkup(
      React.createElement(GoalBanner, { goals, goalsMet: [false] })
    );
    expect(html).toContain('secant');
    expect(html).toContain('Drag the slider');
  });

  it('renders met goal without leaking the hint', () => {
    const html = renderToStaticMarkup(React.createElement(GoalBanner, { goals, goalsMet: [true] }));
    expect(html).toContain('secant');
    expect(html).not.toContain('Drag the slider');
  });

  it('renders nothing for a slide with no goals', () => {
    const html = renderToStaticMarkup(
      React.createElement(GoalBanner, { goals: undefined, goalsMet: [] })
    );
    expect(html).toBe('');
  });
});
