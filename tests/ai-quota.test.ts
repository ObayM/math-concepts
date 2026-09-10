import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MemoryQuotaStore,
  setQuotaStore,
  spendQuota,
  recordTokens,
  quotaExceeded,
  utcDay,
  endOfUtcDay,
  endOfUtcMonth,
  QUOTAS,
} from '@/lib/ai-quota';

const store = new MemoryQuotaStore();

beforeEach(() => {
  store.reset();
  setQuotaStore(store);
  vi.unstubAllEnvs();
});

afterEach(() => vi.unstubAllEnvs());

describe('the day key', () => {
  it('is utc, so a user cannot get two resets by moving their clock', () => {
    expect(utcDay(new Date('2026-09-10T23:59:59Z'))).toBe('2026-09-10');
    expect(utcDay(new Date('2026-09-11T00:00:01Z'))).toBe('2026-09-11');
  });

  it('rolls over at midnight utc', () => {
    expect(endOfUtcDay(new Date('2026-09-10T13:00:00Z')).toISOString()).toBe(
      '2026-09-11T00:00:00.000Z'
    );
  });

  it('rolls the month over at the first', () => {
    expect(endOfUtcMonth(new Date('2026-09-10T13:00:00Z')).toISOString()).toBe(
      '2026-10-01T00:00:00.000Z'
    );
  });
});

describe('the daily cap', () => {
  it('allows exactly the quota and refuses the next one', async () => {
    const limit = QUOTAS.chat.perDay;
    for (let i = 0; i < limit; i++) {
      const r = await spendQuota('u1', 'chat');
      expect(r.ok, `call ${i + 1}`).toBe(true);
    }
    const over = await spendQuota('u1', 'chat');
    expect(over.ok).toBe(false);
    expect(over.scope).toBe('day');
    expect(over.limit).toBe(limit);
  });

  it('is per user', async () => {
    for (let i = 0; i < QUOTAS.chat.perDay + 1; i++) await spendQuota('noisy', 'chat');
    expect((await spendQuota('quiet', 'chat')).ok).toBe(true);
  });

  it('is per feature', async () => {
    for (let i = 0; i < QUOTAS.chat.perDay + 1; i++) await spendQuota('u1', 'chat');
    expect((await spendQuota('u1', 'generate-scene')).ok).toBe(true);
  });

  it('resets the next day', async () => {
    const today = new Date('2026-09-10T12:00:00Z');
    for (let i = 0; i < QUOTAS.chat.perDay + 1; i++) await spendQuota('u1', 'chat', today);
    expect((await spendQuota('u1', 'chat', today)).ok).toBe(false);

    const tomorrow = new Date('2026-09-11T12:00:00Z');
    expect((await spendQuota('u1', 'chat', tomorrow)).ok).toBe(true);
  });
});

describe('the global budget', () => {
  it('is off unless configured', async () => {
    for (let i = 0; i < 5; i++) await recordTokens('u1', 'chat', { inputTokens: 1 });
    expect((await spendQuota('u2', 'chat')).ok).toBe(true);
  });

  it('stops everyone once the day is spent', async () => {
    vi.stubEnv('AI_DAILY_CALL_BUDGET', '3');
    for (let i = 0; i < 3; i++) await recordTokens('u1', 'chat', { inputTokens: 1 });

    const blocked = await spendQuota('someone-else', 'chat');
    expect(blocked.ok).toBe(false);
    expect(blocked.scope).toBe('budget');
  });
});

describe('when the database is down', () => {
  const broken = {
    spend: async () => {
      throw new Error('db down');
    },
    record: async () => {},
    globalCalls: async () => 0,
  };

  it('closes the tutor rather than risk an unbounded bill', async () => {
    setQuotaStore(broken);
    expect((await spendQuota('u1', 'chat')).ok).toBe(false);
  });

  it('leaves admin authoring working, because a blocked author is worse', async () => {
    setQuotaStore(broken);
    expect((await spendQuota('u1', 'generate-lesson')).ok).toBe(true);
  });
});

describe('the refusal response', () => {
  it('tells the client which ceiling was hit and when it lifts', async () => {
    const resetsAt = new Date('2026-09-11T00:00:00Z');
    const res = quotaExceeded({ ok: false, used: 61, limit: 60, scope: 'day', resetsAt });
    expect(res.status).toBe(429);
    expect(res.headers.get('x-quota-scope')).toBe('day');
    expect(res.headers.get('x-quota-reset')).toBe(resetsAt.toISOString());
  });

  it('uses 503 for a global budget stop, which is not the user being noisy', async () => {
    const res = quotaExceeded({
      ok: false,
      used: 5000,
      limit: 5000,
      scope: 'budget',
      resetsAt: new Date('2026-09-11T00:00:00Z'),
    });
    expect(res.status).toBe(503);
  });
});
