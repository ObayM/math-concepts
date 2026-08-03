import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryStore, setRateLimitStore, TIERS } from '@/lib/rate-limit';

const requireUser = vi.fn();
const startWarmupSession = vi.fn();
const endWarmupSession = vi.fn();
const recordWarmupAnswers = vi.fn();
const exportWarmupCsv = vi.fn();
const getUserTimeZone = vi.fn();
const setTimeZoneIfUnset = vi.fn();

vi.mock('@/lib/session', () => ({ requireUser: () => requireUser() }));

vi.mock('@/lib/db/userService', () => ({
  getUserTimeZone: (...args: unknown[]) => getUserTimeZone(...args),
  setTimeZoneIfUnset: (...args: unknown[]) => setTimeZoneIfUnset(...args),
}));

vi.mock('@/lib/db/warmupService', () => ({
  MAX_SESSION_ANSWERS: 500,
  startWarmupSession: (...args: unknown[]) => startWarmupSession(...args),
  endWarmupSession: (...args: unknown[]) => endWarmupSession(...args),
  recordWarmupAnswers: (...args: unknown[]) => recordWarmupAnswers(...args),
  exportWarmupCsv: (...args: unknown[]) => exportWarmupCsv(...args),
}));

const { POST: startSession, PATCH: endSession } = await import('@/app/api/warmup/session/route');
const { POST: postAnswers } = await import('@/app/api/warmup/answers/route');
const { GET: getExport } = await import('@/app/api/warmup/export/route');

const USER = { id: 'user-1' };

const post = (body: unknown, url = 'http://localhost:3000/api/warmup/session') =>
  new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const patch = (body: unknown) =>
  new Request('http://localhost:3000/api/warmup/session', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  setRateLimitStore(new MemoryStore());
  requireUser.mockResolvedValue(USER);
  getUserTimeZone.mockResolvedValue('UTC');
  startWarmupSession.mockResolvedValue({ sessionId: 's1', level: 3, seed: 'abcd' });
  endWarmupSession.mockResolvedValue({ id: 's1', answered: 4, correct: 3 });
  recordWarmupAnswers.mockResolvedValue({ answered: 2, correct: 2, xp: 2 });
  exportWarmupCsv.mockResolvedValue('a,b\r\n1,2\r\n');
});

describe('the rate limit tiers exist', () => {
  it('registers both warm up buckets so consume typechecks', () => {
    expect(TIERS.warmup).toBeDefined();
    expect(TIERS['warmup-export']).toBeDefined();
    expect(TIERS['warmup-export'].max).toBeLessThan(TIERS.warmup.max);
  });
});

