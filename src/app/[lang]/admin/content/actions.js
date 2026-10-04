'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { assertPermission, isSuperAdmin } from '@/lib/authz';
import { AUDIT, recordAudit } from '@/lib/db/auditService';
import {
  courseImpact,
  createCourse,
  createLesson,
  deleteCourse,
  deleteLesson,
  lessonImpact,
  moveCourse,
  moveLesson,
  moveLessonToCourse,
  publishLesson,
  publishedLessonCount,
  unpublishLesson,
  updateCourse,
  VerifyError,
} from '@/lib/db/contentService';

async function requireContentPermission(action) {
  const { ok, user } = await assertPermission({ content: [action] });
  if (!ok) throw new Error('Forbidden');
  return user;
}

function revalidate() {
  revalidatePath('/admin/content');
  revalidatePath('/courses');
  revalidatePath('/topics');
  revalidatePath('/dashboard');
}

export async function createCourseAction(formData) {
  const user = await requireContentPermission('create');
  const name = formData.get('name')?.toString().trim();
  const description = formData.get('description')?.toString().trim() || null;
  const slug = formData.get('slug')?.toString().trim() || null;
  const lang = formData.get('lang')?.toString().trim() || 'en';
  if (!name) throw new Error('Course name is required');

  const course = await createCourse({ name, description, slug, lang });
  await recordAudit({
    action: AUDIT.COURSE_CREATED,
    target: { type: 'course', id: course.id, label: course.name },
  });
  revalidate();
  return { userId: user.id };
}

export async function updateCourseAction(prevState, formData) {
  await requireContentPermission('update');
  const id = formData.get('id')?.toString();
  const name = formData.get('name')?.toString().trim();
  const description = formData.get('description')?.toString().trim() || null;
  if (!id || !name) return { ok: false, error: 'Course name is required' };

  await updateCourse(id, { name, description });
  await recordAudit({
    action: AUDIT.COURSE_UPDATED,
    target: { type: 'course', id, label: name },
  });
  revalidate();
  return { ok: true };
}

export async function publishCourseAction(prevState, formData) {
  await requireContentPermission('publish');
  const id = formData.get('id')?.toString();
  const name = formData.get('name')?.toString() ?? null;
  if (!id) return { ok: false, error: 'Course id is required' };

  if ((await publishedLessonCount(id)) === 0) {
    return { ok: false, error: 'Publish at least one lesson before publishing the course.' };
  }

  await updateCourse(id, { status: 'published' });
  await recordAudit({
    action: AUDIT.COURSE_PUBLISHED,
    target: { type: 'course', id, label: name },
  });
  revalidate();
  return { ok: true };
}

export async function unpublishCourseAction(prevState, formData) {
  await requireContentPermission('publish');
  const id = formData.get('id')?.toString();
  const name = formData.get('name')?.toString() ?? null;
  if (!id) return { ok: false, error: 'Course id is required' };

  await updateCourse(id, { status: 'draft' });
  await recordAudit({
    action: AUDIT.COURSE_UNPUBLISHED,
    target: { type: 'course', id, label: name },
  });
  revalidate();
  return { ok: true };
}

export async function moveCourseAction(formData) {
  await requireContentPermission('update');
  const id = formData.get('id')?.toString();
  const direction = formData.get('direction')?.toString();
  if (!id || !['up', 'down'].includes(direction)) throw new Error('id and direction are required');

  if (await moveCourse(id, direction)) {
    await recordAudit({
      action: AUDIT.COURSES_REORDERED,
      target: { type: 'course', id },
      meta: { direction },
    });
  }
  revalidate();
}

export async function createLessonAction(formData) {
  const user = await requireContentPermission('create');
  const courseId = formData.get('courseId')?.toString();
  const title = formData.get('title')?.toString().trim();
  if (!courseId || !title) throw new Error('Course and title are required');

  const lesson = await createLesson({ courseId, title, authorId: user.id });
  await recordAudit({
    action: AUDIT.LESSON_CREATED,
    target: { type: 'lesson', id: lesson.id, label: title },
  });
  revalidate();
  redirect(`/admin/content/lessons/${lesson.id}/edit`);
}

