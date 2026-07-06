import { prisma } from '@/lib/prisma';
import { compileLesson, CompileError, formatCompileError } from '@/engine/lang';

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function starterSource(title) {
  return `lesson "${title}" {\n  slide "Slide 1" {\n    > Write something here.\n  }\n}`;
}

// the single server-side trust boundary: client-compiled IR is never accepted,
// only source text, which gets recompiled here before it touches the DB.
export function compileAndValidate(source) {
  try {
    return { data: compileLesson(source), error: null };
  } catch (err) {
    const detail =
      err instanceof CompileError
        ? formatCompileError(source, err)
        : err instanceof Error
          ? err.message
          : String(err);
    return { data: null, error: detail };
  }
}

async function generateUniqueLessonKey(title) {
  const base = slugify(title) || 'lesson';
  for (let i = 0; i < 5; i++) {
    const suffix = Math.random().toString(36).slice(2, 7);
    const key = `${base}-${suffix}`;
    const existing = await prisma.lesson.findUnique({
      where: { lessonKey: key },
      select: { id: true },
    });
    if (!existing) return key;
  }
  throw new Error('could not generate a unique lesson key');
}

export async function createLesson({ courseId, title, source, authorId }) {
  const src = source && source.trim() ? source : starterSource(title);
  const compiled = compileAndValidate(src);
  if (compiled.error) throw new Error(compiled.error);

  const lessonKey = await generateUniqueLessonKey(title);
  const agg = await prisma.lesson.aggregate({ where: { courseId }, _max: { sortOrder: true } });

  return prisma.lesson.create({
    data: {
      courseId,
      lessonKey,
      title,
      source: src,
      data: compiled.data,
      status: 'draft',
      authorId,
      sortOrder: (agg._max.sortOrder ?? 0) + 1,
    },
  });
}

export async function updateLessonSource(id, source) {
  const compiled = compileAndValidate(source);
  if (compiled.error) return { lesson: null, error: compiled.error };
  const lesson = await prisma.lesson.update({
    where: { id },
    data: { source, data: compiled.data },
  });
  return { lesson, error: null };
}

export async function renameLesson(id, title) {
  return prisma.lesson.update({ where: { id }, data: { title } });
}

export async function moveLessonToCourse(id, courseId) {
  return prisma.lesson.update({ where: { id }, data: { courseId } });
}

export async function publishLesson(id) {
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) throw new Error('lesson not found');
  const compiled = compileAndValidate(lesson.source);
  if (compiled.error) throw new Error(compiled.error);
  return prisma.lesson.update({
    where: { id },
    data: {
      publishedSource: lesson.source,
      publishedData: compiled.data,
      status: 'published',
      publishedAt: new Date(),
    },
  });
}

export async function unpublishLesson(id) {
  return prisma.lesson.update({ where: { id }, data: { status: 'draft' } });
}

export async function deleteLesson(id) {
  return prisma.lesson.delete({ where: { id } });
}

export async function reorderLessons(orderedIds) {
  await prisma.$transaction(
    orderedIds.map((id, idx) => prisma.lesson.update({ where: { id }, data: { sortOrder: idx } }))
  );
}

async function generateUniqueCourseSlug(name) {
  const base = slugify(name) || 'course';
  let slug = base;
  let i = 1;
  while (await prisma.course.findFirst({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}

export async function createCourse({ name, description }) {
  const slug = await generateUniqueCourseSlug(name);
  const agg = await prisma.course.aggregate({ _max: { sortOrder: true } });
  return prisma.course.create({
    data: { name, slug, description, status: 'draft', sortOrder: (agg._max.sortOrder ?? 0) + 1 },
  });
}

export async function updateCourse(id, { name, description, status }) {
  return prisma.course.update({ where: { id }, data: { name, description, status } });
}

export async function reorderCourses(orderedIds) {
  await prisma.$transaction(
    orderedIds.map((id, idx) => prisma.course.update({ where: { id }, data: { sortOrder: idx } }))
  );
}

export async function deleteCourse(id) {
  return prisma.course.delete({ where: { id } });
}
