import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { lessonDataSchema } from '@/lib/lessons/schema';
import { lessonSchema } from '@/engine/ir/lesson';
import LessonPlayer from '@/components/lesson/LessonPlayer';

export default async function LessonPage({ params }) {
  const { course, lesson: lessonSlug } = await params;

  const lessonRow = await prisma.lesson.findUnique({
    where: { lessonKey: lessonSlug },
    select: { data: true },
  });

  if (!lessonRow) notFound();

  // v2 (unified Prism grammar) validates against lessonSchema; older lessons
  // fall back to the v1 block schema until they're ported.
  const v2 = lessonSchema.safeParse(lessonRow.data);
  let slides;
  if (v2.success) {
    slides = v2.data.slides;
  } else {
    const v1 = lessonDataSchema.safeParse(lessonRow.data);
    if (!v1.success) {
      console.error('Invalid lesson data for', lessonSlug, v1.error.flatten());
      notFound();
    }
    slides = v1.data.slides;
  }

  return <LessonPlayer slides={slides} lessonId={lessonSlug} coursePath={course} />;
}
