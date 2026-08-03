import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WarmupRunner from '@/components/warmup/WarmupRunner';
import { questionAt } from '@/lib/warmup/questions';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/warmup/3',
}));

const SEED = 'testseed00000001';
const LEVEL = 3;

const answerAt = (i: number) => questionAt(LEVEL, SEED, i)!.answer;
const promptAt = (i: number) => questionAt(LEVEL, SEED, i)!.prompt;

let flushes: { sessionId: string; answers: { idx: number; given: string }[] }[] = [];
let xpPerFlush = 0;
let failAnswers = false;

function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/api/warmup/session')) {
        if (init?.method === 'PATCH') {
          return new Response(JSON.stringify({ success: true, session: {} }), { status: 200 });
        }
        return new Response(JSON.stringify({ success: true, sessionId: 's1', seed: SEED }), {
          status: 200,
        });
      }
      if (String(url).includes('/api/warmup/answers')) {
        if (failAnswers) return new Response('nope', { status: 500 });
        flushes.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify({ success: true, session: { xp: xpPerFlush } }), {
          status: 200,
        });
      }
      return new Response('{}', { status: 200 });
    })
  );
}

async function mountRunner() {
  const view = render(
    <WarmupRunner level={LEVEL} levelName="Times tables" levelBlurb="2 to 12." />
  );
  await waitFor(() => expect(screen.getByText(promptAt(0))).toBeInTheDocument());
  return view;
}

const answerBox = () => screen.getByLabelText(/^Answer for /) as HTMLInputElement;

const advanced = () => waitFor(() => expect(screen.queryByText(/Nice/)).toBeNull());

async function fastAnswer(i: number, given = answerAt(i)) {
  fireEvent.change(answerBox(), { target: { value: given } });
  fireEvent.keyDown(answerBox(), { key: 'Enter' });
  if (screen.queryByText(/it's /)) {
    fireEvent.keyDown(answerBox(), { key: 'Enter' });
    await waitFor(() => expect(screen.queryByText(/it's /)).toBeNull());
    return;
  }
  await advanced();
}

function usePointer(kind: 'coarse' | 'fine') {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('coarse') && kind === 'coarse',
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  flushes = [];
  xpPerFlush = 0;
  failAnswers = false;
  usePointer('fine');
  stubFetch();
});

describe('starting a drill', () => {
  it('asks the server for a session and shows the first question', async () => {
    await mountRunner();
    expect(screen.getByText('Times tables')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/warmup/session',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('renders questions derived from the server seed, not from its own randomness', async () => {
    await mountRunner();
    expect(screen.getByText(promptAt(0))).toBeInTheDocument();
  });

  it('shows a recoverable error when the session cannot start', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('no', { status: 500 }))
    );
    render(<WarmupRunner level={LEVEL} levelName="Times tables" levelBlurb="2 to 12." />);
    await waitFor(() => expect(screen.getByText(/Could not start/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Back to levels/i })).toBeInTheDocument();
  });
});

describe('a correct answer', () => {
  it('advances on its own without a click', async () => {
    const user = userEvent.setup();
    await mountRunner();

    await user.type(answerBox(), answerAt(0));
    await user.keyboard('{Enter}');

    expect(screen.getByText(/Nice/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(promptAt(1))).toBeInTheDocument());
    expect(answerBox()).toHaveValue('');
  });

  it('counts up the streak and the score', async () => {
    const user = userEvent.setup();
    await mountRunner();

    for (let i = 0; i < 3; i++) {
      await user.type(answerBox(), answerAt(i));
      await user.keyboard('{Enter}');
      await advanced();
    }
    expect(screen.getByText('3/3')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});

describe('a wrong answer', () => {
  it('holds on screen with the right answer until the student continues', async () => {
    const user = userEvent.setup();
    await mountRunner();
    const wrong = String(Number(answerAt(0)) + 3);

    await user.type(answerBox(), wrong);
    await user.keyboard('{Enter}');

    expect(screen.getByText(`it's ${answerAt(0)}`)).toBeInTheDocument();
    expect(screen.getByText(promptAt(0))).toBeInTheDocument();

    await new Promise((r) => setTimeout(r, 400));
    expect(screen.getByText(promptAt(0))).toBeInTheDocument();

    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByText(promptAt(1))).toBeInTheDocument());
  });

  it('resets the streak but keeps the best run', async () => {
    const user = userEvent.setup();
    await mountRunner();

    await user.type(answerBox(), answerAt(0));
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByText(promptAt(1))).toBeInTheDocument());

    await user.type(answerBox(), String(Number(answerAt(1)) + 3));
    await user.keyboard('{Enter}');

    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('does not accept a second Enter as another answer while it is holding', async () => {
    const user = userEvent.setup();
    await mountRunner();

    await user.type(answerBox(), String(Number(answerAt(0)) + 3));
    await user.keyboard('{Enter}');
    expect(screen.getByText('0/1')).toBeInTheDocument();

    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByText(promptAt(1))).toBeInTheDocument());
    expect(screen.getByText('0/1')).toBeInTheDocument();
  });
});

