import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import clsx from 'clsx';
import {
  PlayCircle,
  ArrowRight,
  Flame,
  Lock,
  CheckCircle,
  Target,
  Zap,
  Lightbulb,
} from 'lucide-react';

import { requireUser } from '@/lib/session';
import { isAdmin } from '@/lib/authz';
import { prisma } from '@/lib/prisma';
import { getStreak, getActivityHeatmap, getTodayXp } from '@/lib/db/activityService';
import { getUserTimeZone } from '@/lib/db/userService';
import { localDayKey } from '@/lib/timezone';
import { courseUrlSlug } from '@/lib/db/courseService';
import { goalProgress } from '@/lib/xp';
import ActivityGraph from '@/components/dashboard/ActivityGraph';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { firstName } from '@/lib/user-name';
import { getT } from '@/lib/i18n/server';
import BetaBanner from '@/components/i18n/BetaBanner';

const eyebrow = 'text-xs font-bold uppercase tracking-[0.12em] text-neutral-400';

function withLessonStatus(lessons, progressByLessonKey, unlockAll) {
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
    if (status === 'locked' && (isStarted || unlockAll)) status = 'unlocked';

    return {
      id: lesson.lessonKey,
      number: index + 1,
      title: lesson.title,
      description: lesson.description,
      difficulty: lesson.difficulty,
      status,
    };
  });
}

