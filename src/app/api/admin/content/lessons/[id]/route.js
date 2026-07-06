import { z } from 'zod';
import { NextResponse } from 'next/server';
import { assertPermission } from '@/lib/authz';
import { consume } from '@/lib/rate-limit';
import { updateLessonSource } from '@/lib/db/contentService';

const bodySchema = z.object({ source: z.string() });

export async function PUT(request, { params }) {
  const { id } = await params;
  const { ok, status, user } = await assertPermission({ content: ['update'] });
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status });

  if (!consume(user.id, 'content-save')) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { lesson, error } = await updateLessonSource(id, parsed.data.source);
  if (error) return NextResponse.json({ error: 'Compile failed', detail: error }, { status: 422 });

  return NextResponse.json({ data: lesson.data, updatedAt: lesson.updatedAt });
}
