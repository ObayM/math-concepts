'use client';
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';
import { PlayCircle, ArrowRight, BookOpen, Flame, Trophy } from 'lucide-react';

import { lessonsData } from '@/components/lib/data';
import ActivityGraph from '@/components/dashboard/ActivityGraph';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

const HomePage = () => {
  const { user, profile } = useAuth();

  const [streak, setStreak] = React.useState(null);
  const [activityData, setActivityData] = React.useState([]);

  React.useEffect(() => {
    fetch('/api/streak')
      .then((res) => res.json())
      .then((data) => {
        if (data.streak !== undefined) setStreak(data.streak);
      })
      .catch((err) => console.error('Failed to fetch streak:', err));

    fetch('/api/activity')
      .then((res) => res.json())
      .then((data) => {
        if (data.activity) setActivityData(data.activity);
      })
      .catch((err) => console.error('Failed to fetch activity:', err));
  }, []);

  return (
    <div className="bg-surface min-h-[calc(100vh-var(--nav-h))]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-10">
          <WelcomeHeader name={profile?.username} streak={streak} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <CurrentCourseCard />
              <ActivitySection activityData={activityData} />
            </div>
            <div className="space-y-6">
              <RecommendedLessons lessons={lessonsData.slice(0, 3)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const WelcomeHeader = ({ name, streak }) => (
  <div className="animate-fade-in-up">
    <h1 className="text-4xl font-extrabold text-neutral-900 tracking-tight">
      Hey, <span className="text-primary-600">{name ?? 'there'}</span>! 👋
    </h1>
    <p className="mt-1 text-lg text-neutral-500">Keep the momentum going.</p>

    <div className="mt-6 flex flex-wrap gap-3">
      <Card className="flex items-center gap-3 px-5 py-3">
        <Flame className="w-5 h-5 text-orange-500" />
        <div>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Streak</p>
          <p className="text-lg font-black text-neutral-800">{streak ?? 0} days</p>
        </div>
      </Card>
      <Card className="flex items-center gap-3 px-5 py-3">
        <BookOpen className="w-5 h-5 text-primary-500" />
        <div>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Lessons</p>
          <p className="text-lg font-black text-neutral-800">{lessonsData.length} available</p>
        </div>
      </Card>
      <Card className="flex items-center gap-3 px-5 py-3">
        <Trophy className="w-5 h-5 text-warning-500" />
        <div>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">XP</p>
          <p className="text-lg font-black text-neutral-800">0 pts</p>
        </div>
      </Card>
    </div>
  </div>
);

const CurrentCourseCard = () => (
  <div className="animate-fade-in-up [animation-delay:100ms] opacity-0 bg-primary-600 p-8 text-white rounded-2xl">
    <Badge variant="primary" className="bg-primary-500 text-white border-none mb-3">
      Currently Learning
    </Badge>
    <h2 className="text-3xl font-extrabold">Algebra</h2>
    <p className="mt-1 text-primary-200 text-sm">Real functions, domain, range and beyond.</p>
    <Button
      as={Link}
      href="/courses/algebra"
      variant="secondary"
      size="lg"
      icon={<PlayCircle size={20} />}
      className="mt-8"
    >
      Continue Learning
    </Button>
  </div>
);

const ActivitySection = ({ activityData }) => (
  <Card className="animate-fade-in-up [animation-delay:200ms] opacity-0 p-8">
    <h3 className="text-lg font-bold text-neutral-800 mb-6 flex items-center gap-2">
      <span className="w-2 h-5 bg-success-500 rounded-full" />
      Activity
    </h3>
    <ActivityGraph activityData={activityData} />
  </Card>
);

const RecommendedLessons = ({ lessons }) => (
  <div className="animate-fade-in-up [animation-delay:300ms] opacity-0">
    <h3 className="text-lg font-bold text-neutral-800 mb-4">Up Next</h3>
    <div className="flex flex-col gap-3">
      {lessons.map((lesson) => (
        <LessonItemCard key={lesson.id} lesson={lesson} />
      ))}
    </div>
  </div>
);

const LessonItemCard = ({ lesson }) => {
  const Icon = lesson.icon;
  return (
    <Card
      as={Link}
      href={`/courses/algebra/${lesson.id}`}
      className="group flex items-center gap-4 p-4 transition-colors hover:border-primary-200"
    >
      <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 group-hover:bg-primary-100 transition-colors">
        {Icon && <Icon className="w-5 h-5 text-primary-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-neutral-800 truncate">{lesson.title}</p>
        <Badge variant="neutral" className="mt-1 text-xs">
          {lesson.difficulty}
        </Badge>
      </div>
      <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all shrink-0" />
    </Card>
  );
};

export default HomePage;
