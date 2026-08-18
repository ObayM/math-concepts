import { notFound, redirect } from 'next/navigation';
import { getExercisePoolByCourse } from '@/lib/db/lessonService';
import { resolveCourseBySlug } from '@/lib/db/courseService';
import { getMyMastery } from '@/lib/db/progressService';
import { requireUser } from '@/lib/session';
import PracticeRunner from '@/components/lesson/PracticeRunner';
import Button from '@/components/ui/Button';

export default async function PracticePage({ params }) {
  const { course: courseSlug } = await params;
  const user = await requireUser();
  if (!user) redirect('/login');

  const course = await resolveCourseBySlug(courseSlug);
  if (!course) notFound();

  const [pool, mastery] = await Promise.all([
    getExercisePoolByCourse(course.id),
    getMyMastery(user.id),
  ]);

  if (!pool.length) {
    return (
      <div className="min-h-[calc(100dvh-var(--nav-h))] bg-surface flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-extrabold text-neutral-900 mb-2">No practice yet</h1>
          <p className="text-neutral-500 mb-6">
            {course.name} doesn&apos;t have any exercises to practice yet — check back after a
            lesson or two.
          </p>
          <Button as="a" href={`/courses/${courseSlug}`} variant="outline">
            Back to {course.name}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PracticeRunner
      pool={pool}
      mastery={mastery}
      coursePath={courseSlug}
      courseName={course.name}
    />
  );
}