export async function publishLessonAction(prevState, formData) {
  await requireContentPermission('publish');
  const id = formData.get('id')?.toString();
  if (!id) throw new Error('Lesson id is required');
  const force = formData.get('force') === '1';

  let lesson;
  try {
    lesson = await publishLesson(id, { force });
  } catch (err) {
    if (err instanceof VerifyError) return { ok: false, findings: err.findings };
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  await recordAudit({
    action: force ? AUDIT.LESSON_PUBLISHED_WITH_FINDINGS : AUDIT.LESSON_PUBLISHED,
    target: { type: 'lesson', id, label: lesson.title ?? lesson.lessonKey },
  });
  revalidate();
  return { ok: true, forced: force };
}

export async function unpublishLessonAction(formData) {
  await requireContentPermission('publish');
  const id = formData.get('id')?.toString();
  if (!id) throw new Error('Lesson id is required');

  const lesson = await unpublishLesson(id);
  await recordAudit({
    action: AUDIT.LESSON_UNPUBLISHED,
    target: { type: 'lesson', id, label: lesson.title ?? lesson.lessonKey },
  });
  revalidate();
}

export async function moveLessonAction(formData) {
  await requireContentPermission('update');
  const id = formData.get('id')?.toString();
  const direction = formData.get('direction')?.toString();
  if (!id || !['up', 'down'].includes(direction)) throw new Error('id and direction are required');

  if (await moveLesson(id, direction)) {
    await recordAudit({
      action: AUDIT.LESSONS_REORDERED,
      target: { type: 'lesson', id },
      meta: { direction },
    });
  }
  revalidate();
}

export async function moveLessonToCourseAction(formData) {
  await requireContentPermission('update');
  const id = formData.get('id')?.toString();
  const courseId = formData.get('courseId')?.toString();
  if (!id || !courseId) throw new Error('Lesson and course are required');

  const lesson = await moveLessonToCourse(id, courseId);
  await recordAudit({
    action: AUDIT.LESSON_MOVED,
    target: { type: 'lesson', id, label: lesson.title ?? lesson.lessonKey },
    meta: { courseId },
  });
  revalidate();
}

// "get it off the site" is unpublish. deleting also erases the attempt history
// the measurement dashboard reports on, so it refuses until a super admin says
// explicitly that they mean it.
export async function deleteLessonAction(prevState, formData) {
  const user = await requireContentPermission('delete');
  const id = formData.get('id')?.toString();
  if (!id) return { ok: false, error: 'Lesson id is required' };
  const force = formData.get('force') === '1';

  const impact = await lessonImpact(id);
  if (!impact) return { ok: false, error: 'Lesson not found' };

  const hasHistory = impact.attempts > 0 || impact.progress > 0;
  if (hasHistory && !force) return { ok: false, impact };
  if (hasHistory && !isSuperAdmin(user)) {
    return { ok: false, error: 'Only a super admin can delete a lesson with student history.' };
  }

  await deleteLesson(id);
  await recordAudit({
    action: AUDIT.LESSON_DELETED,
    target: { type: 'lesson', id, label: impact.label },
    meta: { attempts: impact.attempts, progress: impact.progress, forced: force },
  });
  revalidate();
  return { ok: true };
}

export async function deleteCourseAction(prevState, formData) {
  const user = await requireContentPermission('delete');
  const id = formData.get('id')?.toString();
  if (!id) return { ok: false, error: 'Course id is required' };
  const force = formData.get('force') === '1';

  const impact = await courseImpact(id);
  if (!impact) return { ok: false, error: 'Course not found' };

  const hasHistory = impact.attempts > 0 || impact.progress > 0;
  if (hasHistory && !force) return { ok: false, impact };
  if (hasHistory && !isSuperAdmin(user)) {
    return { ok: false, error: 'Only a super admin can delete a course with student history.' };
  }

  await deleteCourse(id);
  await recordAudit({
    action: AUDIT.COURSE_DELETED,
    target: { type: 'course', id, label: impact.label },
    meta: {
      lessons: impact.lessons,
      attempts: impact.attempts,
      progress: impact.progress,
      forced: force,
    },
  });
  revalidate();
  return { ok: true };
}
