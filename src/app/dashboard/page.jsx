'use client';
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';
import { PlayCircle, ArrowRight } from 'lucide-react';

import { lessonsData } from '@/components/lib/data';
import ActivityGraph from '@/components/dashboard/ActivityGraph';
import Button from '@/components/ui/Button';

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

  const currentCourse = { title: 'Math Basics' };

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-73px)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          <WelcomeHeader name={profile?.username} streak={streak} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <CurrentCourseCard course={currentCourse} />
              <ActivitySection activityData={activityData} />
            </div>
            <div className="space-y-8">
              <RecommendedLessons lessons={lessonsData.slice(0, 3)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const WelcomeHeader = ({ name, streak }) => (
  <div className="animate-fade-in-up flex justify-between items-end">
    <div>
      <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">
        Welcome back, <span className="text-blue-600">{name}!</span>
      </h1>
      <p className="mt-2 text-lg text-gray-500">Ready to continue your space adventures?</p>
    </div>
    {streak !== null && (
      <div className="bg-white px-6 py-3 rounded-2xl border border-gray-200 flex items-center gap-3">
        <span className="text-2xl">🔥</span>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Current Streak
          </p>
          <p className="text-xl font-black text-slate-800">{streak} Days</p>
        </div>
      </div>
    )}
  </div>
);

const CurrentCourseCard = ({ course }) => (
  <div className="animate-fade-in-up [animation-delay:100ms] opacity-0 bg-blue-600 p-8 text-white rounded-2xl">
    <span className="text-sm font-semibold text-blue-200 uppercase tracking-wider">
      Currently Learning
    </span>
    <h2 className="text-4xl font-bold mt-2">{course.title}</h2>
    <Button
      as={Link}
      href="/courses/algebra"
      variant="secondary"
      size="lg"
      icon={<PlayCircle size={22} />}
      className="mt-10 max-w-62"
    >
      Continue Learning
    </Button>
  </div>
);

const ActivitySection = ({ activityData }) => (
  <div className="animate-fade-in-up [animation-delay:200ms] opacity-0 bg-white p-8 rounded-2xl border border-gray-200">
    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
      <span className="w-2 h-6 bg-green-500 rounded-full" />
      Activity Log
    </h3>
    <ActivityGraph activityData={activityData} />
  </div>
);

const RecommendedLessons = ({ lessons }) => (
  <div className="animate-fade-in-up [animation-delay:300ms] opacity-0">
    <h3 className="text-xl font-bold text-gray-800 mb-6">Explore New Lessons</h3>
    <div className="grid grid-cols-1 gap-4">
      {lessons.map((lesson) => (
        <LessonItemCard key={lesson.id} lesson={lesson} />
      ))}
    </div>
  </div>
);

const LessonItemCard = ({ lesson }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-200 cursor-pointer group hover:border-blue-200 transition-colors">
    <div className="flex items-start justify-between">
      <p className="text-xs text-neutral-800 bg-green-100 px-2 py-1 rounded-full">
        {lesson.category}
      </p>
    </div>
    <h4 className="text-lg font-bold text-gray-800 mt-4">{lesson.title}</h4>
    <Link
      href={`/courses/algebra/${lesson.id}`}
      className="mt-6 flex items-center justify-between text-blue-600 font-semibold"
    >
      <span>Start Lesson</span>
      <ArrowRight className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4" />
    </Link>
  </div>
);

export default HomePage;
