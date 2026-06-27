import { requireUser } from '@/lib/session';
import { isUsernameAvailable, setUsername, USERNAME_REGEX } from '@/lib/db/userService';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { username } = await request.json();
  if (!username || !USERNAME_REGEX.test(username)) {
    return NextResponse.json({ error: 'Invalid username format' }, { status: 400 });
  }

  const available = await isUsernameAvailable(username);
  if (!available) return NextResponse.json({ error: 'Username already taken' }, { status: 409 });

  await setUsername(user.id, username);
  return NextResponse.json({ success: true });
}
