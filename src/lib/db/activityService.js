import { prisma } from '@/lib/prisma';
import { addDays, dayKeyOf, localDayKey, localDayStart } from '@/lib/timezone';

export async function touchActivity(userId, timezone) {
  const today = localDayStart(timezone);
  await prisma.userDailyActivity.upsert({
    where: { userId_activityDate: { userId, activityDate: today } },
    update: {},
    create: { userId, activityDate: today },
  });
}

export async function awardXp(tx, userId, amount, timezone) {
  if (!amount) return;
  const today = localDayStart(timezone);
  await tx.userDailyActivity.upsert({
    where: { userId_activityDate: { userId, activityDate: today } },
    update: { xp: { increment: amount } },
    create: { userId, activityDate: today, xp: amount },
  });
}

export async function getWarmupXpToday(client, userId, timezone) {
  const row = await client.userDailyActivity.findUnique({
    where: { userId_activityDate: { userId, activityDate: localDayStart(timezone) } },
    select: { warmupXp: true },
  });
  return row?.warmupXp ?? 0;
}

export async function awardWarmupXp(tx, userId, amount, timezone) {
  if (!amount) return;
  const today = localDayStart(timezone);
  await tx.userDailyActivity.upsert({
    where: { userId_activityDate: { userId, activityDate: today } },
    update: { xp: { increment: amount }, warmupXp: { increment: amount } },
    create: { userId, activityDate: today, xp: amount, warmupXp: amount },
  });
}

export async function getTodayXp(userId, timezone) {
  const row = await prisma.userDailyActivity.findUnique({
    where: { userId_activityDate: { userId, activityDate: localDayStart(timezone) } },
    select: { xp: true },
  });
  return row?.xp ?? 0;
}

export async function getTotalXp(userId) {
  const agg = await prisma.userDailyActivity.aggregate({
    where: { userId },
    _sum: { xp: true },
  });
  return agg._sum.xp ?? 0;
}

export async function getActivityHeatmap(userId) {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const rows = await prisma.userDailyActivity.findMany({
    where: { userId, activityDate: { gte: oneYearAgo } },
    select: { activityDate: true, xp: true },
    orderBy: { activityDate: 'asc' },
  });
  return rows.map((r) => ({
    date: dayKeyOf(r.activityDate),
    count: 1,
    xp: r.xp,
  }));
}

export async function getStreak(userId, timezone) {
  const rows = await prisma.userDailyActivity.findMany({
    where: { userId },
    select: { activityDate: true },
    orderBy: { activityDate: 'desc' },
  });
  if (rows.length === 0) return 0;

  const days = rows.map((r) => dayKeyOf(r.activityDate));
  const today = localDayKey(timezone);
  const yesterday = addDays(today, -1);

  let cursor = days.includes(today) ? today : days.includes(yesterday) ? yesterday : null;
  if (!cursor) return 0;

  let streak = 0;
  for (const day of days) {
    if (day === cursor) {
      streak++;
      cursor = addDays(cursor, -1);
    } else if (day < cursor) {
      break;
    }
  }
  return streak;
}
