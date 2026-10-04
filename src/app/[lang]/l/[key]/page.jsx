import { notFound, redirect } from 'next/navigation';
import { getLessonByKey } from '@/lib/db/lessonService';
import { courseUrlSlug } from '@/lib/db/courseService';

export default async function LessonLink({ params }) {
  const { key, lang } = await params;
  const row = await getLessonByKey(key, lang);
  if (!row || row.status !== 'published') notFound();
  redirect(row.course ? `/courses/${courseUrlSlug(row.course)}/${key}` : `/topics/${key}`);
}
