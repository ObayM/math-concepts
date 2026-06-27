import { prisma } from '@/lib/prisma';

export async function touchActivity(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.userDailyActivity.upsert({
    where: { userId_activityDate: { userId, activityDate: today } },
    update: {},
    create: { userId, activityDate: today },
  });
}

export async function getActivityHeatmap(userId) {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const rows = await prisma.userDailyActivity.findMany({
    where: { userId, activityDate: { gte: oneYearAgo } },
    select: { activityDate: true },
    orderBy: { activityDate: 'asc' },
  });
  return rows.map((r) => ({
    date: r.activityDate.toISOString().split('T')[0],
    count: 1,
  }));
}

export async function getStreak(userId) {
  const rows = await prisma.userDailyActivity.findMany({
    where: { userId },
    select: { activityDate: true },
    orderBy: { activityDate: 'desc' },
  });

  if (rows.length === 0) return 0;

  const toStr = (d) => d.toISOString().split('T')[0];
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dates = rows.map((r) => toStr(r.activityDate));
  const hasToday = dates.includes(toStr(today));
  const hasYesterday = dates.includes(toStr(yesterday));

  if (!hasToday && !hasYesterday) return 0;

  let streak = 0;
  let cursor = hasToday ? today : yesterday;

  for (const d of dates) {
    if (d === toStr(cursor)) {
      streak++;
      cursor = new Date(cursor);
      cursor.setDate(cursor.getDate() - 1);
    } else if (d < toStr(cursor)) {
      break;
    }
  }

  return streak;
}
