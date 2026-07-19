import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlayCircle, ArrowRight, Flame, Lock, CheckCircle } from 'lucide-react';

import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getStreak, getActivityHeatmap } from '@/lib/db/activityService';
import { courseUrlSlug } from '@/lib/db/courseService';
import ActivityGraph from '@/components/dashboard/ActivityGraph';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

function withLessonStatus(lessons, progressByLessonKey) {
  return lessons.map((lesson, index) => {
    const progress = progressByLessonKey.get(lesson.lessonKey);
    const isCompleted = progress?.completed ?? false;
    const isStarted = (progress?.currentStep ?? 0) > 0;

    let status = 'locked';
    if (isCompleted) {
      status = 'completed';
    } else if (index === 0) {
      status = 'unlocked';
    } else if (progressByLessonKey.get(lessons[index - 1].lessonKey)?.completed) {
      status = 'unlocked';
    }
    if (status === 'locked' && isStarted) status = 'unlocked';

    return { id: lesson.lessonKey, title: lesson.title, difficulty: lesson.difficulty, status };
  });
}

const DashboardPage = async () => {
  const user = await requireUser();
  if (!user) redirect('/login');

  const [streak, activityData, courses, progressRows] = await Promise.all([
    getStreak(user.id),
    getActivityHeatmap(user.id),
    prisma.course.findMany({ where: { status: 'published' }, orderBy: { createdAt: 'asc' } }),
    prisma.userLessonProgress.findMany({
      where: { userId: user.id },
      select: {
        completed: true,
        currentStep: true,
        lastPlayedAt: true,
        lesson: { select: { lessonKey: true, courseId: true } },
      },
    }),
  ]);

  const progressByLessonKey = new Map(progressRows.map((p) => [p.lesson.lessonKey, p]));

  const allLessons = await prisma.lesson.findMany({
    where: { courseId: { in: courses.map((c) => c.id) }, status: 'published' },
    orderBy: { sortOrder: 'asc' },
  });
  const lessonsByCourse = new Map();
  for (const lesson of allLessons) {
    const list = lessonsByCourse.get(lesson.courseId) ?? [];
    list.push(lesson);
    lessonsByCourse.set(lesson.courseId, list);
  }

  const coursesWithLessons = courses.map((course) => ({
    ...course,
    lessons: withLessonStatus(lessonsByCourse.get(course.id) ?? [], progressByLessonKey),
  }));

  let currentCourse = coursesWithLessons[0] ?? null;
  if (progressRows.length > 0) {
    const mostRecent = progressRows.reduce((a, b) => (a.lastPlayedAt > b.lastPlayedAt ? a : b));
    const match = coursesWithLessons.find((c) => c.id === mostRecent.lesson.courseId);
    if (match) currentCourse = match;
  }

  const completedInCourse = currentCourse
    ? currentCourse.lessons.filter((l) => l.status === 'completed').length
    : 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const hasActivityToday = activityData.some((a) => a.date === todayStr);

  return (
    <div className="bg-grid-snow min-h-[calc(100vh-var(--nav-h))]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          <WelcomeHeader
            name={user.username}
            streak={streak}
            completed={completedInCourse}
            courseName={currentCourse?.name}
            hasActivityToday={hasActivityToday}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ContinueLearningCard course={currentCourse} completed={completedInCourse} />
              <ActivitySection
                activityData={activityData}
                streak={streak}
                hasActivityToday={hasActivityToday}
              />
            </div>
            <div>
              <UpNextPanel course={currentCourse} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function getSubheadline({ completed, courseName, streak, hasActivityToday }) {
  if (!courseName || completed === 0) {
    return courseName
      ? `Let's start ${courseName} — solve your first problem today.`
      : 'Keep the momentum going.';
  }
  const lessonWord = `${completed} lesson${completed !== 1 ? 's' : ''}`;
  if (hasActivityToday) {
    return `Nice work today — you're ${lessonWord} into ${courseName}.`;
  }
  if (streak > 0) {
    return `You're ${lessonWord} into ${courseName} and only 1 lesson away from a ${streak + 1}-day streak.`;
  }
  return `You're ${lessonWord} into ${courseName}. Solve one to start a streak.`;
}

const WelcomeHeader = ({ name, streak, completed, courseName, hasActivityToday }) => (
  <div className="flex items-start justify-between animate-fade-in-up">
    <div>
      <h1 className="text-3xl font-bold text-neutral-900">Hey, {name ?? 'there'}! 👋</h1>
      <p className="mt-1 text-neutral-500">
        {getSubheadline({ completed, courseName, streak: streak ?? 0, hasActivityToday })}
      </p>
    </div>
    <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-2xl px-4 py-2.5 shrink-0">
      <Flame className="w-5 h-5 text-orange-500" />
      <span className="text-xl font-bold text-neutral-800">{streak ?? 0}</span>
      <span className="text-sm text-neutral-400">day streak</span>
    </div>
  </div>
);

const ContinueLearningCard = ({ course, completed }) => {
  if (!course) return null;

  const total = course.lessons.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const coursePath = courseUrlSlug(course);

  return (
    <Card className="animate-fade-in-up [animation-delay:100ms] opacity-0 p-6">
      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
        Currently Learning
      </p>
      <h2 className="mt-2 text-2xl font-bold text-neutral-900">{course.name}</h2>
      <p className="mt-1 text-sm text-neutral-500">{course.description}</p>

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-neutral-500">
            {completed} of {total} lessons
          </span>
          <span className="font-semibold text-neutral-700">{progress}%</span>
        </div>
        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-success-500 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Button
        as={Link}
        href={`/courses/${coursePath}`}
        variant="primary"
        size="md"
        icon={<PlayCircle size={18} />}
        className="mt-6"
      >
        Continue Learning
      </Button>
    </Card>
  );
};

const ActivitySection = ({ activityData, streak, hasActivityToday }) => (
  <Card className="animate-fade-in-up [animation-delay:200ms] opacity-0 p-6">
    <ActivityGraph
      activityData={activityData}
      streak={streak}
      hasActivityToday={hasActivityToday}
    />
  </Card>
);

const UpNextPanel = ({ course }) => {
  if (!course) return null;
  const coursePath = courseUrlSlug(course);

  return (
    <div className="animate-fade-in-up [animation-delay:150ms] opacity-0">
      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
        Up Next
      </p>
      <div className="flex flex-col gap-2">
        {course.lessons.slice(0, 5).map((lesson) => (
          <LessonRow key={lesson.id} lesson={lesson} coursePath={coursePath} />
        ))}
        {course.lessons.length === 0 && (
          <p className="text-sm text-neutral-400">No lessons in this course yet.</p>
        )}
      </div>
    </div>
  );
};

const LessonRow = ({ lesson, coursePath }) => {
  const isLocked = lesson.status === 'locked';
  const isCompleted = lesson.status === 'completed';

  const content = (
    <Card
      className={[
        'flex items-center gap-3 p-4 transition-colors',
        isLocked
          ? 'opacity-50 cursor-not-allowed'
          : 'group hover:border-primary-200 cursor-pointer',
      ].join(' ')}
    >
      <div className="shrink-0">
        {isCompleted ? (
          <CheckCircle className="w-5 h-5 text-success-500" />
        ) : isLocked ? (
          <Lock className="w-4 h-4 text-neutral-300" />
        ) : (
          <div className="w-4 h-4 rounded-full border-2 border-primary-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-800 truncate">{lesson.title}</p>
        <p className="text-xs text-neutral-400 mt-0.5">{lesson.difficulty}</p>
      </div>
      {!isLocked && (
        <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-primary-500 transition-colors shrink-0" />
      )}
    </Card>
  );

  if (isLocked) return content;
  return <Link href={`/courses/${coursePath}/${lesson.id}`}>{content}</Link>;
};

export default DashboardPage;