describe('input handling', () => {
  it('ignores an empty submit', async () => {
    const user = userEvent.setup();
    await mountRunner();
    await user.keyboard('{Enter}');
    expect(screen.getByText('0/0')).toBeInTheDocument();
    expect(screen.getByText(promptAt(0))).toBeInTheDocument();
  });

  it('ignores a lone minus sign', async () => {
    const user = userEvent.setup();
    await mountRunner();
    await user.type(answerBox(), '-');
    await user.keyboard('{Enter}');
    expect(screen.getByText('0/0')).toBeInTheDocument();
  });

  it('strips anything that is not a digit or a minus', async () => {
    const user = userEvent.setup();
    await mountRunner();
    await user.type(answerBox(), 'abc4.2e+');
    expect(answerBox()).toHaveValue('42');
  });

  it('exposes exactly one answer field to assistive tech', async () => {
    await mountRunner();
    expect(screen.getAllByLabelText(/^Answer for /)).toHaveLength(1);
  });
});

describe('on a touch device', () => {
  beforeEach(() => usePointer('coarse'));

  it('shows the keypad instead of a check button', async () => {
    await mountRunner();
    expect(screen.getByRole('button', { name: '7' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Check/ })).toBeInTheDocument();
  });

  it('keeps the field read only so the phone keyboard never opens', async () => {
    await mountRunner();
    expect(answerBox()).toHaveAttribute('readonly');
    expect(answerBox()).toHaveAttribute('inputmode', 'none');
  });

  it('drives the value from the keypad', async () => {
    const user = userEvent.setup();
    await mountRunner();

    await user.click(screen.getByRole('button', { name: '4' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    expect(answerBox()).toHaveValue('42');

    await user.click(screen.getByRole('button', { name: 'backspace' }));
    expect(answerBox()).toHaveValue('4');

    await user.click(screen.getByRole('button', { name: 'minus' }));
    expect(answerBox()).toHaveValue('-4');
  });

  it('grades an answer entered entirely on the keypad', async () => {
    const user = userEvent.setup();
    await mountRunner();

    for (const digit of answerAt(0)) {
      await user.click(screen.getByRole('button', { name: digit }));
    }
    await user.click(screen.getByRole('button', { name: /Check/ }));

    expect(screen.getByText(/Nice/)).toBeInTheDocument();
  });

  it('turns the keypad action into Next while a wrong answer is held', async () => {
    const user = userEvent.setup();
    await mountRunner();

    for (const digit of String(Number(answerAt(0)) + 3).replace('-', '')) {
      await user.click(screen.getByRole('button', { name: digit }));
    }
    await user.click(screen.getByRole('button', { name: /Check/ }));
    expect(screen.getByText(`it's ${answerAt(0)}`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Next/ }));
    await waitFor(() => expect(screen.getByText(promptAt(1))).toBeInTheDocument());
  });

  it('has no decimal point, because every answer is a whole number', async () => {
    await mountRunner();
    expect(screen.queryByRole('button', { name: '.' })).toBeNull();
    expect(screen.getByRole('button', { name: 'minus' })).toBeInTheDocument();
  });

  it('meets the touch target minimum on every key', async () => {
    await mountRunner();
    for (const key of ['7', '0', 'minus', 'backspace']) {
      expect(screen.getByRole('button', { name: key }).className).toContain('tap-target');
    }
  });
});

describe('saving', () => {
  it('flushes a batch once enough answers pile up, not one request per answer', async () => {
    await mountRunner();

    for (let i = 0; i < 9; i++) await fastAnswer(i);
    expect(flushes).toHaveLength(0);

    await fastAnswer(9);
    await waitFor(() => expect(flushes).toHaveLength(1));
    expect(flushes[0].answers).toHaveLength(10);
    expect(flushes[0].sessionId).toBe('s1');
  });

  it('sends only the index, what was typed and how long it took', async () => {
    await mountRunner();
    for (let i = 0; i < 10; i++) await fastAnswer(i);
    await waitFor(() => expect(flushes).toHaveLength(1));

    for (const answer of flushes[0].answers) {
      expect(Object.keys(answer).sort()).toEqual(['elapsedMs', 'given', 'idx']);
    }
    expect(flushes[0].answers.map((a) => a.idx)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('records what was actually typed, right or wrong', async () => {
    await mountRunner();
    await fastAnswer(0, '999999');
    for (let i = 1; i < 10; i++) await fastAnswer(i);
    await waitFor(() => expect(flushes).toHaveLength(1));
    expect(flushes[0].answers[0].given).toBe('999999');
  });

  it('warns when saving fails and retries the same answers rather than dropping them', async () => {
    failAnswers = true;
    await mountRunner();

    for (let i = 0; i < 10; i++) await fastAnswer(i);
    await waitFor(() => expect(screen.getByText(/Not saving right now/i)).toBeInTheDocument());
    expect(flushes).toHaveLength(0);

    failAnswers = false;
    await fastAnswer(10);

    await waitFor(() => expect(flushes).toHaveLength(1));
    expect(flushes[0].answers).toHaveLength(11);
    expect(flushes[0].answers.map((a) => a.idx)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    await waitFor(() => expect(screen.queryByText(/Not saving right now/i)).toBeNull());
  });

  it('keeps counting locally while saving is broken, so the drill never stalls', async () => {
    failAnswers = true;
    await mountRunner();
    for (let i = 0; i < 12; i++) await fastAnswer(i);
    expect(screen.getByText('12/12')).toBeInTheDocument();
  });
});

describe('stopping', () => {
  async function playAndStop(user: ReturnType<typeof userEvent.setup>, correct: number) {
    await mountRunner();
    for (let i = 0; i < correct; i++) await fastAnswer(i);
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    await waitFor(() => expect(screen.getByText(/out of/)).toBeInTheDocument());
  }

  it('shows the sitting summary', async () => {
    const user = userEvent.setup();
    await playAndStop(user, 3);
    expect(screen.getByText('3 out of 3')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Best run')).toBeInTheDocument();
    expect(screen.getByText('Per question')).toBeInTheDocument();
  });

  it('flushes whatever is still buffered and closes the session', async () => {
    const user = userEvent.setup();
    await playAndStop(user, 3);
    await waitFor(() => expect(flushes).toHaveLength(1));
    expect(flushes[0].answers).toHaveLength(3);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/warmup/session',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('shows xp the server actually paid', async () => {
    const user = userEvent.setup();
    xpPerFlush = 3;
    await playAndStop(user, 3);
    await waitFor(() => expect(screen.getByText('+3 XP')).toBeInTheDocument());
  });

  it('says so when the daily cap is what stopped the xp', async () => {
    const user = userEvent.setup();
    xpPerFlush = 0;
    await playAndStop(user, 3);
    await waitFor(() =>
      expect(screen.getByText(/all the XP a warm up pays today/i)).toBeInTheDocument()
    );
  });

  it('does not claim xp when nothing was earned and nothing was capped', async () => {
    const user = userEvent.setup();
    await mountRunner();
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    await waitFor(() => expect(screen.getByText('0 out of 0')).toBeInTheDocument());
    expect(screen.queryByText(/XP/)).toBeNull();
  });

  it('starts a brand new session on go again', async () => {
    const user = userEvent.setup();
    await playAndStop(user, 2);
    await user.click(screen.getByRole('button', { name: /Go again/i }));

    await waitFor(() => expect(screen.getByText(promptAt(0))).toBeInTheDocument());
    expect(screen.getByText('0/0')).toBeInTheDocument();
  });

  it('offers a way to the history and back to the levels', async () => {
    const user = userEvent.setup();
    await playAndStop(user, 1);
    expect(screen.getByRole('link', { name: /See your history/i })).toHaveAttribute(
      'href',
      '/warmup/history'
    );
    expect(screen.getByRole('link', { name: /Pick another level/i })).toHaveAttribute(
      'href',
      '/warmup'
    );
  });
});

describe('the header', () => {
  it('offers a way back to the levels', async () => {
    await mountRunner();
    const header = screen.getByRole('link', { name: /Levels/i });
    expect(header).toHaveAttribute('href', '/warmup');
  });

  it('shows a live clock and a streak', async () => {
    const user = userEvent.setup();
    await mountRunner();
    await user.type(answerBox(), answerAt(0));
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByText(promptAt(1))).toBeInTheDocument());
    expect(screen.getByText('1/1')).toBeInTheDocument();
    expect(within(screen.getByText('0:00').parentElement!).getByText('0:00')).toBeInTheDocument();
  });
});
