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
  slide "First slide" {
    > Hello.
  }
  slide "Second slide" {
    > Again.
  }
}`).slides;

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ currentStep: 0, completed: false }), { status: 200 })
    )
  );
});

describe('moving between slides', () => {
  it('puts focus on the new slide heading, so a screen reader starts there', async () => {
    render(
      <LessonPlayer
        slides={slides as never[]}
        lessonId="l"
        coursePath="calculus"
        nextLessonId={null}
      />
    );
    await act(async () => {});
    expect(document.activeElement).not.toBe(screen.getByRole('heading', { level: 1 }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await act(async () => {});
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Second slide');
    expect(document.activeElement).toBe(heading);
  });
});
