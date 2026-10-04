import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryStore, setRateLimitStore } from '@/lib/rate-limit';

const saveTopic = vi.fn();
const recordAudit = vi.fn();

vi.mock('@/lib/db/contentService', () => ({
  saveTopic: (...args: unknown[]) => saveTopic(...args),
}));
vi.mock('@/lib/db/auditService', () => ({
  recordAudit: (...args: unknown[]) => recordAudit(...args),
  AUDIT: { LESSON_CREATED: 'lesson.created', LESSON_PUBLISHED: 'lesson.published' },
}));

const { POST } = await import('@/app/api/content/topics/route');

const SOURCE = 'lesson "Chain rule" { slide "One" { > hi } }';

const post = (body: unknown, auth?: string) =>
  new Request('http://localhost:3000/api/content/topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth && { authorization: auth }) },
    body: JSON.stringify(body),
  });

const LESSON = {
  id: 'l1',
  lessonKey: 'topic-chain-rule-abc12',
  lang: 'en',
  title: 'Chain rule',
  status: 'published',
};

beforeEach(() => {
  vi.clearAllMocks();
  setRateLimitStore(new MemoryStore());
  vi.stubEnv('CONTENT_API_TOKEN', 'right-token');
  saveTopic.mockResolvedValue({ lesson: LESSON, findings: [], created: true, published: true });
});

afterEach(() => vi.unstubAllEnvs());

describe('the content api token', () => {
  it('refuses a request with no token', async () => {
    const res = await POST(post({ source: SOURCE, lang: 'en' }));
    expect(res.status).toBe(401);
    expect(saveTopic).not.toHaveBeenCalled();
  });

  it('refuses the wrong token', async () => {
    const res = await POST(post({ source: SOURCE, lang: 'en' }, 'Bearer wrong-token'));
    expect(res.status).toBe(401);
    expect(saveTopic).not.toHaveBeenCalled();
  });

  it('is off entirely when no token is configured', async () => {
    vi.stubEnv('CONTENT_API_TOKEN', '');
    const res = await POST(post({ source: SOURCE, lang: 'en' }, 'Bearer '));
    expect(res.status).toBe(503);
  });

  it('creates and publishes with the right token, and audits it', async () => {
    const res = await POST(
      post({ source: SOURCE, lang: 'en', publish: true }, 'Bearer right-token')
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.key).toBe(LESSON.lessonKey);
    expect(body.url).toMatch(/\/topics\/topic-chain-rule-abc12$/);
    expect(saveTopic).toHaveBeenCalledWith(
      expect.objectContaining({ publish: true, authorId: null })
    );
    expect(recordAudit.mock.calls.map((c) => c[0].action)).toEqual([
      'lesson.created',
      'lesson.published',
    ]);
  });
});

describe('the request body', () => {
  it('needs a language for a new topic', async () => {
    const res = await POST(post({ source: SOURCE }, 'Bearer right-token'));
    expect(res.status).toBe(400);
  });

  it('turns a course lesson key into a 404, not an edit', async () => {
    saveTopic.mockResolvedValue({ notFound: true });
    const res = await POST(post({ source: SOURCE, key: 'calc-1' }, 'Bearer right-token'));
    expect(res.status).toBe(404);
  });

  it('passes a compile error back with its detail', async () => {
    saveTopic.mockResolvedValue({ error: 'line 1: expected {' });
    const res = await POST(post({ source: 'lesson', lang: 'en' }, 'Bearer right-token'));
    expect(res.status).toBe(422);
    expect((await res.json()).detail).toContain('expected');
  });
});
