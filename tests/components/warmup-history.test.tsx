import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpeedChart from '@/components/warmup/SpeedChart';
import HistoryView from '@/components/warmup/HistoryView';

const session = (i: number, pace: number, over: Record<string, unknown> = {}) => ({
  id: `s${i}`,
  level: 3,
  label: `${i + 1} Aug 09:00`,
  answered: 30,
  correct: 28,
  accuracy: 93,
  pace,
  bestStreak: 12,
  totalMs: 30 * pace,
  durationMs: 30 * pace + 5000,
  xpAwarded: 10,
  startedAt: new Date(`2026-08-0${i + 1}T09:00:00Z`),
  endedAt: new Date(`2026-08-0${i + 1}T09:02:00Z`),
  ...over,
});

const LEVELS = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Level ${i + 1}` }));

const TOTALS = {
  sessions: 4,
  answered: 120,
  correct: 112,
  accuracy: 93,
  pace: 1600,
  xp: 40,
  facts: 22,
};

describe('SpeedChart', () => {
  const trend = [session(0, 4000), session(1, 3000), session(2, 2000), session(3, 1200)];

  it('asks for more data rather than drawing a one bar chart', () => {
    render(<SpeedChart trend={[session(0, 2000)]} />);
    expect(screen.getByText(/trend shows up here/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('draws one column per session', () => {
    const { container } = render(<SpeedChart trend={trend} />);
    expect(container.querySelectorAll('path')).toHaveLength(4);
  });

  it('keeps the columns square where they meet the baseline', () => {
    const { container } = render(<SpeedChart trend={trend} />);
    for (const path of container.querySelectorAll('path')) {
      const d = path.getAttribute('d')!;
      expect(d.startsWith('M')).toBe(true);
      expect(d.match(/Q/g)).toHaveLength(2);
    }
  });

  it('scales the tallest column to the top of the plot', () => {
    const { container } = render(<SpeedChart trend={trend} />);
    const heights = [...container.querySelectorAll('path')].map((p) => {
      const nums = p
        .getAttribute('d')!
        .match(/-?\d+\.?\d*/g)!
        .map(Number);
      return nums[1] - nums[3];
    });
    expect(heights[0]).toBeGreaterThan(heights[3]);
    expect(heights[0]).toBeGreaterThan(0);
  });

  it('labels only the newest column, never every one', () => {
    const { container } = render(<SpeedChart trend={trend} />);
    const plotted = [...container.querySelectorAll('svg text')].map((t) => t.textContent);
    expect(plotted).toContain('1.2s');
    expect(plotted).not.toContain('4.0s');
    expect(plotted).not.toContain('3.0s');
    expect(plotted.filter((t) => t?.endsWith('s'))).toHaveLength(1);
  });

  it('says which end is which, since sessions are not evenly spaced in time', () => {
    render(<SpeedChart trend={trend} />);
    expect(screen.getByText('older')).toBeInTheDocument();
    expect(screen.getByText('latest')).toBeInTheDocument();
  });

  it('names what it plots for a screen reader', () => {
    render(<SpeedChart trend={trend} />);
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Seconds per question')
    );
  });

  it('shows a tooltip on hover and takes it away again', async () => {
    const user = userEvent.setup();
    const { container } = render(<SpeedChart trend={trend} />);
    const groups = container.querySelectorAll('svg > g');
    const bar = [...groups].at(-1)!;

    await user.hover(bar);
    expect(screen.getByText(/per question$/)).toBeInTheDocument();
    expect(screen.getByText(/30 answered/)).toBeInTheDocument();

    await user.unhover(bar);
    expect(screen.queryByText(/30 answered/)).toBeNull();
  });

  it('offers the same numbers as a table', () => {
    render(<SpeedChart trend={trend} />);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(5);
    expect(within(table).getByText('4.0s')).toBeInTheDocument();
  });

  it('survives every session having the same pace', () => {
    const flat = [session(0, 2000), session(1, 2000)];
    expect(() => render(<SpeedChart trend={flat} />)).not.toThrow();
  });

  it('survives a pace of zero without dividing by it', () => {
    expect(() => render(<SpeedChart trend={[session(0, 0), session(1, 0)]} />)).not.toThrow();
  });

  it('does not overflow the plot on a very slow session', () => {
    const { container } = render(<SpeedChart trend={[session(0, 90_000), session(1, 1000)]} />);
    for (const path of container.querySelectorAll('path')) {
      const nums = path
        .getAttribute('d')!
        .match(/-?\d+\.?\d*/g)!
        .map(Number);
      expect(nums[3]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('HistoryView', () => {
  const props = {
    level: null,
    levels: LEVELS,
    totals: TOTALS,
    trend: [session(0, 3000), session(1, 1600)],
    weakSpots: [
      { factKey: 'mul:7x8', prompt: '7 × 8', attempts: 12, misses: 5, avgMs: 4100, score: 1.5 },
      { factKey: 'mul:6x9', prompt: '6 × 9', attempts: 10, misses: 0, avgMs: 3800, score: 0.6 },
    ],
    sessions: [session(0, 3000), session(1, 1600)],
  };

  const statValue = (label: string) => {
    const tag = screen.getAllByText(label).find((node) => node.tagName === 'P');
    return tag!.parentElement!.querySelector('p')!.textContent;
  };

  it('leads with the lifetime numbers', () => {
    render(<HistoryView {...props} />);
    expect(statValue('Answered')).toBe('120');
    expect(statValue('Accuracy')).toBe('93%');
    expect(statValue('Per question')).toBe('1.6s');
    expect(statValue('Sessions')).toBe('4');
  });

  it('spells out that lower is better on the pace chart', () => {
    render(<HistoryView {...props} />);
    expect(screen.getByText(/lower is better/i)).toBeInTheDocument();
  });

  it('lists the weak facts with how often they were missed', () => {
    render(<HistoryView {...props} />);
    expect(screen.getByText('7 × 8')).toBeInTheDocument();
    expect(screen.getByText('5 of 12 missed')).toBeInTheDocument();
    expect(screen.getByText('10 seen')).toBeInTheDocument();
  });

  it('shows both the wall clock time and the time actually answering', () => {
    render(<HistoryView {...props} />);
    expect(screen.getByText('Sat for')).toBeInTheDocument();
    expect(screen.getByText('Answering')).toBeInTheDocument();
    expect(screen.getByText('1:35')).toBeInTheDocument();
  });

  it('offers both csv exports as real downloads', () => {
    render(<HistoryView {...props} />);
    const sessionsCsv = screen.getByRole('link', { name: /Sessions CSV/i });
    expect(sessionsCsv).toHaveAttribute('href', '/api/warmup/export?scope=sessions');
    expect(sessionsCsv).toHaveAttribute('download');
    expect(screen.getByRole('link', { name: /Every answer CSV/i })).toHaveAttribute(
      'href',
      '/api/warmup/export?scope=answers'
    );
  });

  it('filters by level through the url, so it works without javascript', () => {
    render(<HistoryView {...props} />);
    expect(screen.getByRole('link', { name: 'All levels' })).toHaveAttribute(
      'href',
      '/warmup/history'
    );
    expect(screen.getByRole('link', { name: '5' })).toHaveAttribute(
      'href',
      '/warmup/history?level=5'
    );
  });

  it('sends a student with no history somewhere useful', () => {
    render(
      <HistoryView
        {...props}
        totals={{ ...TOTALS, answered: 0 }}
        trend={[]}
        weakSpots={[]}
        sessions={[]}
      />
    );
    expect(screen.getByText(/Nothing here yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pick a level/i })).toHaveAttribute('href', '/warmup');
    expect(screen.queryByRole('link', { name: /Sessions CSV/i })).toBeNull();
  });

  it('explains an empty weak spot list rather than showing a blank box', () => {
    render(<HistoryView {...props} weakSpots={[]} />);
    expect(screen.getByText(/needs a few attempts/i)).toBeInTheDocument();
  });
});
