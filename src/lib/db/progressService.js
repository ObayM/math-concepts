import { prisma } from '@/lib/prisma';
import { lessonSchema } from '@/engine/ir/lesson';
import { exercises } from '@/components/lesson/exercises';

export function buildSlideMap(publishedData) {
  const parsed = lessonSchema.safeParse(publishedData);
  const map = new Map();
  if (!parsed.success) return map;
  for (const slide of parsed.data.slides) map.set(slide.id, slide);
  return map;
}

// never trust the client's `correct` — re-derive it from the published
// exercise and the answer the client claims it submitted. this is the
// server-side trust boundary for mastery/attempts.
export function verifyAttempts(slideMap, attempts) {
  return attempts.map((a) => {
    const slide = a.slideId ? slideMap.get(a.slideId) : null;
    const checker = slide?.exercise ? exercises[slide.exercise.kind] : null;
    return {
      title: a.title,
      question: a.question,
      slideId: a.slideId ?? null,
      kind: a.kind ?? null,
      skill: slide?.exercise?.skill ?? slide?.skill ?? null,
      correct: checker ? Boolean(checker.check(slide, a.answer)) : false,
    };
  });
}

const MASTERY_ALPHA = 0.3;

async function recordSkillMastery(userId, skill, correct) {
  const correctInc = correct ? 1 : 0;
  const existing = await prisma.userSkillMastery.findUnique({
    where: { userId_skill: { userId, skill } },
  });

  if (!existing) {
    await prisma.userSkillMastery.create({
      data: { userId, skill, score: correctInc, attempts: 1, correct: correctInc },
    });
    return;
  }

  const score = existing.score * (1 - MASTERY_ALPHA) + correctInc * MASTERY_ALPHA;
  await prisma.userSkillMastery.update({
    where: { userId_skill: { userId, skill } },
    data: { score, attempts: existing.attempts + 1, correct: existing.correct + correctInc },
  });
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
  let verifiedQuizHistory = quizHistory;

  if (quizHistory !== undefined) {
    const existing = await prisma.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      select: { quizHistory: true },
    });
    const priorLength = Array.isArray(existing?.quizHistory) ? existing.quizHistory.length : 0;
    const newAttempts = quizHistory.slice(priorLength);

    if (newAttempts.length) {
      const slideMap = buildSlideMap(lesson.publishedData);
      const verified = verifyAttempts(slideMap, newAttempts);

      await prisma.lessonAttempt.createMany({
        data: verified.map((v) => ({
          userId,
          lessonId: lesson.id,
          slideId: v.slideId,
          exerciseKind: v.kind,
          skill: v.skill,
          question: v.question,
          correct: v.correct,
        })),
      });
      for (const v of verified) {
        if (v.skill) await recordSkillMastery(userId, v.skill, v.correct);
      }

      verifiedQuizHistory = [
        ...quizHistory.slice(0, priorLength),
        ...verified.map(({ title, question, slideId, kind, correct }) => ({
          title,
          question,
          slideId,
          kind,
          correct,
        })),
      ];
    }
  }

  await prisma.userLessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
    update: {
      currentStep,
      lastPlayedAt: now,
      ...(isCompleted && { completed: true, completedAt: now }),
      ...(quizHistory !== undefined && { quizHistory: verifiedQuizHistory }),
    },
    create: {
      userId,
      lessonId: lesson.id,
      currentStep,
      lastPlayedAt: now,
      ...(isCompleted && { completed: true, completedAt: now }),
      ...(quizHistory !== undefined && { quizHistory: verifiedQuizHistory }),
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
