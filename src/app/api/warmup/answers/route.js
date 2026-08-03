import { z } from 'zod';
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { consume, tooManyRequests } from '@/lib/rate-limit';
import { getUserTimeZone } from '@/lib/db/userService';
import { recordWarmupAnswers, MAX_SESSION_ANSWERS } from '@/lib/db/warmupService';

const answerSchema = z.object({
  idx: z
    .number()
    .int()
    .min(0)
    .max(MAX_SESSION_ANSWERS - 1),
  given: z.string().max(64).nullable().optional(),
  elapsedMs: z.number().finite().optional(),
});

const bodySchema = z.object({
  sessionId: z.string().min(1).max(100),
  answers: z.array(answerSchema).min(1).max(50),
});

export async function POST(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = await consume(user.id, 'warmup');
  if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const timezone = await getUserTimeZone(user.id);
  const result = await recordWarmupAnswers(
    user.id,
    parsed.data.sessionId,
    parsed.data.answers,
    timezone
  );
  if (!result) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  return NextResponse.json({ success: true, session: result });
}
