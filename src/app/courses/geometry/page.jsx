import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import LessonCard from '@/components/lessonCard';
import Badge from '@/components/ui/Badge';

export default async function GeometryCourse() {
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
    where: { category: 'Geometry' },
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

  return (
    <div className="min-h-[calc(100vh-var(--nav-h))] bg-surface">
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <Badge variant="accent" className="mb-4 text-sm px-4 py-1.5">
            Geometry
          </Badge>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-neutral-900 mb-4">
            Explore the <span className="text-accent-600">Shape of Space</span>
          </h1>
          <p className="text-xl text-neutral-500 leading-relaxed mb-4">
            Dive into points, lines, and shapes. Master the coordinate plane and see geometry come
            alive.
          </p>
          <p className="text-sm font-bold text-neutral-400">
            {completedCount} / {lessons.length} lessons completed
          </p>
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
          <p className="text-center text-sm text-neutral-400 mt-6">More lessons coming soon</p>
        </div>
      </main>
    </div>
  );
}
