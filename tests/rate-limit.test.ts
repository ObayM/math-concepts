import { describe, it, expect } from 'vitest';
import { MemoryStore, TIERS, consume, setRateLimitStore } from '@/lib/rate-limit';

function clock(start = 1_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe('MemoryStore', () => {
  it('spends the burst then refuses', () => {
    const c = clock();
    const store = new MemoryStore(c.now);
    for (let i = 0; i < 5; i++) expect(store.take('k', 5, 5).ok).toBe(true);
    expect(store.take('k', 5, 5).ok).toBe(false);
  });

  it('counts down remaining', () => {
    const store = new MemoryStore(clock().now);
    expect(store.take('k', 3, 3).remaining).toBe(2);
    expect(store.take('k', 3, 3).remaining).toBe(1);
    expect(store.take('k', 3, 3).remaining).toBe(0);
  });

  it('refills over time', () => {
    const c = clock();
    const store = new MemoryStore(c.now);
    for (let i = 0; i < 5; i++) store.take('k', 5, 5);
    expect(store.take('k', 5, 5).ok).toBe(false);
    c.advance(12_000);
    expect(store.take('k', 5, 5).ok).toBe(true);
    expect(store.take('k', 5, 5).ok).toBe(false);
  });

  it('never refills past max', () => {
    const c = clock();
    const store = new MemoryStore(c.now);
    store.take('k', 5, 5);
    c.advance(600_000);
    for (let i = 0; i < 5; i++) expect(store.take('k', 5, 5).ok).toBe(true);
    expect(store.take('k', 5, 5).ok).toBe(false);
  });

  it('reports a usable retryAfterMs', () => {
    const c = clock();
    const store = new MemoryStore(c.now);
    for (let i = 0; i < 2; i++) store.take('k', 2, 2);
    const denied = store.take('k', 2, 2);
    expect(denied.ok).toBe(false);
    expect(denied.retryAfterMs).toBe(30_000);
    c.advance(denied.retryAfterMs);
    expect(store.take('k', 2, 2).ok).toBe(true);
  });

  it('keeps keys independent', () => {
    const store = new MemoryStore(clock().now);
    for (let i = 0; i < 2; i++) store.take('a', 2, 2);
    expect(store.take('a', 2, 2).ok).toBe(false);
    expect(store.take('b', 2, 2).ok).toBe(true);
  });

  it('evicts fully refilled buckets so the map does not grow forever', () => {
    const c = clock();
    const store = new MemoryStore(c.now);
    for (let i = 0; i < 50; i++) store.take(`k${i}`, 60, 60);
    expect(store.size()).toBe(50);

    c.advance(120_000);
    store.take('trigger', 60, 60);
    expect(store.size()).toBe(1);
  });

  it('keeps a still-throttled bucket through a sweep', () => {
    const c = clock();
    const store = new MemoryStore(c.now);
    for (let i = 0; i < 10; i++) store.take('hot', 10, 1);
    expect(store.take('hot', 10, 1).ok).toBe(false);

    c.advance(61_000);
    store.take('other', 60, 60);
    expect(store.size()).toBe(2);
    expect(store.take('hot', 10, 1).ok).toBe(true);
    expect(store.take('hot', 10, 1).ok).toBe(false);
  });
});

describe('consume', () => {
  it('namespaces buckets by tier so one route cannot drain another', async () => {
    setRateLimitStore(new MemoryStore(clock().now));
    for (let i = 0; i < TIERS['generate-lesson'].max; i++) {
      expect((await consume('u1', 'generate-lesson')).ok).toBe(true);
    }
    expect((await consume('u1', 'generate-lesson')).ok).toBe(false);
    expect((await consume('u1', 'generate')).ok).toBe(true);
    expect((await consume('u2', 'generate-lesson')).ok).toBe(true);
  });

  it('covers every route that takes writes', () => {
    for (const tier of [
      'chat',
      'generate',
      'generate-lesson',
      'content-save',
      'practice',
      'progress',
      'activity',
      'profile',
      'settings',
      'username',
      'check-username',
      'verify-email',
    ] as const) {
      expect(TIERS[tier].max).toBeGreaterThan(0);
      expect(TIERS[tier].perMin).toBeGreaterThan(0);
    }
  });
});
