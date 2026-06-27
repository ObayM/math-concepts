import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { lessonKey, currentStep, isCompleted } = await request.json();
  if (!lessonKey) {
    return NextResponse.json({ error: 'lessonKey is required' }, { status: 400 });
  }

  const lesson = await prisma.lesson.findUnique({
    where: { lessonKey },
    select: { id: true },
  });
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  const now = new Date();
  await prisma.userLessonProgress.upsert({
    where: {
      userId_lessonId: { userId: session.user.id, lessonId: lesson.id },
    },
    update: {
      currentStep,
      lastPlayedAt: now,
      ...(isCompleted && { completed: true, completedAt: now }),
    },
    create: {
      userId: session.user.id,
      lessonId: lesson.id,
      currentStep,
      lastPlayedAt: now,
      ...(isCompleted && { completed: true, completedAt: now }),
    },
  });

  return NextResponse.json({ success: true });
}

export async function GET(request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lessonKey = request.nextUrl.searchParams.get('lessonKey');
  if (!lessonKey) {
    return NextResponse.json({ error: 'lessonKey is required' }, { status: 400 });
  }

  const lesson = await prisma.lesson.findUnique({
    where: { lessonKey },
    select: { id: true },
  });
  if (!lesson) {
    return NextResponse.json({ currentStep: 0, completed: false });
  }

  const progress = await prisma.userLessonProgress.findUnique({
    where: {
      userId_lessonId: { userId: session.user.id, lessonId: lesson.id },
    },
    select: { currentStep: true, completed: true },
  });

  return NextResponse.json({
    currentStep: progress?.currentStep ?? 0,
    completed: progress?.completed ?? false,
  });
}
