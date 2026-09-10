import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireUser, refreshSessionCache } from '@/lib/session';
import { isUsernameAvailable, setUsername, USERNAME_REGEX } from '@/lib/db/userService';
import { NextResponse } from 'next/server';
import { consume, tooManyRequests } from '@/lib/rate-limit';

const bodySchema = z.object({
  username: z.string().regex(USERNAME_REGEX),
  timezone: z.string().max(100).optional(),
});

export async function POST(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = await consume(user.id, 'username');
  if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid username format' }, { status: 400 });
  }
  const { username, timezone } = parsed.data;

  const available = await isUsernameAvailable(username);
  if (!available) return NextResponse.json({ error: 'Username already taken' }, { status: 409 });

  try {
    await setUsername(user.id, username, timezone);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }
    throw err;
  }

  await refreshSessionCache();
  return NextResponse.json({ success: true });
}
