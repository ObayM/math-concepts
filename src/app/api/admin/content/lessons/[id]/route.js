import { z } from 'zod';
import { NextResponse } from 'next/server';
import { assertPermission } from '@/lib/authz';
import { consume, tooManyRequests } from '@/lib/rate-limit';
import { updateLessonSource } from '@/lib/db/contentService';

const bodySchema = z.object({ source: z.string().max(65_536) });

export async function PUT(request, { params }) {
  const { id } = await params;
  const { ok, status, user } = await assertPermission({ content: ['update'] });
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status });

  const limit = await consume(user.id, 'content-save');
  if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { lesson, findings, error } = await updateLessonSource(id, parsed.data.source);
  if (error) return NextResponse.json({ error: 'Compile failed', detail: error }, { status: 422 });

  return NextResponse.json({ data: lesson.data, findings, updatedAt: lesson.updatedAt });
}