describe('POST /api/warmup/session', () => {
  it('starts a session and hands back a server issued seed', async () => {
    const res = await startSession(post({ level: 3, timezone: 'Europe/London' }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      sessionId: 's1',
      level: 3,
      seed: 'abcd',
    });
    expect(startWarmupSession).toHaveBeenCalledWith('user-1', 3, 'UTC');
  });

  it('refuses an anonymous visitor', async () => {
    requireUser.mockResolvedValue(null);
    const res = await startSession(post({ level: 3 }));
    expect(res.status).toBe(401);
    expect(startWarmupSession).not.toHaveBeenCalled();
  });

  it('rejects a level outside the ladder before touching the database', async () => {
    for (const level of [0, 11, -3, 2.5, '3', null]) {
      const res = await startSession(post({ level }));
      expect(res.status, String(level)).toBe(400);
    }
    expect(startWarmupSession).not.toHaveBeenCalled();
  });

  it('rejects a missing or unparseable body', async () => {
    expect((await startSession(post({}))).status).toBe(400);
    expect((await startSession(post('not json'))).status).toBe(400);
  });

  it('stores the browser timezone only when the account has none', async () => {
    getUserTimeZone.mockResolvedValue(null);
    setTimeZoneIfUnset.mockResolvedValue('Asia/Tokyo');
    await startSession(post({ level: 1, timezone: 'Asia/Tokyo' }));
    expect(setTimeZoneIfUnset).toHaveBeenCalledWith('user-1', 'Asia/Tokyo');
    expect(startWarmupSession).toHaveBeenCalledWith('user-1', 1, 'Asia/Tokyo');
  });

  it('keeps the stored timezone over whatever the browser claims', async () => {
    getUserTimeZone.mockResolvedValue('UTC');
    await startSession(post({ level: 1, timezone: 'Asia/Tokyo' }));
    expect(setTimeZoneIfUnset).not.toHaveBeenCalled();
    expect(startWarmupSession).toHaveBeenCalledWith('user-1', 1, 'UTC');
  });

  it('reports a level the service rejects as a bad request', async () => {
    startWarmupSession.mockResolvedValue(null);
    expect((await startSession(post({ level: 10 }))).status).toBe(400);
  });

  it('runs out of tokens after the tier allows', async () => {
    for (let i = 0; i < TIERS.warmup.max; i++) {
      expect((await startSession(post({ level: 1 }))).status).toBe(200);
    }
    const res = await startSession(post({ level: 1 }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });

  it('meters each student separately', async () => {
    for (let i = 0; i < TIERS.warmup.max; i++) await startSession(post({ level: 1 }));
    requireUser.mockResolvedValue({ id: 'user-2' });
    expect((await startSession(post({ level: 1 }))).status).toBe(200);
  });
});

describe('PATCH /api/warmup/session', () => {
  it('ends a session and returns its summary', async () => {
    const res = await endSession(patch({ sessionId: 's1' }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ session: { answered: 4, correct: 3 } });
    expect(endWarmupSession).toHaveBeenCalledWith('user-1', 's1');
  });

  it('refuses an anonymous visitor', async () => {
    requireUser.mockResolvedValue(null);
    expect((await endSession(patch({ sessionId: 's1' }))).status).toBe(401);
  });

  it('404s a session the service will not hand over', async () => {
    endWarmupSession.mockResolvedValue(null);
    expect((await endSession(patch({ sessionId: 'someone-elses' }))).status).toBe(404);
  });

  it('rejects a blank session id', async () => {
    expect((await endSession(patch({ sessionId: '' }))).status).toBe(400);
    expect((await endSession(patch({}))).status).toBe(400);
  });
});

describe('POST /api/warmup/answers', () => {
  const url = 'http://localhost:3000/api/warmup/answers';
  const body = (answers: unknown, sessionId = 's1') => post({ sessionId, answers }, url);

  it('flushes a batch and returns the server’s own verdict', async () => {
    const res = await postAnswers(
      body([
        { idx: 0, given: '56', elapsedMs: 1400 },
        { idx: 1, given: '12', elapsedMs: 900 },
      ])
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      session: { answered: 2, correct: 2, xp: 2 },
    });
  });

  it('passes only idx, given and elapsedMs through, never a client verdict', async () => {
    await postAnswers(
      body([
        {
          idx: 0,
          given: '999',
          elapsedMs: 10,
          correct: true,
          prompt: '1 + 1',
          answer: '999',
          xp: 9999,
        },
      ])
    );
    const [, , answers] = recordWarmupAnswers.mock.calls[0];
    expect(answers).toEqual([{ idx: 0, given: '999', elapsedMs: 10 }]);
    expect(answers[0]).not.toHaveProperty('correct');
    expect(answers[0]).not.toHaveProperty('answer');
  });

  it('refuses an anonymous visitor', async () => {
    requireUser.mockResolvedValue(null);
    expect((await postAnswers(body([{ idx: 0, given: '1', elapsedMs: 1 }]))).status).toBe(401);
    expect(recordWarmupAnswers).not.toHaveBeenCalled();
  });

  it('404s when the session is not the caller’s', async () => {
    recordWarmupAnswers.mockResolvedValue(null);
    expect((await postAnswers(body([{ idx: 0, given: '1', elapsedMs: 1 }]))).status).toBe(404);
  });

  it('rejects an empty batch rather than doing a pointless write', async () => {
    expect((await postAnswers(body([]))).status).toBe(400);
    expect(recordWarmupAnswers).not.toHaveBeenCalled();
  });

  it('caps how many answers one request may carry', async () => {
    const fifty = Array.from({ length: 50 }, (_, i) => ({ idx: i, given: '1', elapsedMs: 1 }));
    expect((await postAnswers(body(fifty))).status).toBe(200);
    expect(
      (await postAnswers(body([...fifty, { idx: 50, given: '1', elapsedMs: 1 }]))).status
    ).toBe(400);
  });

  it('rejects an index outside the session cap', async () => {
    for (const idx of [-1, 500, 1.5, 99999]) {
      expect(
        (await postAnswers(body([{ idx, given: '1', elapsedMs: 1 }]))).status,
        String(idx)
      ).toBe(400);
    }
  });

  it('rejects a typed answer long enough to be an attack', async () => {
    expect(
      (await postAnswers(body([{ idx: 0, given: '9'.repeat(500), elapsedMs: 1 }]))).status
    ).toBe(400);
  });

  it('rejects a non finite time', async () => {
    for (const elapsedMs of ['abc', null, {}]) {
      expect((await postAnswers(body([{ idx: 0, given: '1', elapsedMs }]))).status).toBe(400);
    }
  });

  it('accepts a blank answer, because running out of time is an answer', async () => {
    expect((await postAnswers(body([{ idx: 0, given: '', elapsedMs: 5000 }]))).status).toBe(200);
    expect((await postAnswers(body([{ idx: 1, given: null, elapsedMs: 5000 }]))).status).toBe(200);
    expect((await postAnswers(body([{ idx: 2, elapsedMs: 5000 }]))).status).toBe(200);
  });

  it('rejects a blank session id', async () => {
    expect((await postAnswers(body([{ idx: 0, given: '1', elapsedMs: 1 }], ''))).status).toBe(400);
  });

  it('shares the warm up bucket with session start', async () => {
    for (let i = 0; i < TIERS.warmup.max; i++) {
      await postAnswers(body([{ idx: i, given: '1', elapsedMs: 1 }]));
    }
    expect((await startSession(post({ level: 1 }))).status).toBe(429);
  });
});

describe('GET /api/warmup/export', () => {
  const get = (query = '') =>
    new Request(`http://localhost:3000/api/warmup/export${query}`, { method: 'GET' });

  it('returns a csv attachment', async () => {
    const res = await getExport(get());
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(res.headers.get('Content-Disposition')).toContain('mathly-warmup-sessions.csv');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    await expect(res.text()).resolves.toBe('a,b\r\n1,2\r\n');
  });

  it('exports the answer level detail when asked', async () => {
    const res = await getExport(get('?scope=answers'));
    expect(exportWarmupCsv).toHaveBeenCalledWith('user-1', 'answers');
    expect(res.headers.get('Content-Disposition')).toContain('mathly-warmup-answers.csv');
  });

  it('falls back to sessions for any unknown scope, rather than erroring', async () => {
    for (const query of ['', '?scope=', '?scope=everything', '?scope=../../etc/passwd']) {
      await getExport(get(query));
      expect(exportWarmupCsv).toHaveBeenLastCalledWith('user-1', 'sessions');
    }
  });

  it('refuses an anonymous visitor', async () => {
    requireUser.mockResolvedValue(null);
    expect((await getExport(get())).status).toBe(401);
    expect(exportWarmupCsv).not.toHaveBeenCalled();
  });

  it('is metered far tighter than the drill loop', async () => {
    for (let i = 0; i < TIERS['warmup-export'].max; i++) {
      expect((await getExport(get())).status).toBe(200);
    }
    expect((await getExport(get())).status).toBe(429);
  });

  it('never exports on behalf of another account', async () => {
    await getExport(get('?scope=answers'));
    expect(exportWarmupCsv).toHaveBeenCalledWith('user-1', 'answers');
  });
});
