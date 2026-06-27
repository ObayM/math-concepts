import { requireUser } from '@/lib/session';
import { getLessonProgress, upsertLessonProgress } from '@/lib/db/progressService';
import { NextResponse } from 'next/server';

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

  const { lessonKey, currentStep, isCompleted } = await request.json();
  if (!lessonKey) return NextResponse.json({ error: 'lessonKey is required' }, { status: 400 });

  const result = await upsertLessonProgress(user.id, lessonKey, { currentStep, isCompleted });
  if (result === null) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });

  return NextResponse.json({ success: true });
}
