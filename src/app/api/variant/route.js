import { z } from 'zod';
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { issueVariant } from '@/lib/variant-token';

const bodySchema = z.object({
  lessonKey: z.string().min(1).max(200),
  slideId: z.string().min(1).max(200),
});

export async function POST(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  const { lessonKey, slideId } = parsed.data;
  return NextResponse.json({ variant: issueVariant(user.id, lessonKey, slideId) });
}
