import { z } from 'zod';
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { consume, tooManyRequests } from '@/lib/rate-limit';
import { recordLessonEvents } from '@/lib/db/eventService';
import { EVENT_TYPES, MAX_BATCH } from '@/lib/tracker-core';

const dataSchema = z
  .record(z.string().max(32), z.union([z.number().finite(), z.boolean(), z.string().max(64)]))
  .refine((d) => Object.keys(d).length <= 8);

const eventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  slideId: z.string().max(100).nullable().optional(),
  t: z.number().int().nonnegative(),
  data: dataSchema.optional(),
});

const bodySchema = z.object({
  lessonKey: z.string().min(1).max(100),
  sessionId: z.string().min(1).max(100),
  events: z.array(eventSchema).min(1).max(MAX_BATCH),
});

export async function POST(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = await consume(user.id, 'events');
  if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const { lessonKey, sessionId, events } = parsed.data;
  const count = await recordLessonEvents(user.id, lessonKey, sessionId, events);
  if (count === null) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

  return NextResponse.json({ success: true, count });
}
