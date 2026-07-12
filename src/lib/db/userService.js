import { prisma } from '@/lib/prisma';
import { getStreak } from '@/lib/db/activityService';

export const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/;

export async function isUsernameAvailable(username) {
  const existing = await prisma.user.findFirst({
    where: { username },
    select: { id: true },
  });
  return !existing;
}

export async function setUsername(userId, username) {
  await prisma.user.update({
    where: { id: userId },
    data: { username },
  });
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
      skillMastery: {
        orderBy: { score: 'desc' },
        select: { skill: true, score: true, attempts: true, correct: true },
      },
    },
  });
  if (!user) return null;

  const [streak, completedCount] = await Promise.all([
    getStreak(user.id),
    prisma.userLessonProgress.count({ where: { userId: user.id, completed: true } }),
  ]);

  return { ...user, streak, completedCount };
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

export async function getUsersCompletedCounts(userIds) {
  if (!userIds.length) return new Map();
  const rows = await prisma.userLessonProgress.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds }, completed: true },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.userId, r._count._all]));
}