const DashboardPage = async ({ params }) => {
  const { lang } = await params;
  const user = await requireUser();
  if (!user) redirect('/login');

  const timezone = await getUserTimeZone(user.id);

  const [streak, activityData, todayXp, courses, progressRows] = await Promise.all([
    getStreak(user.id, timezone),
    getActivityHeatmap(user.id),
    getTodayXp(user.id, timezone),
    prisma.course.findMany({
      where: { status: 'published', lang },
      orderBy: { sortOrder: 'asc' },
    }),
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
    lessons: withLessonStatus(
      lessonsByCourse.get(course.id) ?? [],
      progressByLessonKey,
      isAdmin(user)
    ),
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
  const nextLesson = currentCourse
    ? (currentCourse.lessons.find((l) => l.status === 'unlocked') ??
      currentCourse.lessons.find((l) => l.status !== 'completed') ??
      currentCourse.lessons[0] ??
      null)
    : null;

  const todayStr = localDayKey(timezone);
  const hasActivityToday = activityData.some((a) => a.date === todayStr);
  const greetingName = firstName(user);
  const t = await getT();

  return (
    <div className="-mt-[var(--nav-h)] min-h-dvh pt-[var(--nav-h)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <header className="animate-fade-in-up">
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-neutral-900">
            {t('dashboard.greeting', { name: greetingName })}
          </h1>
          <p className="mt-2 text-lg text-neutral-500">
            {getSubheadline(t, {
              completed: completedInCourse,
              courseName: currentCourse?.name,
              streak: streak ?? 0,
              hasActivityToday,
            })}
          </p>
        </header>

        <BetaBanner className="mt-8" />

        <HeroContinue
          t={t}
          course={currentCourse}
          nextLesson={nextLesson}
          completed={completedInCourse}
        />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <UpNextPath t={t} course={currentCourse} />
          </div>
          <div>
            <MomentumCard
              t={t}
              streak={streak ?? 0}
              activityData={activityData}
              hasActivityToday={hasActivityToday}
              todayXp={todayXp}
              timezone={timezone}
            />
            <PracticeCard t={t} course={currentCourse} />
            <WarmupCard t={t} />
            <TopicsCard t={t} />
          </div>
        </div>
      </div>
    </div>
  );
};

function difficultyLabel(t, difficulty) {
  const key = `difficulty.${difficulty}`;
  const label = t(key);
  return label === key ? difficulty : label;
}

function getSubheadline(t, { completed, courseName, streak, hasActivityToday }) {
  if (!courseName) return t('dashboard.empty');
  if (completed === 0) return t('dashboard.ready', { course: courseName });

  const progress = t('dashboard.progress', {
    lessons: t('courses.lessonCount', { count: completed }),
    course: courseName,
  });

  if (hasActivityToday) return `${t('dashboard.niceToday')} ${progress}`;
  if (streak > 0) return `${progress} ${t('dashboard.keepAlive')}`;
  return `${progress} ${t('dashboard.startStreak')}`;
}

const HeroContinue = ({ t, course, nextLesson, completed }) => {
  if (!course || !nextLesson) {
    return (
      <Card className="card-soft mt-8 p-8 text-center animate-fade-in-up [animation-delay:80ms] opacity-0">
        <p className="text-neutral-500">{t('dashboard.noLessons')}</p>
      </Card>
    );
  }

  const total = course.lessons.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const coursePath = courseUrlSlug(course);
  const started = completed > 0;

  return (
    <div className="card-hero mt-8 rounded-3xl border border-neutral-200/80 bg-card p-7 animate-fade-in-up [animation-delay:80ms] opacity-0 sm:p-9">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className={eyebrow}>
            {started ? t('dashboard.jumpBackIn') : t('dashboard.startHere')}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-neutral-900 sm:text-4xl">
            {nextLesson.title}
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            {course.name} · {t('dashboard.lessonMeta', { number: nextLesson.number })} ·{' '}
            <span>{difficultyLabel(t, nextLesson.difficulty)}</span>
          </p>
          {nextLesson.description && (
            <p className="mt-4 text-neutral-600 line-clamp-2">{nextLesson.description}</p>
          )}
        </div>
        <div className="w-full shrink-0 sm:w-40 sm:text-end">
          <p className="text-3xl font-extrabold leading-none text-neutral-900">{progress}%</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2.5 text-xs text-neutral-400">
            {t('dashboard.doneOfTotal', { completed, total })}
          </p>
        </div>
      </div>

      <Button
        as={Link}
        href={`/courses/${coursePath}/${nextLesson.id}`}
        variant="primary"
        size="lg"
        icon={<PlayCircle size={20} />}
        className="mt-8"
      >
        {started ? t('dashboard.continue') : t('dashboard.start')}
      </Button>
    </div>
  );
};

const UpNextPath = ({ t, course }) => {
  if (!course) return null;
  const coursePath = courseUrlSlug(course);
  const lessons = course.lessons.slice(0, 5);

  return (
    <section className="animate-fade-in-up [animation-delay:160ms] opacity-0">
      <h3 className={clsx(eyebrow, 'mb-3')}>{t('dashboard.upNextIn', { course: course.name })}</h3>
      {lessons.length > 0 ? (
        <Card className="card-soft divide-y divide-neutral-100 overflow-hidden">
          {lessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} coursePath={coursePath} t={t} />
          ))}
          <Link
            href={`/courses/${coursePath}`}
            className="flex items-center justify-center gap-1.5 px-5 py-3.5 text-sm font-semibold text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-800"
          >
            {t('dashboard.viewAll', { count: course.lessons.length })}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      ) : (
        <Card className="card-soft p-6">
          <p className="text-sm text-neutral-400">{t('dashboard.noLessonsInCourse')}</p>
        </Card>
      )}
    </section>
  );
};

const LessonRow = ({ lesson, coursePath, t }) => {
  const isLocked = lesson.status === 'locked';
  const isCompleted = lesson.status === 'completed';

  const content = (
    <div
      className={clsx(
        'flex items-center gap-4 px-5 py-4 transition-colors',
        isLocked ? 'opacity-55' : 'group hover:bg-neutral-50'
      )}
    >
      <div
        className={clsx(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
          isCompleted
            ? 'bg-success-50 text-success-600'
            : isLocked
              ? 'bg-neutral-100 text-neutral-400'
              : 'bg-primary-500 text-white'
        )}
      >
        {isCompleted ? <CheckCircle className="h-4 w-4" /> : lesson.number}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-neutral-800">{lesson.title}</p>
        <p className="mt-0.5 text-xs text-neutral-400">{difficultyLabel(t, lesson.difficulty)}</p>
      </div>
      {isLocked ? (
        <Lock className="h-4 w-4 shrink-0 text-neutral-300" />
      ) : (
        <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300 transition-all group-hover:translate-x-0.5 group-hover:text-primary-500" />
      )}
    </div>
  );

  if (isLocked) return content;
  return (
    <Link href={`/courses/${coursePath}/${lesson.id}`} className="block">
      {content}
    </Link>
  );
};

