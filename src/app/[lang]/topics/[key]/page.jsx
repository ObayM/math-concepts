import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Button from '@/components/ui/Button';
import { lessonSchema } from '@/engine/ir/lesson';
import LessonPlayer from '@/components/lesson/LessonPlayer';
import { getLessonByKey } from '@/lib/db/lessonService';
import { courseUrlSlug } from '@/lib/db/courseService';
import { getFullSession, isAdmin } from '@/lib/authz';
import * as Sentry from '@sentry/nextjs';
import { getT } from '@/lib/i18n/server';
import { getMasteryFor } from '@/lib/db/progressService';
import { skippableChecks } from '@/lib/prerequisites';

export async function generateMetadata({ params }) {
  const { key, lang } = await params;
  const row = await getLessonByKey(key, lang);
  if (!row || row.status !== 'published') return { title: 'Lesson not found' };

  const canonical = `/topics/${key}`;
  return {
    title: row.title,
    description: row.description ?? undefined,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: row.title,
      description: row.description ?? undefined,
      url: canonical,
    },
    twitter: {
      card: 'summary_large_image',
      title: row.title,
      description: row.description ?? undefined,
    },
  };
}

export default async function TopicPage({ params, searchParams }) {
  const { key, lang } = await params;
  const { preview } = await searchParams;
  const t = await getT();

  const row = await getLessonByKey(key, lang);
  if (!row) notFound();
  if (row.course) redirect(`/courses/${courseUrlSlug(row.course)}/${key}`);

  const session = await getFullSession();
  const wantsDraft = preview === 'draft' && isAdmin(session?.user ?? null);
  if (!wantsDraft && row.status !== 'published') notFound();

  const parsed = lessonSchema.safeParse(wantsDraft ? row.data : row.publishedData);
  if (!parsed.success || !parsed.data.slides.some((slide) => !slide.hidden)) {
    Sentry.captureException(new Error(`topic will not render: ${key}`));
    return (
      <div className="-mt-[var(--nav-h)] flex min-h-dvh items-center justify-center px-4 pt-[var(--nav-h)]">
        <div className="max-w-md text-center">
          <p className="font-mono text-4xl text-neutral-300">f(x) = ?</p>
          <h1 className="font-display mt-6 text-3xl font-bold tracking-tight text-neutral-900">
            {t('lesson.brokenTitle')}
          </h1>
          <p className="mt-3 text-neutral-500">{t('lesson.brokenBody')}</p>
          <Link href="/topics" className="mt-8 inline-block">
            <Button variant="primary">{t('topics.back')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const mastery = await getMasteryFor(session?.user?.id, parsed.data.requires);
  const skipTo = skippableChecks(parsed.data.slides, parsed.data.requires, mastery);

  return (
    <LessonPlayer
      slides={parsed.data.slides}
      lessonId={key}
      topic
      nextLessonId={null}
      skipTo={skipTo}
      kind={parsed.data.kind}
    />
  );
}
