import { prisma } from '@/lib/prisma';

export async function getLessonProgress(userId, lessonKey) {
  const lesson = await prisma.lesson.findUnique({
    where: { lessonKey },
    select: { id: true },
  });
  if (!lesson) return { currentStep: 0, completed: false, quizHistory: null };

  const progress = await prisma.userLessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
    select: { currentStep: true, completed: true, quizHistory: true },
  });
  return {
    currentStep: progress?.currentStep ?? 0,
    completed: progress?.completed ?? false,
    quizHistory: progress?.quizHistory ?? null,
  };
}

export async function upsertLessonProgress(
  userId,
  lessonKey,
  { currentStep, isCompleted, quizHistory }
) {
  const lesson = await prisma.lesson.findUnique({
    where: { lessonKey },
    select: { id: true },
  });
  if (!lesson) return null;

  const now = new Date();
  await prisma.userLessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
    update: {
      currentStep,
      lastPlayedAt: now,
      ...(isCompleted && { completed: true, completedAt: now }),
      ...(quizHistory !== undefined && { quizHistory }),
    },
    create: {
      userId,
      lessonId: lesson.id,
      currentStep,
      lastPlayedAt: now,
      ...(isCompleted && { completed: true, completedAt: now }),
      ...(quizHistory !== undefined && { quizHistory }),
    },
  });
  return lesson.id;
}
