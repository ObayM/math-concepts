import { prisma } from '@/lib/prisma';
import { compileLesson } from '@/engine/lang';
import { lessonSchema, irNeedsRecompile } from '@/engine/ir/lesson';

// the source is the record and the IR is a cache, so a lesson compiled by an
// older engine gets rebuilt on read instead of migrated. a recompile that
// throws leaves the old IR in place: a stale lesson beats a 500 mid-lesson.
export function refreshLessonIr(lesson) {
  if (!lesson) return lesson;
  const patch = {};
  if (lesson.source && irNeedsRecompile(lesson.data)) {
    try {
      patch.data = compileLesson(lesson.source);
    } catch {
      /* keep the stale IR */
    }
  }
  if (lesson.publishedSource && irNeedsRecompile(lesson.publishedData)) {
    try {
      patch.publishedData = compileLesson(lesson.publishedSource);
    } catch {
      /* keep the stale IR */
    }
  }
  if (!Object.keys(patch).length) return lesson;

  // the write-back is an optimisation, not the point, and two readers racing it
  // just write the same bytes twice
  prisma.lesson.update({ where: { id: lesson.id }, data: patch }).catch(() => {});
  return { ...lesson, ...patch };
}

export async function getLessonByKey(lessonKey) {
  return refreshLessonIr(await prisma.lesson.findUnique({ where: { lessonKey } }));
}

export async function getLessonById(id) {
  return refreshLessonIr(await prisma.lesson.findUnique({ where: { id } }));
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
    where: { courseId, status: 'published' },
    select: { lessonKey: true, title: true, publishedData: true },
  });

  const pool = [];
  for (const lesson of lessons) {
    const parsed = lessonSchema.safeParse(lesson.publishedData);
    if (!parsed.success) continue;
    for (const slide of parsed.data.slides) {
      if (slide.exercise && !slide.hidden) pool.push({ ...slide, lessonKey: lesson.lessonKey });
    }
  }
  return pool;
}
