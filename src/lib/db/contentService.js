import { prisma } from '@/lib/prisma';
import { compileLesson, CompileError, formatCompileError } from '@/engine/lang';
import { verifyLesson, isBlocking } from '@/engine/verify';
import { lessonLinks } from '@/engine/links';

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

async function generateUniqueLessonKey(title, prefix = '') {
  const base = prefix + (slugify(title) || 'lesson');
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

export async function createTopic({ source, lang, authorId }) {
  const compiled = compileAndValidate(source);
  if (compiled.error) return { lesson: null, findings: [], error: compiled.error };

  const lessonKey = await generateUniqueLessonKey(
    compiled.data.title,
    lang === 'en' ? 'topic-' : `${lang}-topic-`
  );
  const lesson = await prisma.lesson.create({
    data: {
      courseId: null,
      lang,
      lessonKey,
      source,
      data: compiled.data,
      ...derivedMetadata(compiled.data),
      status: 'draft',
      authorId,
    },
  });
  return { lesson, findings: compiled.findings, error: null };
}

export async function getTopicByKey(lessonKey) {
  return prisma.lesson.findFirst({ where: { lessonKey, courseId: null } });
}

// the one write path for topics, behind both the admin form and the token api.
// a publish that verify blocks leaves a saved draft rather than failing the save.
/** @param {{ source: string, lang?: string, key?: string, publish?: boolean, authorId?: string | null }} input */
export async function saveTopic({ source, lang, key, publish = false, authorId = null }) {
  let lesson;
  let findings;
  let created = false;
  if (key) {
    const existing = await getTopicByKey(key);
    if (!existing) return { notFound: true };
    const saved = await updateLessonSource(existing.id, source);
    if (saved.error) return { error: saved.error };
    ({ lesson, findings } = saved);
  } else {
    const made = await createTopic({ source, lang, authorId });
    if (made.error) return { error: made.error };
    ({ lesson, findings } = made);
    created = true;
  }

  if (!publish) return { lesson, findings, created, published: false };
  try {
    lesson = await publishLesson(lesson.id);
    return { lesson, findings, created, published: true };
  } catch (err) {
    if (err instanceof VerifyError) {
      return { lesson, findings, created, published: false, blocking: err.findings };
    }
    throw err;
  }
}

export async function listAllTopics() {
  return prisma.lesson.findMany({
    where: { courseId: null },
    orderBy: [{ lang: 'asc' }, { unit: 'asc' }, { title: 'asc' }],
  });
}

// saving never blocks on findings: a half-written slide legitimately has an
// offscreen target. publishing is where they have to be dealt with.
export async function updateLessonSource(id, source, expectedUpdatedAt) {
  const compiled = compileAndValidate(source);
  if (compiled.error) return { lesson: null, findings: [], error: compiled.error };

  const data = { source, data: compiled.data, ...derivedMetadata(compiled.data) };

  // updateMany is the trick: `update` needs a unique where, but updateMany
  // accepts the extra predicate, so the version check and the write are one
  // statement with no read-then-write in between.
  if (expectedUpdatedAt) {
    const { count } = await prisma.lesson.updateMany({
      where: { id, updatedAt: new Date(expectedUpdatedAt) },
      data,
    });
    if (count === 0) {
      const current = await prisma.lesson.findUnique({
        where: { id },
        select: { source: true, updatedAt: true },
      });
      return { lesson: null, findings: [], error: null, conflict: current ?? { missing: true } };
    }
  } else {
    await prisma.lesson.update({ where: { id }, data });
  }

  const lesson = await prisma.lesson.findUnique({ where: { id } });
  return {
    lesson,
    findings: [...compiled.findings, ...(await brokenLinks(compiled.data))],
    error: null,
  };
}

async function brokenLinks(data) {
  const links = lessonLinks(data);
  if (!links.length) return [];
  const found = await prisma.lesson.findMany({
    where: { lessonKey: { in: [...new Set(links.map((l) => l.key))] } },
    select: { lessonKey: true },
  });
  const known = new Set(found.map((l) => l.lessonKey));
  return links
    .filter((l) => !known.has(l.key))
    .map((l) => ({
      slideId: l.slideId,
      code: 'V_LESSON_LINK_MISSING',
      message: `links to lesson "${l.key}", which doesn't exist`,
      severity: 'warning',
    }));
}

export async function moveLessonToCourse(id, courseId) {
  const agg = await prisma.lesson.aggregate({ where: { courseId }, _max: { sortOrder: true } });
  return prisma.lesson.update({
    where: { id },
    data: { courseId, lang: null, sortOrder: (agg._max.sortOrder ?? 0) + 1 },
  });
}

export async function publishLesson(id, { force = false } = {}) {
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) throw new Error('lesson not found');
  const compiled = compileAndValidate(lesson.source);
  if (compiled.error) throw new Error(compiled.error);
  const blocking = compiled.findings.filter(isBlocking);
  if (blocking.length && !force) throw new VerifyError(blocking);
  return prisma.lesson.update({
    where: { id },
    data: {
      publishedSource: lesson.source,
      publishedData: compiled.data,
      ...derivedMetadata(compiled.data),
      kind: compiled.data.kind ?? null,
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

export async function reorderLessons(courseId, orderedIds) {
  await prisma.$transaction(
    orderedIds.map((id, idx) =>
      prisma.lesson.updateMany({ where: { id, courseId }, data: { sortOrder: idx + 1 } })
    )
  );
}

// read the current order, swap one step, write the whole list back, so the
// batch writer stays the only thing that ever touches sortOrder.
export async function moveLesson(id, direction) {
  const lesson = await prisma.lesson.findUnique({ where: { id }, select: { courseId: true } });
  if (!lesson?.courseId) return null;

  const siblings = await prisma.lesson.findMany({
    where: { courseId: lesson.courseId },
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  });
  const ids = siblings.map((l) => l.id);
  const from = ids.indexOf(id);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= ids.length) return null;

  [ids[from], ids[to]] = [ids[to], ids[from]];
  await reorderLessons(lesson.courseId, ids);
  return lesson.courseId;
}

async function generateUniqueCourseSlug(name, requested) {
  // a non-latin name slugs to nothing, and "course-2" is a url nobody can read
  const base = slugify(requested ?? '') || slugify(name);
  if (!base) {
    throw new Error('This course name has no url-safe form. Give it an explicit slug.');
  }
  let slug = base;
  let i = 1;
  while (await prisma.course.findFirst({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}

/** @param {{ name: string, description?: string | null, slug?: string | null, lang?: string }} input */
export async function createCourse({ name, description, slug: requested = null, lang = 'en' }) {
  const slug = await generateUniqueCourseSlug(name, requested);
  const agg = await prisma.course.aggregate({ _max: { sortOrder: true } });
  return prisma.course.create({
    data: {
      name,
      slug,
      description,
      lang,
      status: 'draft',
      sortOrder: (agg._max.sortOrder ?? 0) + 1,
    },
  });
}

export async function updateCourse(id, { name, description, status }) {
  return prisma.course.update({ where: { id }, data: { name, description, status } });
}

export async function reorderCourses(orderedIds) {
  await prisma.$transaction(
    orderedIds.map((id, idx) =>
      prisma.course.update({ where: { id }, data: { sortOrder: idx + 1 } })
    )
  );
}

export async function moveCourse(id, direction) {
  const courses = await prisma.course.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  });
  const ids = courses.map((c) => c.id);
  const from = ids.indexOf(id);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= ids.length) return false;

  [ids[from], ids[to]] = [ids[to], ids[from]];
  await reorderCourses(ids);
  return true;
}

export async function publishedLessonCount(courseId) {
  return prisma.lesson.count({ where: { courseId, status: 'published' } });
}

// what a delete would actually destroy. the confirm copy names these numbers
// instead of a vague warning, and the force path audits them.
export async function lessonImpact(id) {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: {
      title: true,
      lessonKey: true,
      _count: { select: { attempts: true, progress: true } },
    },
  });
  if (!lesson) return null;
  return {
    label: lesson.title ?? lesson.lessonKey,
    attempts: lesson._count.attempts,
    progress: lesson._count.progress,
  };
}

export async function courseImpact(id) {
  const course = await prisma.course.findUnique({
    where: { id },
    select: { name: true, lessons: { select: { id: true } } },
  });
  if (!course) return null;
  const lessonIds = course.lessons.map((l) => l.id);
  const [attempts, progress] = await Promise.all([
    prisma.lessonAttempt.count({ where: { lessonId: { in: lessonIds } } }),
    prisma.userLessonProgress.count({ where: { lessonId: { in: lessonIds } } }),
  ]);
  return { label: course.name, lessons: lessonIds.length, attempts, progress };
}

export async function deleteCourse(id) {
  return prisma.course.delete({ where: { id } });
}
