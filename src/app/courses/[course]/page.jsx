import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Zap } from 'lucide-react';
import LessonCard from '@/components/lesson/LessonCard';
import Badge from '@/components/ui/Badge';

// one page for every course — matches the course by name (the index links to
// /courses/<name lowercased>) and lists its lessons from the DB.
export default async function CoursePage({ params }) {
  const { course: courseSlug } = await params;

  const courses = await prisma.course.findMany();
  const course = courses.find((c) => c.name.toLowerCase() === courseSlug.toLowerCase());
  if (!course) notFound();

  const session = await auth.api.getSession({ headers: await headers() });

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
    where: { courseId: course.id },
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
    if (status === 'locked' && isStarted) status = 'unlocked';

    return { ...lesson, id: lesson.lessonKey, status };
  });

  const completedCount = lessonsWithProgress.filter((l) => l.status === 'completed').length;
  // Integrate a flash cards system here, wehre you can memorize, revise everything you learned in a very short time
  return (
    <div className="min-h-[calc(100vh-var(--nav-h))] bg-surface">
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <Badge variant="primary" className="mb-4 text-sm px-4 py-1.5">
            {course.name}
          </Badge>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-neutral-900 mb-4">
            {course.name}
          </h1>
          <p className="text-xl text-neutral-500 leading-relaxed mb-4">
            {course.description || 'Complete each lesson to unlock the next.'}
          </p>
          <p className="text-sm font-bold text-neutral-400 mb-6">
            {completedCount} / {lessons.length} lessons completed
          </p>
          {lessons.length > 0 && (
            <Link
              href={`/courses/${courseSlug}/practice`}
              className="inline-flex items-center gap-2 bg-accent-600 hover:bg-accent-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl border-b-[3px] border-accent-800 active:border-b-0 active:translate-y-[3px] transition-all"
            >
              <Zap className="w-4 h-4" />
              Practice
            </Link>
          )}
        </div>

        <div className="max-w-2xl mx-auto">
          {lessonsWithProgress.map((lesson, i) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              index={i}
              isLast={i === lessonsWithProgress.length - 1}
            />
          ))}
          {lessons.length === 0 && (
            <p className="text-center text-neutral-400">No lessons in this course yet.</p>
          )}
        </div>
      </main>
    </div>
  );
}
