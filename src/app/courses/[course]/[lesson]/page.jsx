import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { lessonSchema } from '@/engine/ir/lesson';
import LessonPlayer from '@/components/lesson/LessonPlayer';

export default async function LessonPage({ params }) {
  const { course, lesson: lessonSlug } = await params;

  const lessonRow = await prisma.lesson.findUnique({
    where: { lessonKey: lessonSlug },
    select: { data: true },
  });

  if (!lessonRow) notFound();

  // every lesson is compiled Prism (Lesson IR v2) now
  const parsed = lessonSchema.safeParse(lessonRow.data);
  if (!parsed.success) {
    console.error('Invalid lesson data for', lessonSlug, parsed.error.flatten());
    notFound();
  }

  return <LessonPlayer slides={parsed.data.slides} lessonId={lessonSlug} coursePath={course} />;
}
