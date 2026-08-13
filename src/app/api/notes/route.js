import { z } from 'zod';
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { consume, tooManyRequests } from '@/lib/rate-limit';
import { getLessonNotes, upsertSlideNote } from '@/lib/db/noteService';

const MAX_POINTS = 20_000;

const coord = z.number().int().min(-1000).max(20_000);

const bodySchema = z
  .object({
    lessonKey: z.string().min(1).max(200),
    slideId: z.string().min(1).max(200),
    notes: z.string().max(10_000),
    strokes: z
      .array(
        z.object({
          points: z
            .array(z.tuple([coord, coord]))
            .min(1)
            .max(2000),
        })
      )
      .max(400)
      .nullable(),
  })
  .refine(
    (b) => (b.strokes ?? []).reduce((n, s) => n + s.points.length, 0) <= MAX_POINTS,
    'too many points'
  );

export async function GET(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lessonKey = request.nextUrl.searchParams.get('lessonKey');
  if (!lessonKey) return NextResponse.json({ error: 'lessonKey is required' }, { status: 400 });

  const notes = await getLessonNotes(user.id, lessonKey);
  if (notes === null) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

  return NextResponse.json({ notes });
}

export async function PUT(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = await consume(user.id, 'notes');
  if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { lessonKey, slideId, notes, strokes } = parsed.data;

  const result = await upsertSlideNote(user.id, lessonKey, slideId, { notes, strokes });
  if (result === null) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
