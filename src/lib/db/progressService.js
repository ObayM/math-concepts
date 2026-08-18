import { prisma } from '@/lib/prisma';
import { lessonSchema } from '@/engine/ir/lesson';
import { exercises } from '@/components/lesson/exercises';
import {
  xpForAttempts,
  lessonXpCap,
  xpStillOwed,
  XP_LESSON_COMPLETE,
  XP_CORRECT,
  XP_ATTEMPT,
} from '@/lib/xp';
import { awardXp } from '@/lib/db/activityService';
import { getUserTimeZone } from '@/lib/db/userService';

export function buildSlideMap(publishedData) {
  const parsed = lessonSchema.safeParse(publishedData);
  const map = new Map();
  if (!parsed.success) return map;
  for (const slide of parsed.data.slides) map.set(slide.id, slide);
  return map;
}

export function countExercises(publishedData) {
  const parsed = lessonSchema.safeParse(publishedData);
  if (!parsed.success) return 0;
  return parsed.data.slides.filter((s) => s.exercise).length;
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

export const MASTERY_ALPHA = 0.3;

export function firstMasteryScore(correct) {
  return correct ? 1 : 0;
}

export function nextMasteryScore(prev, correct) {
  return prev * (1 - MASTERY_ALPHA) + (correct ? 1 : 0) * MASTERY_ALPHA;
}

export function replayMastery(attempts) {
  let score = 0;
  let correct = 0;
  attempts.forEach((a, i) => {
    score = i === 0 ? firstMasteryScore(a.correct) : nextMasteryScore(score, a.correct);
    if (a.correct) correct += 1;
  });
  return { score, attempts: attempts.length, correct };
}

async function recordSkillMastery(tx, userId, skill, correct) {
  const inc = correct ? 1 : 0;
  const decay = 1 - MASTERY_ALPHA;
  const gain = inc * MASTERY_ALPHA;

  await tx.$executeRaw`
    INSERT INTO user_skill_mastery (user_id, skill, score, attempts, correct, updated_at)
    VALUES (${userId}, ${skill}, ${inc}::double precision, 1, ${inc}::int, NOW())
    ON CONFLICT (user_id, skill) DO UPDATE SET
      score      = user_skill_mastery.score * ${decay}::double precision + ${gain}::double precision,
      attempts   = user_skill_mastery.attempts + 1,
      correct    = user_skill_mastery.correct + ${inc}::int,
      updated_at = NOW()
  `;
}

async function rebuildSkillMastery(tx, userId, skill) {
  const surviving = await tx.lessonAttempt.findMany({
    where: { userId, skill },
    select: { correct: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!surviving.length) {
    await tx.userSkillMastery.deleteMany({ where: { userId, skill } });
    return;
  }

  const rebuilt = replayMastery(surviving);
  await tx.userSkillMastery.upsert({
    where: { userId_skill: { userId, skill } },
    create: { userId, skill, ...rebuilt },
    update: rebuilt,
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
  const [lesson, timezone] = await Promise.all([
    prisma.lesson.findUnique({
      where: { lessonKey },
      select: { id: true, status: true, publishedData: true, course: { select: { lang: true } } },
    }),
    getUserTimeZone(userId),
  ]);
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
        lang: lesson.course?.lang ?? null,
        question: slide.exercise.prompt ?? slide.title ?? '',
        correct,
      },
    });
    if (skill) await recordSkillMastery(tx, userId, skill, correct);
    await awardXp(tx, userId, correct ? XP_CORRECT : XP_ATTEMPT, timezone);
  });

  return { correct, xp: correct ? XP_CORRECT : XP_ATTEMPT };
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
  const [lesson, timezone] = await Promise.all([
    prisma.lesson.findUnique({
      where: { lessonKey },
      select: { id: true, publishedData: true, course: { select: { lang: true } } },
    }),
    getUserTimeZone(userId),
  ]);
  if (!lesson) return null;

  const now = new Date();

  let earnedXp = 0;

  await prisma.$transaction(async (tx) => {
    let verifiedQuizHistory = quizHistory;

    const existing = await tx.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      select: { quizHistory: true, completed: true, xpAwarded: true },
    });

    if (quizHistory !== undefined) {
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
            lang: lesson.course?.lang ?? null,
            question: v.question,
            correct: v.correct,
          })),
        });
        for (const v of verified) {
          if (v.skill) await recordSkillMastery(tx, userId, v.skill, v.correct);
        }
        earnedXp += xpForAttempts(verified);

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

    if (isCompleted && !existing?.completed) earnedXp += XP_LESSON_COMPLETE;

    const alreadyAwarded = existing?.xpAwarded ?? 0;
    const cap = lessonXpCap(countExercises(lesson.publishedData));
    earnedXp = xpStillOwed(earnedXp, alreadyAwarded, cap);

    await tx.userLessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      update: {
        currentStep,
        lastPlayedAt: now,
        xpAwarded: alreadyAwarded + earnedXp,
        ...(isCompleted && { completed: true, completedAt: now }),
        ...(quizHistory !== undefined && { quizHistory: verifiedQuizHistory }),
      },
      create: {
        userId,
        lessonId: lesson.id,
        currentStep,
        lastPlayedAt: now,
        xpAwarded: earnedXp,
        ...(isCompleted && { completed: true, completedAt: now }),
        ...(quizHistory !== undefined && { quizHistory: verifiedQuizHistory }),
      },
    });

    await awardXp(tx, userId, earnedXp, timezone);
  });

  return { lessonId: lesson.id, xp: earnedXp };
}

export async function resetLessonProgress(userId, lessonKey) {
  const lesson = await prisma.lesson.findUnique({
    where: { lessonKey },
    select: { id: true },
  });
  if (!lesson) return null;

  await prisma.$transaction(async (tx) => {
    const touched = await tx.lessonAttempt.findMany({
      where: { userId, lessonId: lesson.id, skill: { not: null } },
      select: { skill: true },
      distinct: ['skill'],
    });

    await tx.lessonAttempt.deleteMany({ where: { userId, lessonId: lesson.id } });
    // the row survives the reset so xpAwarded does too, which is what stops a
    // restart from paying out the same lesson twice
    await tx.userLessonProgress.updateMany({
      where: { userId, lessonId: lesson.id },
      data: {
        currentStep: 0,
        completed: false,
        completedAt: null,
        quizHistory: [],
        lastPlayedAt: new Date(),
      },
    });

    for (const { skill } of touched) await rebuildSkillMastery(tx, userId, skill);
  });

  return lesson.id;
}
