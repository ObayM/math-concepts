import { prisma } from '@/lib/prisma';

// UTC-normalized "today" — reads (getStreak/getActivityHeatmap) compare dates
// via toISOString(), which is UTC. Using local midnight here would drift by a
// day whenever the server's timezone isn't UTC.
function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function touchActivity(userId) {
  const today = todayUTC();
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
