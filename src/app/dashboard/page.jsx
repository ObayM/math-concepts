'use client';
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';
import { PlayCircle, ArrowRight, Flame, Lock, CheckCircle } from 'lucide-react';

import { lessonsData } from '@/components/lib/data';
import ActivityGraph from '@/components/dashboard/ActivityGraph';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const DashboardPage = () => {
  const { profile } = useAuth();
  const [streak, setStreak] = React.useState(null);
  const [activityData, setActivityData] = React.useState([]);

  React.useEffect(() => {
    fetch('/api/streak')
      .then((res) => res.json())
      .then((data) => {
        if (data.streak !== undefined) setStreak(data.streak);
      })
      .catch(console.error);

    fetch('/api/activity')
      .then((res) => res.json())
      .then((data) => {
        if (data.activity) setActivityData(data.activity);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="bg-surface min-h-[calc(100vh-var(--nav-h))]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          <WelcomeHeader name={profile?.username} streak={streak} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ContinueLearningCard />
              <ActivitySection activityData={activityData} />
            </div>
            <div>
              <UpNextPanel lessons={lessonsData.slice(0, 5)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const WelcomeHeader = ({ name, streak }) => (
  <div className="flex items-start justify-between animate-fade-in-up">
    <div>
      <h1 className="text-3xl font-bold text-neutral-900">Hey, {name ?? 'there'}! 👋</h1>
      <p className="mt-1 text-neutral-500">Keep the momentum going.</p>
    </div>
    <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-2xl px-4 py-2.5 shrink-0">
      <Flame className="w-5 h-5 text-orange-500" />
      <span className="text-xl font-bold text-neutral-800">{streak ?? 0}</span>
      <span className="text-sm text-neutral-400">day streak</span>
    </div>
  </div>
);

const ContinueLearningCard = () => {
  const algebraLessons = lessonsData.filter((l) => l.category === 'Algebra');
  const completed = algebraLessons.filter((l) => l.status === 'completed').length;
  const total = algebraLessons.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  // Flagging that this card is still static, we need to change this later
  return (
    <Card className="animate-fade-in-up [animation-delay:100ms] opacity-0 p-6">
      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
        Currently Learning
      </p>
      <h2 className="mt-2 text-2xl font-bold text-neutral-900">Algebra</h2>
      <p className="mt-1 text-sm text-neutral-500">Real functions, domain, range and beyond.</p>

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
        href="/courses/algebra"
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

const ActivitySection = ({ activityData }) => (
  <Card className="animate-fade-in-up [animation-delay:200ms] opacity-0 p-6">
    <ActivityGraph activityData={activityData} />
  </Card>
);

const UpNextPanel = ({ lessons }) => (
  <div className="animate-fade-in-up [animation-delay:150ms] opacity-0">
    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Up Next</p>
    <div className="flex flex-col gap-2">
      {lessons.map((lesson) => (
        <LessonRow key={lesson.id} lesson={lesson} />
      ))}
    </div>
  </div>
);

const LessonRow = ({ lesson }) => {
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
  return <Link href={`/courses/algebra/${lesson.id}`}>{content}</Link>;
};

export default DashboardPage;
