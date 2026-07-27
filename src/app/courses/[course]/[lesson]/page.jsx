import Link from 'next/link';
import { notFound } from 'next/navigation';
import Button from '@/components/ui/Button';
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
    return <BrokenLesson course={course} />;
  }

  if (!parsed.data.slides.some((slide) => !slide.hidden)) {
    console.error('Lesson has no visible slides:', lessonSlug);
    return <BrokenLesson course={course} />;
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

// a lesson that fails to compile is not a missing page. saying "this doesn't
// exist" sends the student looking for a typo in the url instead of telling us.
function BrokenLesson({ course }) {
  return (
    <div className="bg-app -mt-[var(--nav-h)] flex min-h-screen items-center justify-center px-4 pt-[var(--nav-h)]">
      <div className="max-w-md text-center">
        <p className="font-mono text-4xl text-neutral-300">f(x) = ?</p>
        <h1 className="font-display mt-6 text-3xl font-bold tracking-tight text-neutral-900">
          This lesson is having a moment
        </h1>
        <p className="mt-3 text-neutral-500">
          Something in it is broken on our side, not yours. We have been told. Try another lesson in
          the meantime.
        </p>
        <Link href={`/courses/${course}`} className="mt-8 inline-block">
          <Button variant="primary">Back to the course</Button>
        </Link>
      </div>
    </div>
  );
}
