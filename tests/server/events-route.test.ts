import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryStore, setRateLimitStore, TIERS } from '@/lib/rate-limit';

const requireUser = vi.fn();
const recordLessonEvents = vi.fn();

vi.mock('@/lib/session', () => ({ requireUser: () => requireUser() }));
vi.mock('@/lib/db/eventService', () => ({
  recordLessonEvents: (...args: unknown[]) => recordLessonEvents(...args),
}));

const { POST } = await import('@/app/api/events/route');

const post = (body: unknown) =>
  new Request('http://localhost:3000/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const event = (overrides: Record<string, unknown> = {}) => ({
  type: 'slide_enter',
  slideId: 's1',
  t: 1_700_000_000_000,
  ...overrides,
});

const batch = (events: unknown[], extra: Record<string, unknown> = {}) =>
  post({ lessonKey: 'ar-calc-5', sessionId: 'sess-1', events, ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  setRateLimitStore(new MemoryStore());
  requireUser.mockResolvedValue({ id: 'user-1' });
  recordLessonEvents.mockResolvedValue(1);
});

describe('POST /api/events', () => {
  it('stores a batch for the signed in student', async () => {
    const res = await POST(batch([event(), event({ type: 'check', data: { correct: true } })]));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ success: true });
    const [userId, lessonKey, sessionId, events] = recordLessonEvents.mock.calls[0];
    expect([userId, lessonKey, sessionId]).toEqual(['user-1', 'ar-calc-5', 'sess-1']);
    expect(events).toHaveLength(2);
  });

  it('refuses an anonymous visitor', async () => {
    requireUser.mockResolvedValue(null);
    expect((await POST(batch([event()]))).status).toBe(401);
    expect(recordLessonEvents).not.toHaveBeenCalled();
  });

  it('only accepts known event types', async () => {
    expect((await POST(batch([event({ type: 'mouse_move' })]))).status).toBe(400);
    expect(recordLessonEvents).not.toHaveBeenCalled();
  });

  it('caps a batch at fifty events and refuses an empty one', async () => {
    const fifty = Array.from({ length: 50 }, () => event());
    expect((await POST(batch(fifty))).status).toBe(200);
    expect((await POST(batch([...fifty, event()]))).status).toBe(400);
    expect((await POST(batch([]))).status).toBe(400);
  });

  it('keeps payloads small and flat', async () => {
    const wide = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`k${i}`, i]));
    expect((await POST(batch([event({ data: wide })]))).status).toBe(400);
    expect((await POST(batch([event({ data: { note: 'x'.repeat(65) } })]))).status).toBe(400);
    expect((await POST(batch([event({ data: { nested: { a: 1 } } })]))).status).toBe(400);
  });

  it('rejects a broken timestamp or body', async () => {
    for (const t of [-1, 1.5, 'now', null]) {
      expect((await POST(batch([event({ t })]))).status, String(t)).toBe(400);
    }
    expect((await POST(post('not json'))).status).toBe(400);
    expect((await POST(batch([event()], { sessionId: '' }))).status).toBe(400);
  });

  it('404s an unknown lesson', async () => {
    recordLessonEvents.mockResolvedValue(null);
    expect((await POST(batch([event()]))).status).toBe(404);
  });

  it('runs out of tokens after the tier allows', async () => {
    for (let i = 0; i < TIERS.events.max; i++) {
      expect((await POST(batch([event()]))).status).toBe(200);
    }
    expect((await POST(batch([event()]))).status).toBe(429);
  });
});