const MomentumCard = ({ t, streak, activityData, hasActivityToday, todayXp, timezone }) => {
  const goal = goalProgress(todayXp);
  const caption = goal.met
    ? t('dashboard.goalDone')
    : streak === 0
      ? t('dashboard.startStreak')
      : hasActivityToday
        ? t('dashboard.xpToGo', { xp: goal.remaining })
        : t('dashboard.keepAlive');

  return (
    <section className="animate-fade-in-up [animation-delay:220ms] opacity-0">
      <h3 className={clsx(eyebrow, 'mb-3')}>{t('dashboard.thisWeek')}</h3>
      <Card className="card-soft p-6">
        <div className="flex items-end gap-2">
          <Flame className="mb-1 h-7 w-7 text-orange-500" />
          <span className="text-4xl font-extrabold leading-none text-neutral-900">{streak}</span>
          <span className="mb-0.5 font-semibold text-neutral-400">
            {t('dashboard.dayCount', { count: streak })}
          </span>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-neutral-500">{t('dashboard.today')}</span>
            <span className="text-sm font-bold text-neutral-900">
              {goal.xp}
              <span className="font-semibold text-neutral-400"> / {goal.goal} XP</span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-700',
                goal.met ? 'bg-success-500' : 'bg-primary-500'
              )}
              style={{ width: `${Math.max(goal.pct, goal.xp > 0 ? 4 : 0)}%` }}
            />
          </div>
        </div>

        <div className="mt-7">
          <ActivityGraph
            activityData={activityData}
            streak={streak}
            hasActivityToday={hasActivityToday}
            showCaption={false}
            timezone={timezone}
          />
        </div>
        <p className="mt-6 text-sm text-neutral-500">{caption}</p>
      </Card>
    </section>
  );
};

const WarmupCard = ({ t }) => (
  <Link
    href="/warmup"
    className="group mt-4 block animate-fade-in-up [animation-delay:320ms] opacity-0"
  >
    <Card className="card-soft p-5 transition-colors hover:border-neutral-300">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
          <Zap className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-neutral-800">{t('dashboard.warmup')}</p>
          <p className="text-sm text-neutral-500">{t('dashboard.warmupBlurb')}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300 transition-all group-hover:translate-x-0.5 group-hover:text-neutral-600" />
      </div>
    </Card>
  </Link>
);

const TopicsCard = ({ t }) => (
  <Link
    href="/topics"
    className="group mt-4 block animate-fade-in-up [animation-delay:380ms] opacity-0"
  >
    <Card className="card-soft p-5 transition-colors hover:border-neutral-300">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
          <Lightbulb className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-neutral-800">{t('topics.dashTitle')}</p>
          <p className="text-sm text-neutral-500">{t('topics.dashBody')}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300 transition-all group-hover:translate-x-0.5 group-hover:text-neutral-600" />
      </div>
    </Card>
  </Link>
);

const PracticeCard = ({ t, course }) => {
  if (!course) return null;
  const coursePath = courseUrlSlug(course);

  return (
    <Link
      href={`/courses/${coursePath}/practice`}
      className="group mt-6 block animate-fade-in-up [animation-delay:280ms] opacity-0"
    >
      <Card className="card-soft p-5 transition-colors hover:border-neutral-300">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
            <Target className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-neutral-800">{t('dashboard.practice')}</p>
            <p className="text-sm text-neutral-500">
              {t('dashboard.practiceBlurb', { course: course.name })}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-neutral-300 transition-all group-hover:translate-x-0.5 group-hover:text-neutral-600" />
        </div>
      </Card>
    </Link>
  );
};

export default DashboardPage;
