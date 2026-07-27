import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { compileLesson } from '@/engine/lang';
import PracticeRunner from '@/components/lesson/PracticeRunner';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/courses/calculus/practice',
}));

const LESSON = `lesson "Practice" {
  slide "One" {
    id: "one"
    numeric {
      ask "What is 2 + 2?"
      skill: "adding"
      answer: 4
    }
  }
}`;

function pool() {
  const lesson = compileLesson(LESSON);
  return lesson.slides.map((s) => ({ ...s, lessonKey: 'practice-1' }));
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ correct: true, xp: 10 }), { status: 200 }))
  );
});

describe('PracticeRunner', () => {
  it('renders the first question from the pool', () => {
    render(
      <PracticeRunner pool={pool()} mastery={{}} courseName="Calculus" coursePath="calculus" />
    );
    expect(screen.getByText(/What is 2 \+ 2/)).toBeInTheDocument();
  });

  it('does not crash on an empty pool', () => {
    expect(() =>
      render(<PracticeRunner pool={[]} mastery={{}} courseName="Calculus" coursePath="calculus" />)
    ).not.toThrow();
    expect(screen.getByText(/Nothing to practice/i)).toBeInTheDocument();
  });

  it('does not crash on an exercise kind it does not know', () => {
    const broken = pool().map((s) => ({
      ...s,
      exercise: { ...s.exercise, kind: 'telepathy' },
    }));
    expect(() =>
      render(
        <PracticeRunner
          pool={broken as never}
          mastery={{}}
          courseName="Calculus"
          coursePath="calculus"
        />
      )
    ).not.toThrow();
  });

  it('survives a pool where only some slides are playable', () => {
    const mixed = [
      { ...pool()[0], id: 'bad', exercise: { kind: 'telepathy', prompt: 'x', hints: [] } },
      ...pool(),
    ];
    expect(() =>
      render(
        <PracticeRunner
          pool={mixed as never}
          mastery={{}}
          courseName="Calculus"
          coursePath="calculus"
        />
      )
    ).not.toThrow();
  });
});
