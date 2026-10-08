import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { compileLesson } from '@/engine/lang';
import LessonPlayer from '@/components/lesson/LessonPlayer';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => '/courses/calculus/bank',
}));

const quiz = (id: string, round: string) => `  slide "${id.toUpperCase()}" {
    id: "${id}"
    cat: "${round}"
    quiz {
      ask "Pick ${id}"
      skill: "s"
      * "Right ${id}"
      - "Wrong ${id}"
    }
  }`;

const slides = compileLesson(`lesson "Bank" {
  kind: "bank"
${quiz('q1', 'one')}
${quiz('q2', 'one')}
${quiz('q3', 'two')}
}`).slides;

const saved: { currentStep: number }[] = [];
let stored: Record<string, unknown> = {};

beforeEach(() => {
  saved.length = 0;
  stored = { currentStep: 0, completed: false, quizHistory: [] };
  push.mockClear();
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith('/api/progress') && init?.method === 'POST') {
        saved.push(JSON.parse(String(init.body)));
      }
      if (url.startsWith('/api/progress') && init?.method !== 'POST') {
        return new Response(JSON.stringify(stored), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    })
  );
});

const play = async () => {
  render(
    <LessonPlayer
      slides={slides as never[]}
      lessonId="bank"
      coursePath="calculus"
      nextLessonId={null}
      kind={'bank' as never}
    />
  );
  await act(async () => {});
};
const click = async (name: string | RegExp) => {
  fireEvent.click(screen.getByRole('button', { name }));
  await act(async () => {});
};
const heading = () => screen.getByRole('heading', { level: 1 }).textContent;
const answer = async (option: string) => {
  fireEvent.click(screen.getByRole('radio', { name: option }));
  await click('Check');
};

describe('a practice bank', () => {
  it('shows the round and a grid of its questions instead of a progress bar', async () => {
    await play();
    expect(screen.getByText('Round 1 of 2 · one')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('button', { name: 'Question 1, not answered yet' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Question 2, not answered yet' })).toBeTruthy();
  });

  it('marks answers in the grid and lets you jump to any question', async () => {
    await play();
    await answer('Wrong q1');
    expect(screen.getByRole('button', { name: 'Question 1, wrong' })).toBeTruthy();

    await click('Question 2, not answered yet');
    expect(heading()).toBe('Q2');
    await click('Question 1, wrong');
    expect(heading()).toBe('Q1');
    expect((screen.getByRole('radio', { name: 'Wrong q1' }) as HTMLButtonElement).disabled).toBe(
      true
    );
  });

  it('lets you skip a question without answering it', async () => {
    await play();
    await click('Skip');
    expect(heading()).toBe('Q2');
    expect(screen.getByRole('button', { name: 'Question 1, not answered yet' })).toBeTruthy();
  });

  it('stops between rounds, with a score and a way out', async () => {
    await play();
    await answer('Right q1');
    await click('Continue');
    await answer('Wrong q2');
    await click('Continue');

    expect(screen.getByText('Round 1 done')).toBeTruthy();
    expect(screen.getByText('1 of 2 right')).toBeTruthy();
    expect(saved.at(-1)!.currentStep).toBe(2);

    await click('Next round');
    expect(heading()).toBe('Q3');
    expect(screen.getByText('Round 2 of 2 · two')).toBeTruthy();
  });

  it('sends you back to the course when you are done for now', async () => {
    await play();
    await click('Skip');
    await click('Skip');
    await click('Done for now');
    expect(push).toHaveBeenCalledWith('/courses/calculus');
  });

  it('ends the last round on a summary, never on a lesson complete screen', async () => {
    await play();
    await click('Skip');
    await click('Skip');
    await click('Next round');
    await click('Skip');

    expect(screen.getByText('Round 2 done')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next round' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Done for now' })).toBeTruthy();
    expect(screen.queryByText(/lesson complete/i)).toBeNull();
  });

  it('opens every round from the header and comes back to the question', async () => {
    await play();
    await click('Round 1 of 2 · one');
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('All rounds');
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2 }));

    await click('Question 3, not answered yet');
    expect(heading()).toBe('Q3');
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
  });

  it('puts focus back on the question after a round break', async () => {
    await play();
    await click('Skip');
    await click('Skip');
    await click('Next round');
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
  });

  it('reopens a finished bank on its questions, not on a completion screen', async () => {
    stored = {
      currentStep: 2,
      completed: true,
      quizHistory: ['q1', 'q2', 'q3'].map((id) => ({
        title: id,
        question: id,
        slideId: id,
        kind: 'quiz',
        correct: true,
        answer: 0,
      })),
    };
    await play();
    expect(heading()).toBe('Q3');
    expect(screen.getByRole('button', { name: 'Question 3, right' })).toBeTruthy();
  });

  it('keeps the resume point at the furthest question when you go back to review', async () => {
    await play();
    await answer('Right q1');
    await click('Continue');
    expect(saved.at(-1)!.currentStep).toBe(1);

    await click('Question 1, right');
    expect(heading()).toBe('Q1');
    expect(saved.at(-1)!.currentStep).toBe(1);
  });
});
