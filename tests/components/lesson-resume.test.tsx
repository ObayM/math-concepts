import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { compileLesson } from '@/engine/lang';
import LessonPlayer from '@/components/lesson/LessonPlayer';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/courses/calculus/l',
}));

const slides = compileLesson(`lesson "L" {
  slide "First" {
    id: "a"
    quiz {
      ask "Pick one"
      * "Yes"
      - "No"
    }
  }
  slide "Second" {
    id: "b"
    quiz {
      ask "Pick again"
      * "Yes"
      - "No"
    }
  }
}`).slides;

const stored = [
  { title: 'First', question: 'Pick one', slideId: 'a', kind: 'quiz', correct: true },
];
let saved: { quizHistory: { slideId: string }[] }[] = [];

beforeEach(() => {
  saved = [];
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
        return new Response(JSON.stringify({ success: true, xp: 0 }), { status: 200 });
      }
      if (url.startsWith('/api/progress')) {
        return new Response(
          JSON.stringify({ currentStep: 1, completed: false, quizHistory: stored }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 200 });
    })
  );
});

describe('resuming a lesson part way through', () => {
  it('keeps the earlier answers, so the next one is saved on top of them', async () => {
    render(
      <LessonPlayer
        slides={slides as never[]}
        lessonId="l"
        coursePath="calculus"
        nextLessonId={null}
      />
    );
    await act(async () => {});
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Second');

    fireEvent.click(screen.getAllByRole('radio')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    await act(async () => {});

    const last = saved.at(-1)!;
    expect(last.quizHistory.map((e) => e.slideId)).toEqual(['a', 'b']);
  });
});
