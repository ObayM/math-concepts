import { prisma } from '@/lib/prisma';

export async function getSkillMasteryDistribution() {
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
  const [total, correct] = await Promise.all([
    prisma.lessonAttempt.groupBy({ by: ['lessonId'], _count: { _all: true } }),
    prisma.lessonAttempt.groupBy({
      by: ['lessonId'],
      where: { correct: true },
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
