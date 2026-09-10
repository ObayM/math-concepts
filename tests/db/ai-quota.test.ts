import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaQuotaStore, setQuotaStore, spendQuota, recordTokens, QUOTAS } from '@/lib/ai-quota';
import { prisma } from '@/lib/prisma';
import { makeUser } from '../helpers/factories';

beforeEach(() => setQuotaStore(new PrismaQuotaStore()));

describe('the quota survives a restart, unlike the in-memory limiter', () => {
  it('counts calls in the database', async () => {
    const user = await makeUser();
    await spendQuota(user.id, 'chat');
    await spendQuota(user.id, 'chat');

    const row = await prisma.aiUsage.findUniqueOrThrow({
      where: {
        userId_day_feature: {
          userId: user.id,
          day: new Date().toISOString().slice(0, 10),
          feature: 'chat',
        },
      },
    });
    expect(row.calls).toBe(2);
  });

  it('increments atomically under concurrent calls, so nothing is lost to a race', async () => {
    const user = await makeUser();
    await Promise.all(Array.from({ length: 12 }, () => spendQuota(user.id, 'chat')));

    const row = await prisma.aiUsage.findUniqueOrThrow({
      where: {
        userId_day_feature: {
          userId: user.id,
          day: new Date().toISOString().slice(0, 10),
          feature: 'chat',
        },
      },
    });
    expect(row.calls).toBe(12);
  });

  it('refuses once the day is spent', async () => {
    const user = await makeUser();
    for (let i = 0; i < QUOTAS.chat.perDay; i++) {
      expect((await spendQuota(user.id, 'chat')).ok).toBe(true);
    }
    const over = await spendQuota(user.id, 'chat');
    expect(over.ok).toBe(false);
    expect(over.scope).toBe('day');
  });

  it('keeps a real token ledger, not just a call count', async () => {
    const user = await makeUser();
    await spendQuota(user.id, 'chat');
    await recordTokens(user.id, 'chat', { inputTokens: 1500, outputTokens: 320 });
    await spendQuota(user.id, 'chat');
    await recordTokens(user.id, 'chat', { inputTokens: 900, outputTokens: 210 });

    const row = await prisma.aiUsage.findUniqueOrThrow({
      where: {
        userId_day_feature: {
          userId: user.id,
          day: new Date().toISOString().slice(0, 10),
          feature: 'chat',
        },
      },
    });
    expect(row.inputTokens).toBe(2400);
    expect(row.outputTokens).toBe(530);
  });

  it('goes away with the user, so deletion stays complete', async () => {
    const user = await makeUser();
    await spendQuota(user.id, 'chat');
    await prisma.user.delete({ where: { id: user.id } });
    expect(await prisma.aiUsage.count({ where: { userId: user.id } })).toBe(0);
  });
});
