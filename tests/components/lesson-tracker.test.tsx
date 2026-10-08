import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useLessonTracker from '@/components/lesson/useLessonTracker';
import { IDLE_MS } from '@/lib/tracker-core';

type Sent = {
  lessonKey: string;
  sessionId: string;
  events: { type: string; slideId: string | null; data?: Record<string, unknown> }[];
};

let fetched: Sent[] = [];
let beacons: Blob[] = [];

const blobText = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });

const readBeacons = async () =>
  Promise.all(beacons.map(async (b) => JSON.parse(await blobText(b)) as Sent));

beforeEach(() => {
  vi.useFakeTimers();
  fetched = [];
  beacons = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit) => {
      fetched.push(JSON.parse(String(init.body)));
      return new Response('{}', { status: 200 });
    })
  );
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    value: vi.fn((_url: string, blob: Blob) => {
      beacons.push(blob);
      return true;
    }),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const events = (batches: Sent[]) => batches.flatMap((b) => b.events);

describe('useLessonTracker', () => {
  it('opens a session and flushes slide time in a batch', async () => {
    const { result } = renderHook(() => useLessonTracker('ar-calc-5'));
    act(() => result.current.enterSlide('a'));
    act(() => vi.advanceTimersByTime(3000));
    act(() => result.current.enterSlide('b'));
    await act(async () => vi.advanceTimersByTime(10_000));

    const sent = events(fetched);
    expect(sent.map((e) => e.type)).toEqual([
      'lesson_open',
      'slide_enter',
      'slide_leave',
      'slide_enter',
    ]);
    const leave = sent[2];
    expect(leave.slideId).toBe('a');
    expect(leave.data).toMatchObject({ activeMs: 3000, wallMs: 3000 });
    expect(fetched[0]).toMatchObject({ lessonKey: 'ar-calc-5' });
    expect(fetched[0].sessionId).toBeTruthy();
  });

  it('stops counting a slide once the student goes idle', async () => {
    const { result } = renderHook(() => useLessonTracker('ar-calc-5'));
    act(() => result.current.enterSlide('a'));
    act(() => vi.advanceTimersByTime(IDLE_MS + 60_000));
    act(() => result.current.enterSlide('b'));
    await act(async () => vi.advanceTimersByTime(10_000));

    const sent = events(fetched);
    expect(sent.some((e) => e.type === 'idle')).toBe(true);
    const leave = sent.find((e) => e.type === 'slide_leave')!;
    expect(leave.data?.activeMs).toBe(IDLE_MS);
    expect(leave.data?.wallMs).toBe(IDLE_MS + 60_000);
  });

  it('numbers repeated checks on the same slide', async () => {
    const { result } = renderHook(() => useLessonTracker('ar-calc-5'));
    act(() => {
      result.current.track('check', 'a', { correct: false });
      result.current.track('check', 'a', { correct: true });
    });
    await act(async () => vi.advanceTimersByTime(10_000));
    const checks = events(fetched).filter((e) => e.type === 'check');
    expect(checks.map((c) => c.data?.attempt)).toEqual([1, 2]);
  });

  it('closes the slide and beacons the rest when the page goes away', async () => {
    const { result } = renderHook(() => useLessonTracker('ar-calc-5'));
    act(() => result.current.enterSlide('a'));
    act(() => vi.advanceTimersByTime(2000));
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    vi.useRealTimers();

    const sent = events(await readBeacons());
    expect(sent.map((e) => e.type)).toEqual([
      'lesson_open',
      'slide_enter',
      'slide_leave',
      'lesson_close',
    ]);
    expect(fetched).toEqual([]);
  });

  it('records nothing without a lesson', async () => {
    renderHook(() => useLessonTracker(undefined));
    await act(async () => vi.advanceTimersByTime(20_000));
    expect(fetched).toEqual([]);
  });
});
