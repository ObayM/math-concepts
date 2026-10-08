import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { compileLesson } from '@/engine/lang';
import { instantiate, seedOf } from '@/engine/runtime/variant';
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
    numeric {
      vary n in range(2, 10)
      ask "What is \${n} plus one?"
      answer: n + 1
      expect: n + 1
    }
  }
  slide "Third" {
    id: "c"
    quiz {
      ask "Pick again"
      * "Right"
      - "Wrong"
      onwrong: "help" retry
    }
  }
  slide "Help" {
    id: "help"
    hidden: true
    > think again
  }
  slide "Fourth" {
    id: "d"
    > all done
  }
}`).slides;

const TOKEN = '5.local';
const shownN = Number(
  (instantiate(slides[1] as never, seedOf(TOKEN)).exercise as { prompt: string }).prompt.match(
    /\d+/
  )![0]
);

let stored: unknown[] = [];
let currentStep = 0;
let fetched: string[] = [];
let saved: { quizHistory: { slideId: string; answer?: unknown }[] }[] = [];
let tokens = 0;

beforeEach(() => {
  stored = [];
  currentStep = 0;
  fetched = [];
  saved = [];
  tokens = 0;
  vi.stubGlobal('confirm', () => true);
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      fetched.push(url);
      if (url.startsWith('/api/progress') && init?.method === 'POST') {
        saved.push(JSON.parse(String(init.body)));
      }
      if (url.startsWith('/api/variant')) {
        tokens += 1;
        return new Response(JSON.stringify({ variant: `${tokens}.local` }), { status: 200 });
      }
      if (url.startsWith('/api/progress') && init?.method !== 'POST') {
        return new Response(
          JSON.stringify({ currentStep, completed: false, quizHistory: stored }),
          {
            status: 200,
          }
        );
      }
      return new Response('{}', { status: 200 });
    })
  );
});

const play = async (lesson: unknown[] = slides) => {
  render(
    <LessonPlayer
      slides={lesson as never[]}
      lessonId="l"
      coursePath="calculus"
      nextLessonId={null}
    />
  );
  await act(async () => {});
};
const click = async (name: string) => {
  fireEvent.click(screen.getByRole('button', { name }));
  await act(async () => {});
};
const heading = () => screen.getByRole('heading', { level: 1 }).textContent;
const radio = (name: string) => screen.getByRole('radio', { name }) as HTMLButtonElement;

describe('going Back to a question you already answered', () => {
  it('shows your answer, checked and locked', async () => {
    await play();
    fireEvent.click(radio('Yes'));
    await click('Check');
    await click('Continue');
    expect(heading()).toBe('Second');

    await click('Back');
    expect(heading()).toBe('First');
    expect(radio('Yes').getAttribute('aria-checked')).toBe('true');
    expect(radio('Yes').disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Check' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
  });

  it('brings back the same numbers after a reload, instead of asking for new ones', async () => {
    stored = [
      {
        title: 'First',
        question: 'Pick one',
        slideId: 'a',
        kind: 'quiz',
        correct: true,
        answer: 0,
      },
      {
        title: 'Second',
        question: 'n plus one',
        slideId: 'b',
        kind: 'numeric',
        correct: true,
        answer: String(shownN + 1),
        variant: TOKEN,
      },
    ];
    currentStep = 2;
    await play();
    expect(heading()).toBe('Third');

    await click('Back');
    expect(heading()).toBe('Second');
    const input = screen.getByRole('textbox', { name: 'your answer' }) as HTMLInputElement;
    expect(input.value).toBe(String(shownN + 1));
    expect(input.disabled).toBe(true);
    expect(document.querySelector('[data-feedback]')?.getAttribute('data-feedback')).toBe(
      'correct'
    );
    expect(fetched.some((u) => u.startsWith('/api/variant'))).toBe(false);
  });

  it('leaves a retry fresh, then shows the retried answer on Back', async () => {
    stored = [
      {
        title: 'First',
        question: 'Pick one',
        slideId: 'a',
        kind: 'quiz',
        correct: true,
        answer: 0,
      },
    ];
    currentStep = 2;
    await play();
    expect(heading()).toBe('Third');

    fireEvent.click(radio('Wrong'));
    await click('Check');
    await click("Let's back up");
    expect(heading()).toBe('Help');
    await click('Try it again');

    expect(heading()).toBe('Third');
    expect(radio('Wrong').disabled).toBe(false);
    expect(radio('Wrong').getAttribute('aria-checked')).toBe('false');

    fireEvent.click(radio('Right'));
    await click('Check');
    await click('Continue');
    expect(heading()).toBe('Fourth');

    await click('Back');
    expect(heading()).toBe('Third');
    expect(radio('Right').getAttribute('aria-checked')).toBe('true');
    expect(radio('Right').disabled).toBe(true);

    const scored = saved.at(-1)!.quizHistory.find((e) => e.slideId === 'c');
    expect(scored?.answer).toBe(1);
  });

  it('restores a question answered on the very first slide', async () => {
    stored = [
      {
        title: 'First',
        question: 'Pick one',
        slideId: 'a',
        kind: 'quiz',
        correct: true,
        answer: 0,
      },
    ];
    await play();
    expect(heading()).toBe('First');
    expect(radio('Yes').getAttribute('aria-checked')).toBe('true');
    expect(radio('Yes').disabled).toBe(true);
  });

  it('asks for fresh numbers after a restart', async () => {
    currentStep = 1;
    await play();
    expect(heading()).toBe('Second');
    expect(tokens).toBe(1);

    fireEvent.click(screen.getAllByRole('button', { name: 'Restart lesson' })[0]);
    await act(async () => {});
    fireEvent.click(radio('Yes'));
    await click('Check');
    await click('Continue');
    expect(heading()).toBe('Second');
    expect(tokens).toBe(2);
  });
});

const detours = compileLesson(`lesson "D" {
  slide "Q1" {
    id: "q1"
    quiz {
      ask "One"
      * "Right one"
      - "Wrong one"
      onwrong: "help"
    }
  }
  slide "Q2" {
    id: "q2"
    quiz {
      ask "Two"
      * "Right two"
      - "Wrong two"
      onwrong: "help"
    }
  }
  slide "Q3" {
    id: "q3"
    quiz {
      ask "Three"
      * "Right three"
      - "Wrong three"
      onwrong: "help3" retry
    }
  }
  slide "Help" {
    id: "help"
    hidden: true
    quiz {
      ask "Helper"
      * "Help yes"
      - "Help no"
    }
  }
  slide "Help3" {
    id: "help3"
    hidden: true
    > think it through
  }
  slide "End" {
    id: "end"
    > done
  }
}`).slides;

const answeredFirstTwo = [
  { title: 'Q1', question: 'One', slideId: 'q1', kind: 'quiz', correct: true, answer: 0 },
  { title: 'Q2', question: 'Two', slideId: 'q2', kind: 'quiz', correct: true, answer: 0 },
];

describe('Back around detours', () => {
  it('opens a shared detour fresh the second time', async () => {
    await play(detours);
    fireEvent.click(radio('Wrong one'));
    await click('Check');
    await click("Let's back up");
    expect(heading()).toBe('Help');
    fireEvent.click(radio('Help yes'));
    await click('Check');
    await click('Got it');

    expect(heading()).toBe('Q2');
    fireEvent.click(radio('Wrong two'));
    await click('Check');
    await click("Let's back up");
    expect(heading()).toBe('Help');
    expect(radio('Help yes').getAttribute('aria-checked')).toBe('false');
    expect(radio('Help yes').disabled).toBe(false);
  });

  it('will not let Back skip a detour that has not run yet', async () => {
    stored = answeredFirstTwo;
    currentStep = 2;
    await play(detours);
    fireEvent.click(radio('Wrong three'));
    await click('Check');
    await click('Back');
    await click('Continue');

    expect(heading()).toBe('Q3');
    expect(radio('Wrong three').disabled).toBe(false);
    fireEvent.click(radio('Wrong three'));
    await click('Check');
    expect(screen.getByRole('button', { name: "Let's back up" })).toBeTruthy();
  });

  it('keeps the retry when you step back out of its detour', async () => {
    stored = answeredFirstTwo;
    currentStep = 2;
    await play(detours);
    fireEvent.click(radio('Wrong three'));
    await click('Check');
    await click("Let's back up");
    expect(heading()).toBe('Help3');

    await click('Back');
    expect(heading()).toBe('Q3');
    expect(radio('Wrong three').disabled).toBe(false);
    expect(radio('Wrong three').getAttribute('aria-checked')).toBe('false');
  });
});

describe('Back to a question gated on scene goals', () => {
  const gated = compileLesson(`lesson "G" {
  slide "Explore" {
    id: "g"
    scene plane {
      x: [0, 1]
      y: [0, 1]
      param h = 1 { range: [0, 1], step: 0.001 }
      slider h
    }
    goal "Get h below 0.01" {
      when: h < 0.01
    }
    quiz {
      ask "Small now?"
      * "Yes small"
      - "Not small"
      after: goals
    }
  }
  slide "After" {
    id: "z"
    > nice
  }
}`).slides;

  it('shows the answered question without redoing the goals', async () => {
    stored = [
      {
        title: 'Explore',
        question: 'Small now?',
        slideId: 'g',
        kind: 'quiz',
        correct: true,
        answer: 0,
      },
    ];
    currentStep = 1;
    await play(gated);
    await click('Back');

    expect(heading()).toBe('Explore');
    expect(radio('Yes small').getAttribute('aria-checked')).toBe('true');
    expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(
      false
    );
  });
});
