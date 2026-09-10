import { NextResponse } from 'next/server';
import { prisma } from './prisma';

export const QUOTAS = {
  chat: { perDay: 60, perMonth: 600 },
  'generate-scene': { perDay: 60, perMonth: 900 },
  'generate-lesson': { perDay: 30, perMonth: 400 },
} as const;

export type Feature = keyof typeof QUOTAS;

export const FAIL_CLOSED: Record<Feature, boolean> = {
  chat: true,
  'generate-scene': false,
  'generate-lesson': false,
};

export interface QuotaResult {
  ok: boolean;
  used: number;
  limit: number;
  scope: 'day' | 'month' | 'budget';
  resetsAt: Date;
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface QuotaStore {
  spend(userId: string, feature: Feature, day: string): Promise<{ day: number; month: number }>;
  record(userId: string, feature: Feature, day: string, usage: TokenUsage): Promise<void>;
  globalCalls(day: string): Promise<number>;
}

export function utcDay(at: Date = new Date()): string {
  return at.toISOString().slice(0, 10);
}

export function endOfUtcDay(at: Date = new Date()): Date {
  const next = new Date(at);
  next.setUTCHours(24, 0, 0, 0);
  return next;
}

export function endOfUtcMonth(at: Date = new Date()): Date {
  const next = new Date(at);
  next.setUTCMonth(next.getUTCMonth() + 1, 1);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function globalDailyCap(): number {
  const raw = Number.parseInt(process.env.AI_DAILY_CALL_BUDGET ?? '', 10);
  return Number.isNaN(raw) || raw <= 0 ? Infinity : raw;
}

export class PrismaQuotaStore implements QuotaStore {
  async spend(userId: string, feature: Feature, day: string) {
    const row = await prisma.aiUsage.upsert({
      where: { userId_day_feature: { userId, day, feature } },
      create: { userId, day, feature, calls: 1 },
      update: { calls: { increment: 1 } },
      select: { calls: true },
    });

    const month = await prisma.aiUsage.aggregate({
      where: { userId, feature, day: { startsWith: day.slice(0, 7) } },
      _sum: { calls: true },
    });

    return { day: row.calls, month: month._sum.calls ?? 0 };
  }

  async record(userId: string, feature: Feature, day: string, usage: TokenUsage) {
    const input = Math.max(0, Math.round(usage.inputTokens ?? 0));
    const output = Math.max(0, Math.round(usage.outputTokens ?? 0));
    if (!input && !output) return;

    await prisma.aiUsage.update({
      where: { userId_day_feature: { userId, day, feature } },
      data: { inputTokens: { increment: input }, outputTokens: { increment: output } },
    });
    await prisma.aiSpend.upsert({
      where: { day },
      create: { day, calls: 1, inputTokens: input, outputTokens: output },
      update: {
        calls: { increment: 1 },
        inputTokens: { increment: input },
        outputTokens: { increment: output },
      },
    });
  }

  async globalCalls(day: string) {
    const row = await prisma.aiSpend.findUnique({ where: { day }, select: { calls: true } });
    return row?.calls ?? 0;
  }
}

export class MemoryQuotaStore implements QuotaStore {
  private days = new Map<string, number>();
  private global = new Map<string, number>();

  async spend(userId: string, feature: Feature, day: string) {
    const key = `${userId}:${feature}:${day}`;
    const next = (this.days.get(key) ?? 0) + 1;
    this.days.set(key, next);

    const prefix = `${userId}:${feature}:${day.slice(0, 7)}`;
    let month = 0;
    for (const [k, v] of this.days) if (k.startsWith(prefix)) month += v;

    return { day: next, month };
  }

  async record(_userId: string, _feature: Feature, day: string, _usage: TokenUsage) {
    this.global.set(day, (this.global.get(day) ?? 0) + 1);
  }

  async globalCalls(day: string) {
    return this.global.get(day) ?? 0;
  }

  reset() {
    this.days.clear();
    this.global.clear();
  }
}

const holder = globalThis as typeof globalThis & { __mathlyAiQuota?: QuotaStore };
holder.__mathlyAiQuota ??= new PrismaQuotaStore();

export function setQuotaStore(next: QuotaStore): void {
  holder.__mathlyAiQuota = next;
}

export async function spendQuota(
  userId: string,
  feature: Feature,
  now: Date = new Date()
): Promise<QuotaResult> {
  const day = utcDay(now);
  const { perDay, perMonth } = QUOTAS[feature];

  try {
    const cap = globalDailyCap();
    if (cap !== Infinity) {
      const spent = await holder.__mathlyAiQuota!.globalCalls(day);
      if (spent >= cap) {
        return { ok: false, used: spent, limit: cap, scope: 'budget', resetsAt: endOfUtcDay(now) };
      }
    }

    const { day: used, month } = await holder.__mathlyAiQuota!.spend(userId, feature, day);
    if (used > perDay) {
      return { ok: false, used, limit: perDay, scope: 'day', resetsAt: endOfUtcDay(now) };
    }
    if (month > perMonth) {
      return {
        ok: false,
        used: month,
        limit: perMonth,
        scope: 'month',
        resetsAt: endOfUtcMonth(now),
      };
    }
    return { ok: true, used, limit: perDay, scope: 'day', resetsAt: endOfUtcDay(now) };
  } catch (err) {
    console.error('[ai-quota] spend failed for %s/%s', feature, userId, err);
    if (FAIL_CLOSED[feature]) {
      return { ok: false, used: 0, limit: perDay, scope: 'day', resetsAt: endOfUtcDay(now) };
    }
    return { ok: true, used: 0, limit: perDay, scope: 'day', resetsAt: endOfUtcDay(now) };
  }
}

export async function recordTokens(
  userId: string,
  feature: Feature,
  usage: TokenUsage,
  now: Date = new Date()
): Promise<void> {
  try {
    await holder.__mathlyAiQuota!.record(userId, feature, utcDay(now), usage);
  } catch (err) {
    console.error('[ai-quota] token record failed for %s/%s', feature, userId, err);
  }
}

export function quotaExceeded(result: QuotaResult) {
  const status = result.scope === 'budget' ? 503 : 429;
  return NextResponse.json(
    {
      error: result.scope === 'budget' ? 'AI budget reached' : 'AI quota reached',
      scope: result.scope,
      limit: result.limit,
      resetsAt: result.resetsAt.toISOString(),
    },
    {
      status,
      headers: {
        'X-Quota-Scope': result.scope,
        'X-Quota-Reset': result.resetsAt.toISOString(),
        'Retry-After': String(
          Math.max(1, Math.ceil((result.resetsAt.getTime() - Date.now()) / 1000))
        ),
      },
    }
  );
}
