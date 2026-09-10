import { prisma } from '@/lib/prisma';
import { getStreak, getActivityHeatmap, getTotalXp } from '@/lib/db/activityService';
import { isValidTimeZone } from '@/lib/timezone';
import { USERNAME_REGEX, isValidUsername } from '@/lib/username';

export { USERNAME_REGEX };

export async function isUsernameAvailable(username) {
  const existing = await prisma.user.findFirst({
    where: { username },
    select: { id: true },
  });
  return !existing;
}

export async function setUsername(userId, username, timezone) {
  if (!isValidUsername(username)) throw new Error('invalid username');
  const name = username.trim();
  await prisma.user.update({
    where: { id: userId },
    data: {
      username: name,
      displayUsername: name,
      ...(isValidTimeZone(timezone) && { timezone }),
    },
  });
}

export async function getUserTimeZone(userId) {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  return row?.timezone ?? null;
}

export async function setTimeZoneIfUnset(userId, timezone) {
  if (!isValidTimeZone(timezone)) return null;
  const { count } = await prisma.user.updateMany({
    where: { id: userId, timezone: null },
    data: { timezone },
  });
  return count ? timezone : null;
}

export async function countUsersWithRole(role) {
  return prisma.user.count({ where: { role } });
}

export async function getUserProfile(username) {
  const user = await prisma.user.findFirst({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      displayUsername: true,
      image: true,
      createdAt: true,
      timezone: true,
      skillMastery: {
        orderBy: { score: 'desc' },
        select: { skill: true, score: true, attempts: true, correct: true },
      },
    },
  });
  if (!user) return null;

  const [streak, completedCount, totalXp, heatmap] = await Promise.all([
    getStreak(user.id, user.timezone),
    prisma.userLessonProgress.count({ where: { userId: user.id, completed: true } }),
    getTotalXp(user.id),
    getActivityHeatmap(user.id),
  ]);

  return { ...user, streak, completedCount, totalXp, heatmap };
}

export async function updateUserProfile(userId, { name, image }) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined && { name }),
      ...(image !== undefined && { image }),
    },
  });
}

export async function getUserSettings(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      reminderEmails: true,
      emailVerified: true,
      timezone: true,
      locale: true,
    },
  });
}

export async function updateReminderPreference(userId, reminderEmails) {
  await prisma.user.update({ where: { id: userId }, data: { reminderEmails } });
}

export async function updateLocale(userId, locale) {
  await prisma.user.update({ where: { id: userId }, data: { locale } });
}

export async function getUsersCompletedCounts(userIds) {
  if (!userIds.length) return new Map();
  const rows = await prisma.userLessonProgress.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds }, completed: true },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.userId, r._count._all]));
}
