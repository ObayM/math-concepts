import { z } from 'zod';
import { requireUser } from '@/lib/session';
import { isUsernameAvailable, setUsername, USERNAME_REGEX } from '@/lib/db/userService';
import { NextResponse } from 'next/server';

const bodySchema = z.object({
  username: z.string().regex(USERNAME_REGEX),
});

export async function POST(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid username format' }, { status: 400 });
  }
  const { username } = parsed.data;

  const available = await isUsernameAvailable(username);
  if (!available) return NextResponse.json({ error: 'Username already taken' }, { status: 409 });

  await setUsername(user.id, username);
  return NextResponse.json({ success: true });
}
