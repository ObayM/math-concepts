import { z } from 'zod';
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { consume, tooManyRequests } from '@/lib/rate-limit';
import { recordPracticeAttempt } from '@/lib/db/progressService';

const bodySchema = z.object({
  lessonKey: z.string().min(1).max(200),
  slideId: z.string().min(1).max(200),
  answer: z.unknown().optional(),
  variant: z.string().max(100).optional(),
});

export async function POST(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = await consume(user.id, 'practice');
  if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { lessonKey, slideId, answer, variant } = parsed.data;

  const result = await recordPracticeAttempt(user.id, lessonKey, slideId, answer, variant);
  if (result === null) return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });

  return NextResponse.json({ success: true, correct: result.correct, xp: result.xp });
}
