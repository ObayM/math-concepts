import { prisma } from '@/lib/prisma';
import { lessonSchema } from '@/engine/ir/lesson';
import { exercises } from '@/components/lesson/exercises';
import { instantiate, varies } from '@/engine/runtime/variant';
import { readVariant } from '@/lib/variant-token';
import {
  xpForAttempts,
  lessonXpCap,
  xpStillOwed,
  completionXp,
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

export function bankFinished(publishedData, history) {
  const parsed = lessonSchema.safeParse(publishedData);
  if (!parsed.success) return false;
  const answered = new Set((Array.isArray(history) ? history : []).map((e) => e.slideId));
  return parsed.data.slides.every((s) => !s.exercise || answered.has(s.id));
}

export function countExercises(publishedData) {
  const parsed = lessonSchema.safeParse(publishedData);
  if (!parsed.success) return 0;
  return parsed.data.slides.filter((s) => s.exercise).length;
}

// never trust the client's `correct` — re-derive it from the published
// exercise and the answer the client claims it submitted. this is the
// server-side trust boundary for mastery/attempts.
export function gradeAnswer(slide, answer, variant, { userId, lessonKey } = {}) {
  const checker = slide?.exercise ? exercises[slide.exercise.kind] : null;
  if (!checker) return false;
  if (!varies(slide)) return Boolean(checker.check(slide, answer));
  const seed = readVariant(variant, userId, lessonKey, slide.id);
  if (seed === null) return false;
  return Boolean(checker.check(instantiate(slide, seed), answer));
}

export const MAX_SKETCH_POINTS = 200;
export const MAX_ANSWER_CHARS = 8000;

const thin = (points, max) => {
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
};

export function storableAnswer(kind, answer) {
  const kept =
    kind === 'sketch' && Array.isArray(answer) && answer.length > MAX_SKETCH_POINTS
      ? thin(answer, MAX_SKETCH_POINTS)
      : answer;
  const json = JSON.stringify(kept);
  return json !== undefined && json.length <= MAX_ANSWER_CHARS ? kept : undefined;
}

export function verifyAttempts(slideMap, attempts, who = {}) {
  return attempts.map((a) => {
    const slide = a.slideId ? slideMap.get(a.slideId) : null;
    return {
      title: a.title,
      question: a.question,
      slideId: a.slideId ?? null,
      kind: a.kind ?? null,
      skill: slide?.exercise?.skill ?? slide?.skill ?? null,
      correct: gradeAnswer(slide, a.answer, a.variant, who),
      answer: slide?.exercise ? storableAnswer(slide.exercise.kind, a.answer) : undefined,
      variant: typeof a.variant === 'string' ? a.variant : undefined,
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

export async function getMySkillTimes(userId) {
  const rows = await prisma.userSkillMastery.findMany({
    where: { userId },
    select: { skill: true, updatedAt: true },
  });
  return Object.fromEntries(rows.map((r) => [r.skill, r.updatedAt.getTime()]));
}

export async function getTakenLessonIds(userId) {
  const [progress, attempts] = await Promise.all([
    prisma.userLessonProgress.findMany({ where: { userId }, select: { lessonId: true } }),
    prisma.lessonAttempt.findMany({
      where: { userId },
      select: { lessonId: true },
      distinct: ['lessonId'],
    }),
  ]);
  return [...new Set([...progress, ...attempts].map((r) => r.lessonId))];
}

export async function getMasteryFor(userId, skills) {
  if (!userId || !skills?.length) return [];
  return prisma.userSkillMastery.findMany({
    where: { userId, skill: { in: skills } },
    select: { skill: true, score: true, updatedAt: true },
  });
}

export async function getMyMastery(userId) {
  const rows = await prisma.userSkillMastery.findMany({
    where: { userId },
    select: { skill: true, score: true },
  });
  return Object.fromEntries(rows.map((r) => [r.skill, r.score]));
}

export async function recordPracticeAttempt(userId, lessonKey, slideId, answer, variant) {
  const [lesson, timezone] = await Promise.all([
    prisma.lesson.findUnique({
      where: { lessonKey },
      select: { id: true, status: true, publishedData: true, course: { select: { lang: true } } },
    }),
    getUserTimeZone(userId),
  ]);
  if (!lesson?.course || lesson.status !== 'published') return null;
  if (lesson.publishedData?.kind === 'bank') return null;

  const slide = buildSlideMap(lesson.publishedData).get(slideId);
  if (!slide?.exercise) return null;

  const correct = gradeAnswer(slide, answer, variant, { userId, lessonKey });
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
      select: { id: true, publishedData: true, lang: true, course: { select: { lang: true } } },
    }),
    getUserTimeZone(userId),
  ]);
  if (!lesson) return null;

  // topics sit outside the game loop: no xp, no streak, no mastery. their
  // attempts still get recorded, skill-less, so a mastery rebuild can't pick them up.
  const topic = !lesson.course;
  const kind = lesson.publishedData?.kind ?? null;
  const now = new Date();

  let earnedXp = 0;

  await prisma.$transaction(async (tx) => {
    let verifiedQuizHistory = quizHistory;

    const existing = await tx.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      select: { quizHistory: true, completed: true, xpAwarded: true },
    });

    if (quizHistory !== undefined) {
      const prior = Array.isArray(existing?.quizHistory) ? existing.quizHistory : [];
      const newAttempts = quizHistory.slice(prior.length);
      verifiedQuizHistory = prior;

      if (newAttempts.length) {
        const slideMap = buildSlideMap(lesson.publishedData);
        const verified = verifyAttempts(slideMap, newAttempts, { userId, lessonKey });

        await tx.lessonAttempt.createMany({
          data: verified.map((v) => ({
            userId,
            lessonId: lesson.id,
            slideId: v.slideId,
            exerciseKind: v.kind,
            skill: topic ? null : v.skill,
            lang: lesson.course?.lang ?? lesson.lang,
            question: v.question,
            correct: v.correct,
          })),
        });
        for (const v of verified) {
          if (v.skill && !topic) await recordSkillMastery(tx, userId, v.skill, v.correct);
        }
        earnedXp += xpForAttempts(verified, kind);

        const seen = new Set(prior.map((e) => e.slideId));
        verifiedQuizHistory = [
          ...prior,
          ...verified.map(({ title, question, slideId, kind, correct, answer, variant }) => {
            const first = !seen.has(slideId);
            seen.add(slideId);
            return {
              title,
              question,
              slideId,
              kind,
              correct,
              ...(first && answer !== undefined && { answer }),
              ...(first && variant && { variant }),
            };
          }),
        ];
      }
    }

    // a bank has no last slide to finish on, so it is done once every question has an answer
    const finishing =
      kind === 'bank'
        ? !existing?.completed &&
          bankFinished(
            lesson.publishedData,
            quizHistory !== undefined ? verifiedQuizHistory : existing?.quizHistory
          )
        : isCompleted;
    if (finishing && !existing?.completed) earnedXp += completionXp(kind);

    const alreadyAwarded = existing?.xpAwarded ?? 0;
    const cap = lessonXpCap(countExercises(lesson.publishedData), kind);
    earnedXp = topic ? 0 : xpStillOwed(earnedXp, alreadyAwarded, cap);

    await tx.userLessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      update: {
        currentStep,
        lastPlayedAt: now,
        xpAwarded: alreadyAwarded + earnedXp,
        ...(finishing && { completed: true, completedAt: now }),
        ...(quizHistory !== undefined && { quizHistory: verifiedQuizHistory }),
      },
      create: {
        userId,
        lessonId: lesson.id,
        currentStep,
        lastPlayedAt: now,
        xpAwarded: earnedXp,
        ...(finishing && { completed: true, completedAt: now }),
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
