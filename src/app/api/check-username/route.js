import { isUsernameAvailable, USERNAME_REGEX } from '@/lib/db/userService';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const username = request.nextUrl.searchParams.get('username');
  if (!username || !USERNAME_REGEX.test(username)) {
    return NextResponse.json({ available: false });
  }
  const available = await isUsernameAvailable(username);
  return NextResponse.json({ available });
}
