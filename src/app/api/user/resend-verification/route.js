import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { consume, tooManyRequests } from '@/lib/rate-limit';
import { auth } from '@/lib/auth';

export async function POST() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.emailVerified) {
    return NextResponse.json({ error: 'Your email is already verified' }, { status: 409 });
  }

  const limit = await consume(user.id, 'verify-email');
  if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

  try {
    await auth.api.sendVerificationEmail({
      body: { email: user.email, callbackURL: '/onboarding' },
    });
  } catch (err) {
    console.error('resend verification failed', err);
    return NextResponse.json({ error: "Couldn't send it. Try again shortly." }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
