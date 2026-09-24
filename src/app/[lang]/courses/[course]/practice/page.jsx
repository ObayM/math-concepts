import { notFound, redirect } from 'next/navigation';
import { getExercisePoolByCourse } from '@/lib/db/lessonService';
import { resolveCourseBySlug } from '@/lib/db/courseService';
import { getMyMastery, getMySkillTimes, getTakenLessonIds } from '@/lib/db/progressService';
import { requireUser } from '@/lib/session';
import PracticeRunner from '@/components/lesson/PracticeRunner';
import Button from '@/components/ui/Button';
import { getT } from '@/lib/i18n/server';

export default async function PracticePage({ params }) {
  const { course: courseSlug, lang } = await params;
  const user = await requireUser();
  if (!user) redirect('/login');
  const t = await getT();

  const course = await resolveCourseBySlug(courseSlug, lang);
  if (!course) notFound();

  const taken = await getTakenLessonIds(user.id);
  const [pool, mastery, lastSeen, anyInCourse] = await Promise.all([
    getExercisePoolByCourse(course.id, { lessonIds: taken }),
    getMyMastery(user.id),
    getMySkillTimes(user.id),
    getExercisePoolByCourse(course.id).then((all) => all.length > 0),
  ]);

  if (!pool.length) {
    return (
      <div className="min-h-[calc(100dvh-var(--nav-h))] bg-surface flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-extrabold text-neutral-900 mb-2">{t('practice.nothing')}</h1>
          <p className="text-neutral-500 mb-6">
            {anyInCourse
              ? t('practice.takeALesson', { course: course.name })
              : t('practice.emptyBody', { course: course.name })}
          </p>
          <Button as="a" href={`/courses/${courseSlug}`} variant="outline">
            {t('practice.backTo', { course: course.name })}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PracticeRunner
      pool={pool}
      mastery={mastery}
      lastSeen={lastSeen}
      coursePath={courseSlug}
      courseName={course.name}
    />
  );
}
