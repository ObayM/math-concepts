import { z } from 'zod';
import { requireUser } from '@/lib/session';
import { consume } from '@/lib/rate-limit';
import {
  getLessonProgress,
  upsertLessonProgress,
  resetLessonProgress,
} from '@/lib/db/progressService';
import { NextResponse } from 'next/server';

const bodySchema = z.object({
  lessonKey: z.string().min(1).max(200),
  currentStep: z.number().int().min(0).max(1000),
  isCompleted: z.boolean().optional().default(false),
  quizHistory: z
    .array(
      z.object({
        title: z.string().max(300).optional(),
        question: z.string().max(2000),
        correct: z.boolean(),
        slideId: z.string().max(200).optional(),
        kind: z.string().max(50).optional(),
        answer: z.unknown().optional(),
      })
    )
    .max(500)
    .optional(),
});

export async function GET(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lessonKey = request.nextUrl.searchParams.get('lessonKey');
  if (!lessonKey) return NextResponse.json({ error: 'lessonKey is required' }, { status: 400 });

  const progress = await getLessonProgress(user.id, lessonKey);
  return NextResponse.json(progress);
}

export async function POST(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!consume(user.id, 'progress'))
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { lessonKey, currentStep, isCompleted, quizHistory } = parsed.data;

  const result = await upsertLessonProgress(user.id, lessonKey, {
    currentStep,
    isCompleted,
    quizHistory,
  });
  if (result === null) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}

export async function DELETE(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lessonKey = request.nextUrl.searchParams.get('lessonKey');
  if (!lessonKey) return NextResponse.json({ error: 'lessonKey is required' }, { status: 400 });

  const result = await resetLessonProgress(user.id, lessonKey);
  if (result === null) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
