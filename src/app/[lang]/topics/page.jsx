import { prisma } from '@/lib/prisma';
import { listTopics } from '@/lib/db/lessonService';
import { getFullSession } from '@/lib/authz';
import { getT } from '@/lib/i18n/server';
import TopicList from '@/components/topics/TopicList';

export async function generateMetadata() {
  const t = await getT();
  return {
    title: t('topics.title'),
    description: t('topics.subtitle'),
    alternates: { canonical: '/topics' },
  };
}

export default async function TopicsPage({ params }) {
  const { lang } = await params;
  const t = await getT();
  const session = await getFullSession();

  const groups = await listTopics(lang);
  const completed = session?.user
    ? (
        await prisma.userLessonProgress.findMany({
          where: { userId: session.user.id, completed: true, lesson: { courseId: null } },
          select: { lesson: { select: { lessonKey: true } } },
        })
      ).map((p) => p.lesson.lessonKey)
    : [];

  return (
    <div className="-mt-[var(--nav-h)] min-h-dvh pt-[var(--nav-h)]">
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <header className="animate-fade-in-up">
          <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            {t('topics.title')}
          </h1>
          <p className="mt-3 text-lg text-neutral-500">{t('topics.subtitle')}</p>
        </header>
        <TopicList groups={groups} completed={completed} />
      </main>
    </div>
  );
}
