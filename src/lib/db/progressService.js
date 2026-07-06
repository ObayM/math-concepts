import { prisma } from '@/lib/prisma';
import { lessonSchema } from '@/engine/ir/lesson';

function buildSkillMap(publishedData) {
  const parsed = lessonSchema.safeParse(publishedData);
  const map = new Map();
  if (!parsed.success) return map;
  for (const slide of parsed.data.slides) {
    const skill = slide.exercise?.skill ?? slide.skill ?? null;
    if (skill) map.set(slide.id, skill);
  }
  return map;
}

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
    select: { id: true, publishedData: true },
  });
  if (!lesson) return null;

  const now = new Date();

  if (quizHistory !== undefined) {
    const existing = await prisma.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      select: { quizHistory: true },
    });
    const priorLength = Array.isArray(existing?.quizHistory) ? existing.quizHistory.length : 0;
    const newAttempts = quizHistory.slice(priorLength);
    if (newAttempts.length) {
      const skillMap = buildSkillMap(lesson.publishedData);
      await prisma.lessonAttempt.createMany({
        data: newAttempts.map((a) => ({
          userId,
          lessonId: lesson.id,
          slideId: a.slideId ?? null,
          exerciseKind: a.kind ?? null,
          skill: a.slideId ? (skillMap.get(a.slideId) ?? null) : null,
          question: a.question,
          correct: a.correct,
        })),
      });
    }
  }

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

export async function resetLessonProgress(userId, lessonKey) {
  const lesson = await prisma.lesson.findUnique({
    where: { lessonKey },
    select: { id: true },
  });
  if (!lesson) return null;

  await prisma.userLessonProgress.deleteMany({
    where: { userId, lessonId: lesson.id },
  });
  return lesson.id;
}
