import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Button from '@/components/ui/Button';
import { lessonSchema } from '@/engine/ir/lesson';
import LessonPlayer from '@/components/lesson/LessonPlayer';
import { getLessonByKey, getNextLessonKey } from '@/lib/db/lessonService';
import { courseUrlSlug } from '@/lib/db/courseService';
import { getFullSession, isAdmin } from '@/lib/authz';
import * as Sentry from '@sentry/nextjs';
import { getT } from '@/lib/i18n/server';
import { getMasteryFor } from '@/lib/db/progressService';
import { skippableChecks } from '@/lib/prerequisites';

export async function generateMetadata({ params }) {
  const { course, lesson: lessonSlug, lang } = await params;
  const row = await getLessonByKey(lessonSlug, lang);
  if (!row || row.status !== 'published') return { title: 'Lesson not found' };

  const canonical = `/courses/${row.course ? courseUrlSlug(row.course) : course}/${lessonSlug}`;
  return {
    title: row.title,
    description: row.summary ?? undefined,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: row.title,
      description: row.summary ?? undefined,
      url: canonical,
    },
    twitter: {
      card: 'summary_large_image',
      title: row.title,
      description: row.summary ?? undefined,
    },
  };
}

export default async function LessonPage({ params, searchParams }) {
  const { course, lesson: lessonSlug, lang } = await params;
  const { preview } = await searchParams;
  const t = await getT();

  const lessonRow = await getLessonByKey(lessonSlug, lang);
  if (!lessonRow) notFound();

  const canonicalCourse = lessonRow.course ? courseUrlSlug(lessonRow.course) : course;
  if (canonicalCourse.toLowerCase() !== course.toLowerCase()) {
    const query = preview ? `?preview=${encodeURIComponent(preview)}` : '';
    redirect(`/courses/${canonicalCourse}/${lessonSlug}${query}`);
  }

  const session = await getFullSession();
  const wantsDraft = preview === 'draft' && isAdmin(session?.user ?? null);

  if (!wantsDraft && lessonRow.status !== 'published') notFound();

  const ir = wantsDraft ? lessonRow.data : lessonRow.publishedData;
  const parsed = lessonSchema.safeParse(ir);
  if (!parsed.success) {
    Sentry.captureException(new Error(`invalid lesson data: ${lessonSlug}`), {
      extra: { issues: parsed.error.flatten() },
    });
    return <BrokenLesson course={course} t={t} />;
  }

  if (!parsed.data.slides.some((slide) => !slide.hidden)) {
    Sentry.captureException(new Error(`lesson has no visible slides: ${lessonSlug}`));
    return <BrokenLesson course={course} t={t} />;
  }

  const [nextLessonId, mastery] = await Promise.all([
    getNextLessonKey(lessonRow.courseId, lessonRow.sortOrder),
    getMasteryFor(session?.user?.id, parsed.data.requires),
  ]);
  const skipTo = skippableChecks(parsed.data.slides, parsed.data.requires, mastery);

  return (
    <LessonPlayer
      slides={parsed.data.slides}
      lessonId={lessonSlug}
      coursePath={course}
      nextLessonId={nextLessonId}
      skipTo={skipTo}
    />
  );
}

// a lesson that fails to compile is not a missing page. saying "this doesn't
// exist" sends the student looking for a typo in the url instead of telling us.
function BrokenLesson({ course, t }) {
  return (
    <div className="-mt-[var(--nav-h)] flex min-h-dvh items-center justify-center px-4 pt-[var(--nav-h)]">
      <div className="max-w-md text-center">
        <p className="font-mono text-4xl text-neutral-300">f(x) = ?</p>
        <h1 className="font-display mt-6 text-3xl font-bold tracking-tight text-neutral-900">
          {t('lesson.brokenTitle')}
        </h1>
        <p className="mt-3 text-neutral-500">{t('lesson.brokenBody')}</p>
        <Link href={`/courses/${course}`} className="mt-8 inline-block">
          <Button variant="primary">{t('lesson.back')}</Button>
        </Link>
      </div>
    </div>
  );
}
