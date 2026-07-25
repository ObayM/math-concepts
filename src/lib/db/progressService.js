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

async function recordSkillMastery(tx, userId, skill, correct) {
  const correctInc = correct ? 1 : 0;
  const existing = await tx.userSkillMastery.findUnique({
    where: { userId_skill: { userId, skill } },
  });

  if (!existing) {
    await tx.userSkillMastery.create({
      data: { userId, skill, score: correctInc, attempts: 1, correct: correctInc },
    });
    return;
  }

  const score = existing.score * (1 - MASTERY_ALPHA) + correctInc * MASTERY_ALPHA;
  await tx.userSkillMastery.update({
    where: { userId_skill: { userId, skill } },
    data: { score, attempts: existing.attempts + 1, correct: existing.correct + correctInc },
  });
}

export async function getMyMastery(userId) {
  const rows = await prisma.userSkillMastery.findMany({
    where: { userId },
    select: { skill: true, score: true },
  });
  return Object.fromEntries(rows.map((r) => [r.skill, r.score]));
}

export async function recordPracticeAttempt(userId, lessonKey, slideId, answer) {
  const lesson = await prisma.lesson.findUnique({
    where: { lessonKey },
    select: { id: true, status: true, publishedData: true },
  });
  if (!lesson || lesson.status !== 'published') return null;

  const slide = buildSlideMap(lesson.publishedData).get(slideId);
  if (!slide?.exercise) return null;

  const checker = exercises[slide.exercise.kind];
  const correct = checker ? Boolean(checker.check(slide, answer)) : false;
  const skill = slide.exercise.skill ?? slide.skill ?? null;

  await prisma.$transaction(async (tx) => {
    await tx.lessonAttempt.create({
      data: {
        userId,
        lessonId: lesson.id,
        slideId,
        exerciseKind: slide.exercise.kind,
        skill,
        question: slide.exercise.prompt ?? slide.title ?? '',
        correct,
      },
    });
    if (skill) await recordSkillMastery(tx, userId, skill, correct);
  });

  return { correct };
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

  await prisma.$transaction(async (tx) => {
    let verifiedQuizHistory = quizHistory;

    if (quizHistory !== undefined) {
      const existing = await tx.userLessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId: lesson.id } },
        select: { quizHistory: true },
      });
      const priorLength = Array.isArray(existing?.quizHistory) ? existing.quizHistory.length : 0;
      const newAttempts = quizHistory.slice(priorLength);

      if (newAttempts.length) {
        const slideMap = buildSlideMap(lesson.publishedData);
        const verified = verifyAttempts(slideMap, newAttempts);

        await tx.lessonAttempt.createMany({
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
          if (v.skill) await recordSkillMastery(tx, userId, v.skill, v.correct);
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

    await tx.userLessonProgress.upsert({
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
