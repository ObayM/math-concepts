import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/session';
import { consume, tooManyRequests } from '@/lib/rate-limit';
import { clientIp } from '@/lib/request-ip';
import { auth } from '@/lib/auth';

const bodySchema = z.object({ email: z.string().trim().email().max(320) });

async function send(email) {
  try {
    await auth.api.sendVerificationEmail({ body: { email, callbackURL: '/onboarding' } });
    return true;
  } catch (err) {
    console.error('resend verification failed', err);
    return false;
  }
}

export async function POST(request) {
  const user = await requireUser();

  if (user) {
    if (user.emailVerified) {
      return NextResponse.json({ error: 'Your email is already verified' }, { status: 409 });
    }
    const limit = await consume(user.id, 'verify-email');
    if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

    if (!(await send(user.email))) {
      return NextResponse.json({ error: "Couldn't send it. Try again shortly." }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
  }

  const limit = await consume(clientIp(request), 'verify-email');
  if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

  await send(parsed.data.email);
  return NextResponse.json({ success: true });
}
