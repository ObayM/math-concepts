import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';
import LessonCard from '@/components/lesson/LessonCard';
import Button from '@/components/ui/Button';
import { resolveCourseBySlug, courseUrlSlug } from '@/lib/db/courseService';
import { getFullSession, isAdmin } from '@/lib/authz';
import { getT } from '@/lib/i18n/server';

export default async function CoursePage({ params }) {
  const { course: courseSlug, lang } = await params;
  const t = await getT();

  const course = await resolveCourseBySlug(courseSlug, lang);
  if (!course) notFound();

  const session = await getFullSession();
  const viewerIsAdmin = isAdmin(session?.user ?? null);

  let progressMap = new Map();
  if (session?.user) {
    const progressData = await prisma.userLessonProgress.findMany({
      where: { userId: session.user.id },
      select: {
        completed: true,
        currentStep: true,
        lesson: { select: { lessonKey: true } },
      },
    });
    progressData.forEach((p) => {
      progressMap.set(p.lesson.lessonKey, {
        is_completed: p.completed,
        current_step: p.currentStep,
      });
    });
  }

  const lessons = await prisma.lesson.findMany({
    where: viewerIsAdmin ? { courseId: course.id } : { courseId: course.id, status: 'published' },
    orderBy: { sortOrder: 'asc' },
  });

  const lessonsWithProgress = lessons.map((lesson, index) => {
    const progress = progressMap.get(lesson.lessonKey);
    const isCompleted = progress?.is_completed;
    const isStarted = (progress?.current_step ?? 0) > 0;

    let status = 'locked';
    if (isCompleted) {
      status = 'completed';
    } else if (index === 0) {
      status = 'unlocked';
    } else {
      const prevKey = lessons[index - 1].lessonKey;
      if (progressMap.get(prevKey)?.is_completed) status = 'unlocked';
    }
    if (status === 'locked' && (isStarted || viewerIsAdmin)) status = 'unlocked';

    return { ...lesson, id: lesson.lessonKey, status, isDraft: lesson.status !== 'published' };
  });

  const completedCount = lessonsWithProgress.filter((l) => l.status === 'completed').length;
  const pct = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
  const slug = courseUrlSlug(course);

  const groups = [];
  for (const lesson of lessonsWithProgress) {
    const last = groups[groups.length - 1];
    if (last && last.unit === lesson.unit) {
      last.lessons.push(lesson);
    } else {
      groups.push({ unit: lesson.unit, lessons: [lesson] });
    }
  }

  return (
    <div className="-mt-[var(--nav-h)] min-h-dvh pt-[var(--nav-h)]">
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <Link
          href="/courses"
          className="tap-target-h inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-400 transition-colors hover:text-neutral-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('course.allCourses')}
        </Link>

        <header className="mt-5 animate-fade-in-up">
          <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            {course.name}
          </h1>
          <p className="mt-3 text-lg text-neutral-500">
            {course.description || t('course.defaultBlurb')}
          </p>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-neutral-500">
                  {t('course.completedOf', { done: completedCount, total: lessons.length })}
                </span>
                <span className="font-bold text-neutral-700">{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {lessons.length > 0 && (
              <Button
                as={Link}
                href={`/courses/${courseSlug}/practice`}
                variant="outline"
                size="sm"
                icon={<Zap className="h-4 w-4" />}
                className="shrink-0"
              >
                {t('course.practice')}
              </Button>
            )}
          </div>
        </header>

        <div className="mt-12">
          {groups.map((group, gi) => {
            const groupCompleted = group.lessons.filter((l) => l.status === 'completed').length;
            return (
              <div key={group.unit ?? `ungrouped-${gi}`}>
                {group.unit && (
                  <div
                    className={`flex items-baseline justify-between ${gi === 0 ? 'mb-4' : 'mt-10 mb-4 border-t border-neutral-100 pt-8'}`}
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">
                        {t('course.unit', { n: gi + 1 })}
                      </p>
                      <h2 className="mt-1 font-display text-xl font-bold text-neutral-900">
                        {group.unit}
                      </h2>
                    </div>
                    <p className="shrink-0 text-xs font-bold text-neutral-400">
                      {groupCompleted} / {group.lessons.length}
                    </p>
                  </div>
                )}
                {group.lessons.map((lesson, i) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    courseSlug={slug}
                    index={i}
                    isLast={i === group.lessons.length - 1}
                  />
                ))}
              </div>
            );
          })}
          {lessons.length === 0 && (
            <p className="text-center text-neutral-400">{t('course.noLessons')}</p>
          )}
        </div>
      </main>
    </div>
  );
}
