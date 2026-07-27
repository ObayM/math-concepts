'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { assertPermission } from '@/lib/authz';
import {
  createCourse,
  createLesson,
  deleteCourse,
  deleteLesson,
  publishLesson,
  unpublishLesson,
} from '@/lib/db/contentService';

async function requireContentPermission(action) {
  const { ok, user } = await assertPermission({ content: [action] });
  if (!ok) throw new Error('Forbidden');
  return user;
}

export async function createCourseAction(formData) {
  const user = await requireContentPermission('create');
  const name = formData.get('name')?.toString().trim();
  const description = formData.get('description')?.toString().trim() || null;
  if (!name) throw new Error('Course name is required');

  await createCourse({ name, description });
  revalidatePath('/admin/content');
  return { userId: user.id };
}

export async function createLessonAction(formData) {
  const user = await requireContentPermission('create');
  const courseId = formData.get('courseId')?.toString();
  const title = formData.get('title')?.toString().trim();
  if (!courseId || !title) throw new Error('Course and title are required');

  const lesson = await createLesson({ courseId, title, authorId: user.id });
  revalidatePath('/admin/content');
  redirect(`/admin/content/lessons/${lesson.id}/edit`);
}

export async function publishLessonAction(formData) {
  await requireContentPermission('publish');
  const id = formData.get('id')?.toString();
  if (!id) throw new Error('Lesson id is required');
  await publishLesson(id);
  revalidatePath('/admin/content');
}

export async function unpublishLessonAction(formData) {
  await requireContentPermission('publish');
  const id = formData.get('id')?.toString();
  if (!id) throw new Error('Lesson id is required');
  await unpublishLesson(id);
  revalidatePath('/admin/content');
}

export async function deleteLessonAction(formData) {
  await requireContentPermission('delete');
  const id = formData.get('id')?.toString();
  if (!id) throw new Error('Lesson id is required');
  await deleteLesson(id);
  revalidatePath('/admin/content');
}

export async function deleteCourseAction(formData) {
  await requireContentPermission('delete');
  const id = formData.get('id')?.toString();
  if (!id) throw new Error('Course id is required');
  await deleteCourse(id);
  revalidatePath('/admin/content');
}
