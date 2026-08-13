import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { MemoryStore, setRateLimitStore, TIERS } from '@/lib/rate-limit';

const requireUser = vi.fn();
const getLessonNotes = vi.fn();
const upsertSlideNote = vi.fn();

vi.mock('@/lib/session', () => ({ requireUser: () => requireUser() }));

vi.mock('@/lib/db/noteService', () => ({
  getLessonNotes: (...args: unknown[]) => getLessonNotes(...args),
  upsertSlideNote: (...args: unknown[]) => upsertSlideNote(...args),
}));

const { GET, PUT } = await import('@/app/api/notes/route');

const USER = { id: 'user-1' };

const get = (query = '?lessonKey=calc-1') =>
  new NextRequest(`http://localhost:3000/api/notes${query}`);

const put = (body: unknown) =>
  new Request('http://localhost:3000/api/notes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const validBody = {
  lessonKey: 'calc-1',
  slideId: 'power',
  notes: 'bring the 2 down',
  strokes: [
    {
      points: [
        [0, 0],
        [10, 20],
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  setRateLimitStore(new MemoryStore());
  requireUser.mockResolvedValue(USER);
  getLessonNotes.mockResolvedValue({ power: { notes: 'hi', strokes: null } });
  upsertSlideNote.mockResolvedValue({ ok: true });
});

describe('the notes rate limit tier exists', () => {
  it('registers the bucket so consume typechecks', () => {
    expect(TIERS.notes).toBeDefined();
  });
});

describe('GET /api/notes', () => {
  it('hands back every slide note for the lesson', async () => {
    const res = await GET(get());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ notes: { power: { notes: 'hi', strokes: null } } });
    expect(getLessonNotes).toHaveBeenCalledWith('user-1', 'calc-1');
  });

  it('refuses a signed out reader', async () => {
    requireUser.mockResolvedValue(null);
    const res = await GET(get());
    expect(res.status).toBe(401);
    expect(getLessonNotes).not.toHaveBeenCalled();
  });

  it('needs a lessonKey', async () => {
    const res = await GET(get(''));
    expect(res.status).toBe(400);
  });

  it('404s on a lesson that does not exist', async () => {
    getLessonNotes.mockResolvedValue(null);
    const res = await GET(get());
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/notes', () => {
  it('saves a slide note', async () => {
    const res = await PUT(put(validBody));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
    expect(upsertSlideNote).toHaveBeenCalledWith('user-1', 'calc-1', 'power', {
      notes: 'bring the 2 down',
      strokes: [
        {
          points: [
            [0, 0],
            [10, 20],
          ],
        },
      ],
    });
  });

  it('refuses a signed out writer', async () => {
    requireUser.mockResolvedValue(null);
    const res = await PUT(put(validBody));
    expect(res.status).toBe(401);
    expect(upsertSlideNote).not.toHaveBeenCalled();
  });

  it('404s on a lesson that does not exist', async () => {
    upsertSlideNote.mockResolvedValue(null);
    const res = await PUT(put(validBody));
    expect(res.status).toBe(404);
  });

  it('rejects a body that is not json', async () => {
    const res = await PUT(put('not json'));
    expect(res.status).toBe(400);
    expect(upsertSlideNote).not.toHaveBeenCalled();
  });

  it('rejects notes longer than the cap', async () => {
    const res = await PUT(put({ ...validBody, notes: 'x'.repeat(10_001) }));
    expect(res.status).toBe(400);
  });

  it('rejects more strokes than the cap', async () => {
    const strokes = Array.from({ length: 401 }, () => ({ points: [[0, 0]] }));
    const res = await PUT(put({ ...validBody, strokes }));
    expect(res.status).toBe(400);
  });

  it('rejects a payload that squeaks past the per stroke cap on total points', async () => {
    const stroke = { points: Array.from({ length: 2000 }, (_, i) => [i % 1000, 0]) };
    const strokes = Array.from({ length: 20 }, () => stroke);
    const res = await PUT(put({ ...validBody, strokes }));
    expect(res.status).toBe(400);
    expect(upsertSlideNote).not.toHaveBeenCalled();
  });

  it('rejects coordinates outside the grid', async () => {
    const res = await PUT(put({ ...validBody, strokes: [{ points: [[0, 99_999]] }] }));
    expect(res.status).toBe(400);
  });

  it('rate limits a learner who spams saves', async () => {
    const max = TIERS.notes.max;
    for (let i = 0; i < max; i++) {
      expect((await PUT(put(validBody))).status).toBe(200);
    }
    const res = await PUT(put(validBody));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });
});
