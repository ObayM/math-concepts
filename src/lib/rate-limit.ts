import { NextResponse } from 'next/server';

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

export interface RateLimitStore {
  take(key: string, max: number, perMin: number): RateLimitResult | Promise<RateLimitResult>;
}

export const TIERS = {
  chat: { max: 20, perMin: 20 },
  generate: { max: 5, perMin: 5 },
  'generate-lesson': { max: 2, perMin: 2 },
  'content-save': { max: 30, perMin: 30 },
  practice: { max: 60, perMin: 60 },
  progress: { max: 60, perMin: 60 },
  activity: { max: 60, perMin: 60 },
  profile: { max: 10, perMin: 10 },
  settings: { max: 10, perMin: 10 },
  username: { max: 5, perMin: 5 },
  'check-username': { max: 30, perMin: 30 },
  'verify-email': { max: 3, perMin: 3 },
} as const;

export type Tier = keyof typeof TIERS;

type Bucket = { tokens: number; last: number; max: number; perMin: number };

const SWEEP_INTERVAL_MS = 60_000;
const MAX_KEYS = 10_000;

export class MemoryStore implements RateLimitStore {
  private buckets = new Map<string, Bucket>();
  private lastSweep: number;
  private now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
    this.lastSweep = now();
  }

  take(key: string, max: number, perMin: number): RateLimitResult {
    const now = this.now();
    if (now - this.lastSweep > SWEEP_INTERVAL_MS) this.sweep(now);

    const prev = this.buckets.get(key);
    const tokens = prev ? Math.min(max, prev.tokens + ((now - prev.last) / 60_000) * perMin) : max;

    if (tokens < 1) {
      this.buckets.set(key, { tokens, last: now, max, perMin });
      return {
        ok: false,
        remaining: 0,
        retryAfterMs: Math.ceil(((1 - tokens) / perMin) * 60_000),
      };
    }

    this.buckets.set(key, { tokens: tokens - 1, last: now, max, perMin });
    this.trim();
    return { ok: true, remaining: Math.floor(tokens - 1), retryAfterMs: 0 };
  }

  size(): number {
    return this.buckets.size;
  }

  private sweep(now: number): void {
    for (const [key, b] of this.buckets) {
      if (b.tokens + ((now - b.last) / 60_000) * b.perMin >= b.max) this.buckets.delete(key);
    }
    this.lastSweep = now;
  }

  private trim(): void {
    if (this.buckets.size <= MAX_KEYS) return;
    const oldest = [...this.buckets.entries()].sort((a, b) => a[1].last - b[1].last);
    for (let i = 0; i < this.buckets.size - MAX_KEYS; i++) this.buckets.delete(oldest[i][0]);
  }
}

const holder = globalThis as typeof globalThis & { __mathlyRateLimit?: RateLimitStore };
holder.__mathlyRateLimit ??= new MemoryStore();

export function setRateLimitStore(next: RateLimitStore): void {
  holder.__mathlyRateLimit = next;
}

export async function consume(key: string, tier: Tier): Promise<RateLimitResult> {
  const { max, perMin } = TIERS[tier];
  return holder.__mathlyRateLimit!.take(`${tier}:${key}`, max, perMin);
}

export function tooManyRequests(retryAfterMs: number) {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil(retryAfterMs / 1000))) } }
  );
}
