import { prisma } from '@/lib/prisma';
import { compileLesson, CompileError, formatCompileError } from '@/engine/lang';
import { verifyLesson } from '@/engine/verify';

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function starterSource(title) {
  return `lesson "${title}" {\n  slide "Slide 1" {\n    > Write something here.\n  }\n}`;
}

// the lesson source owns every content fact. these mirror into columns so the
// catalog can query them without parsing IR on every page load.
export function derivedMetadata(data) {
  return {
    title: data.title,
    description: data.summary ?? null,
    unit: data.unit ?? null,
    difficulty: data.difficulty ?? null,
    iconName: data.icon ?? null,
  };
}

// the single server-side trust boundary: client-compiled IR is never accepted,
// only source text, which gets recompiled here before it touches the DB.
export class VerifyError extends Error {
  constructor(findings) {
    super('This lesson has content problems that publishing would ship to students.');
    this.findings = findings;
  }
}

export function compileAndValidate(source) {
  try {
    const data = compileLesson(source);
    return { data, findings: verifyLesson(data), error: null };
  } catch (err) {
    const detail =
      err instanceof CompileError
        ? formatCompileError(source, err)
        : err instanceof Error
          ? err.message
          : String(err);
    return { data: null, findings: [], error: detail };
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
      source: src,
      data: compiled.data,
      ...derivedMetadata(compiled.data),
      status: 'draft',
      authorId,
      sortOrder: (agg._max.sortOrder ?? 0) + 1,
    },
  });
}

// saving never blocks on findings: a half-written slide legitimately has an
// offscreen target. publishing is where they have to be dealt with.
export async function updateLessonSource(id, source) {
  const compiled = compileAndValidate(source);
  if (compiled.error) return { lesson: null, findings: [], error: compiled.error };
  const lesson = await prisma.lesson.update({
    where: { id },
    data: { source, data: compiled.data, ...derivedMetadata(compiled.data) },
  });
  return { lesson, findings: compiled.findings, error: null };
}

export async function moveLessonToCourse(id, courseId) {
  return prisma.lesson.update({ where: { id }, data: { courseId } });
}

export async function publishLesson(id, { force = false } = {}) {
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) throw new Error('lesson not found');
  const compiled = compileAndValidate(lesson.source);
  if (compiled.error) throw new Error(compiled.error);
  if (compiled.findings.length && !force) throw new VerifyError(compiled.findings);
  return prisma.lesson.update({
    where: { id },
    data: {
      publishedSource: lesson.source,
      publishedData: compiled.data,
      ...derivedMetadata(compiled.data),
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
