import { prisma } from '@/lib/prisma';

export const ACCURACY_WINDOW_DAYS = 90;

// /admin/* is dynamic (requireAdmin reads headers), so revalidate does nothing
// here. a short process-local memo keeps a page refresh from re-running two
// full aggregates over the attempts table.
const TTL_MS = 60_000;
const memo = (globalThis.__mathlyMeasurementMemo ??= new Map());

async function cached(key, fn) {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = await fn();
  memo.set(key, { at: Date.now(), value });
  return value;
}

function windowStart() {
  return new Date(Date.now() - ACCURACY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export async function getSkillMasteryDistribution() {
  return cached('skills', _getSkillMasteryDistribution);
}

async function _getSkillMasteryDistribution() {
  const rows = await prisma.userSkillMastery.groupBy({
    by: ['skill'],
    _avg: { score: true },
    _sum: { attempts: true, correct: true },
    _count: { userId: true },
    orderBy: { _avg: { score: 'asc' } },
  });

  return rows.map((r) => ({
    skill: r.skill,
    avgScore: r._avg.score ?? 0,
    learners: r._count.userId,
    attempts: r._sum.attempts ?? 0,
    correct: r._sum.correct ?? 0,
  }));
}

export async function getLessonAccuracyStats() {
  return cached('accuracy', _getLessonAccuracyStats);
}

async function _getLessonAccuracyStats() {
  const since = windowStart();
  const [total, correct] = await Promise.all([
    prisma.lessonAttempt.groupBy({
      by: ['lessonId'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.lessonAttempt.groupBy({
      by: ['lessonId'],
      where: { correct: true, createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  const correctByLesson = new Map(correct.map((r) => [r.lessonId, r._count._all]));
  const lessonIds = total.map((r) => r.lessonId);
  const lessons = await prisma.lesson.findMany({
    where: { id: { in: lessonIds } },
    select: { id: true, title: true, lessonKey: true },
  });
  const lessonById = new Map(lessons.map((l) => [l.id, l]));

  return total
    .map((r) => {
      const lesson = lessonById.get(r.lessonId);
      const attempts = r._count._all;
      const correctCount = correctByLesson.get(r.lessonId) ?? 0;
      return {
        lessonId: r.lessonId,
        title: lesson?.title ?? lesson?.lessonKey ?? r.lessonId,
        lessonKey: lesson?.lessonKey ?? null,
        attempts,
        correct: correctCount,
        accuracy: attempts ? correctCount / attempts : 0,
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy);
}

export async function getSiteStats() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [lessonsCompleted, attempts, activeToday, activeThisWeek, publishedLessons, courses] =
    await Promise.all([
      prisma.userLessonProgress.count({ where: { completed: true } }),
      prisma.lessonAttempt.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.userDailyActivity.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.userDailyActivity
        .findMany({
          where: { createdAt: { gte: weekAgo } },
          distinct: ['userId'],
          select: { userId: true },
        })
        .then((r) => r.length),
      prisma.lesson.count({ where: { status: 'published' } }),
      prisma.course.count({ where: { status: 'published' } }),
    ]);

  return { lessonsCompleted, attempts, activeToday, activeThisWeek, publishedLessons, courses };
}

export async function getStudentDetail(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      banned: true,
      timezone: true,
      createdAt: true,
      skillMastery: {
        orderBy: { score: 'asc' },
        select: { skill: true, score: true, attempts: true, correct: true },
      },
    },
  });
  if (!user) return null;

  const [progress, recentAttempts, totalXp] = await Promise.all([
    prisma.userLessonProgress.findMany({
      where: { userId },
      orderBy: { lastPlayedAt: 'desc' },
      select: {
        completed: true,
        currentStep: true,
        lastPlayedAt: true,
        lesson: { select: { id: true, lessonKey: true, title: true } },
      },
    }),
    prisma.lessonAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        correct: true,
        skill: true,
        question: true,
        createdAt: true,
        lesson: { select: { lessonKey: true, title: true } },
      },
    }),
    prisma.userDailyActivity
      .aggregate({ where: { userId }, _sum: { xp: true } })
      .then((a) => a._sum.xp ?? 0),
  ]);

  return { user, progress, recentAttempts, totalXp };
}
