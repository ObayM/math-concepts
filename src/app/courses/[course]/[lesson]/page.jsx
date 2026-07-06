import { notFound } from 'next/navigation';
import { lessonSchema } from '@/engine/ir/lesson';
import LessonPlayer from '@/components/lesson/LessonPlayer';
import { getLessonByKey, getNextLessonKey } from '@/lib/db/lessonService';
import { getFullSession, isAdmin } from '@/lib/authz';

export default async function LessonPage({ params, searchParams }) {
  const { course, lesson: lessonSlug } = await params;
  const { preview } = await searchParams;

  const lessonRow = await getLessonByKey(lessonSlug);
  if (!lessonRow) notFound();

  let wantsDraft = preview === 'draft';
  if (wantsDraft) {
    const session = await getFullSession();
    wantsDraft = isAdmin(session?.user ?? null);
  }

  if (!wantsDraft && lessonRow.status !== 'published') notFound();

  const ir = wantsDraft ? lessonRow.data : lessonRow.publishedData;
  const parsed = lessonSchema.safeParse(ir);
  if (!parsed.success) {
    console.error('Invalid lesson data for', lessonSlug, parsed.error.flatten());
    notFound();
  }

  const nextLessonId = await getNextLessonKey(lessonRow.courseId, lessonRow.sortOrder);

  return (
    <LessonPlayer
      slides={parsed.data.slides}
      lessonId={lessonSlug}
      coursePath={course}
      nextLessonId={nextLessonId}
    />
  );
}
