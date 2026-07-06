import { prisma } from '@/lib/prisma';
import { lessonSchema } from '@/engine/ir/lesson';

export async function getLessonByKey(lessonKey) {
  return prisma.lesson.findUnique({ where: { lessonKey } });
}

export async function getLessonById(id) {
  return prisma.lesson.findUnique({ where: { id } });
}

export async function getNextLessonKey(courseId, sortOrder) {
  if (!courseId) return null;
  const next = await prisma.lesson.findFirst({
    where: { courseId, sortOrder: { gt: sortOrder } },
    orderBy: { sortOrder: 'asc' },
    select: { lessonKey: true },
  });
  return next?.lessonKey ?? null;
}

// flattens every exercise-bearing slide across a course's lessons into one
// pool — the source for infinite practice mode. exercises live inside each
// lesson's compiled `data` JSON, not a separate table, so this has to pull
// every lesson row and scan its slides.
export async function getExercisePoolByCourse(courseId) {
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    select: { lessonKey: true, title: true, data: true },
  });

  const pool = [];
  for (const lesson of lessons) {
    const parsed = lessonSchema.safeParse(lesson.data);
    if (!parsed.success) continue;
    for (const slide of parsed.data.slides) {
      if (slide.exercise) pool.push({ ...slide, lessonKey: lesson.lessonKey });
    }
  }
  return pool;
}
