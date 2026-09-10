import { isUsernameAvailable, USERNAME_REGEX } from '@/lib/db/userService';
import { NextResponse } from 'next/server';
import { consume, tooManyRequests } from '@/lib/rate-limit';
import { clientIp } from '@/lib/request-ip';

export async function GET(request) {
  const limit = await consume(clientIp(request), 'check-username');
  if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

  const username = request.nextUrl.searchParams.get('username');
  if (!username || !USERNAME_REGEX.test(username)) {
    return NextResponse.json({ available: false });
  }
  const available = await isUsernameAvailable(username);
  return NextResponse.json({ available });
}
