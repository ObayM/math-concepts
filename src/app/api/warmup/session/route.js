import { z } from 'zod';
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { consume, tooManyRequests } from '@/lib/rate-limit';
import { getUserTimeZone, setTimeZoneIfUnset } from '@/lib/db/userService';
import { startWarmupSession, endWarmupSession } from '@/lib/db/warmupService';
import { MIN_LEVEL, MAX_LEVEL } from '@/lib/warmup/questions';

const startSchema = z.object({
  level: z.number().int().min(MIN_LEVEL).max(MAX_LEVEL),
  timezone: z.string().max(100).optional(),
});

const endSchema = z.object({ sessionId: z.string().min(1).max(100) });

async function gate(tier) {
  const user = await requireUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const limit = await consume(user.id, tier);
  if (!limit.ok) return { error: tooManyRequests(limit.retryAfterMs) };
  return { user };
}

export async function POST(request) {
  const { user, error } = await gate('warmup');
  if (error) return error;

  const parsed = startSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const stored = await getUserTimeZone(user.id);
  const timezone =
    stored ??
    (parsed.data.timezone ? await setTimeZoneIfUnset(user.id, parsed.data.timezone) : null);

  const session = await startWarmupSession(user.id, parsed.data.level, timezone);
  if (!session) return NextResponse.json({ error: 'Unknown level' }, { status: 400 });

  return NextResponse.json({ success: true, ...session });
}

export async function PATCH(request) {
  const { user, error } = await gate('warmup');
  if (error) return error;

  const parsed = endSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const summary = await endWarmupSession(user.id, parsed.data.sessionId);
  if (!summary) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  return NextResponse.json({ success: true, session: summary });
}
