import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { lessonDataSchema } from '@/lib/lessons/schema';
import LessonPlayer from '@/components/lesson/LessonPlayer';

export default async function LessonPage({ params }) {
  const { course, lesson: lessonSlug } = await params;

  const lessonRow = await prisma.lesson.findUnique({
    where: { lessonKey: lessonSlug },
    select: { data: true },
  });

  if (!lessonRow) notFound();

  const parsed = lessonDataSchema.safeParse(lessonRow.data);
  if (!parsed.success) {
    console.error('Invalid lesson data for', lessonSlug, parsed.error.flatten());
    notFound();
  }

  return <LessonPlayer slides={parsed.data.slides} lessonId={lessonSlug} coursePath={course} />;
}
