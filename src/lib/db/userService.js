import { prisma } from '@/lib/prisma';

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
