import { requireUser } from '@/lib/session';
import { getActivityHeatmap, getStreak, touchActivity } from '@/lib/db/activityService';
import { getUserTimeZone, setTimeZoneIfUnset } from '@/lib/db/userService';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { consume, tooManyRequests } from '@/lib/rate-limit';

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const timezone = await getUserTimeZone(user.id);
  const [heatmap, streak] = await Promise.all([
    getActivityHeatmap(user.id),
    getStreak(user.id, timezone),
  ]);
  return NextResponse.json({ heatmap, streak, timezone });
}

const bodySchema = z.object({ timezone: z.string().max(100).optional() });

export async function POST(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = await consume(user.id, 'activity');
  if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  const sent = parsed.success ? parsed.data.timezone : undefined;

  const stored = await getUserTimeZone(user.id);
  const timezone = stored ?? (sent ? await setTimeZoneIfUnset(user.id, sent) : null);

  await touchActivity(user.id, timezone);
  return NextResponse.json({ success: true });
}
