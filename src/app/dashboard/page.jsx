'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';
import { 
  FiPlayCircle, 
  FiArrowRight,
} from 'react-icons/fi';

import { lessonsData } from '@/components/lib/data';
import ActivityGraph from '@/components/dashboard/ActivityGraph';



const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};



const HomePage = () => {
  const { user, profile } = useAuth()

  const [streak, setStreak] = React.useState(null);
  const [activityData, setActivityData] = React.useState([]);

  React.useEffect(() => {

    fetch('/api/streak')
      .then(res => res.json())
      .then(data => {
        if (data.streak !== undefined) setStreak(data.streak);
      })
      .catch(err => console.error('Failed to fetch streak:', err));


      fetch('/api/activity')
      .then(res => res.json())
      .then(data => {
        if (data.activity) setActivityData(data.activity);
      })
      .catch(err => console.error('Failed to fetch activity:', err));
  }, []);

  const currentCourse = {
    title: "Math Basics",
  };

  return (
    <div className="bg-linear-to-b from-sky-50 via-blue-100 to-amber-50 min-h-[calc(100vh-73px)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          className="space-y-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
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
        </motion.div>
      </div>
    </div>
  );
};


const WelcomeHeader = ({ name, streak }) => (
  <motion.div variants={itemVariants} className="flex justify-between items-end">
    <div>
      <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">
        Welcome back, <span className="bg-clip-text text-transparent bg-linear-to-r from-blue-600 to-sky-600">{name}!</span>
      </h1>
      <p className="mt-2 text-lg text-gray-500">Ready to continue your space adventures ?</p>
    </div>
    {streak !== null && (
      <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
        <span className="text-2xl">🔥</span>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Streak</p>
          <p className="text-xl font-black text-slate-800">{streak} Days</p>
        </div>
      </div>
    )}
  </motion.div>
);

const CurrentCourseCard = ({ course }) => (
  <motion.div
    variants={itemVariants}
    className="relative bg-linear-to-br from-blue-600 to-sky-700 p-8 text-white overflow-hidden"
  >
    <div className="relative z-10">
      <span className="text-sm font-semibold text-blue-200 uppercase tracking-wider">Currently Learning</span>
      <h2 className="text-4xl font-bold mt-2">{course.title}</h2>


      <Link href={'/courses/algebra'} className="mt-10 max-w-62 flex items-center space-x-3 bg-white text-blue-700 font-bold px-8 py-3 rounded-xl shadow-lg
       hover:bg-slate-100 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300">
        <FiPlayCircle size={22} />
        <span>Continue Learning</span>
      </Link>
    </div>


  </motion.div>
);


const ActivitySection = ({ activityData }) => (
  <motion.div variants={itemVariants} className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
      <span className="w-2 h-6 bg-green-500 rounded-full" />
      Activity Log
    </h3>
    <ActivityGraph activityData={activityData} />
  </motion.div>
);

const RecommendedLessons = ({ lessons }) => (
  <motion.div variants={itemVariants}>
    <h3 className="text-xl font-bold text-gray-800 mb-6">Explore New lessons</h3>
    <div className="grid grid-cols-1 gap-4">
      {lessons.map(lesson => (
        <LessonItemCard key={lesson.id} lesson={lesson} />
      ))}
    </div>
  </motion.div>
);

const LessonItemCard = ({ lesson }) => (
  <motion.div
    className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group"
    whileHover={{ scale: 1.03 }}
    transition={{ type: "spring", stiffness: 300 }}
  >
    <div className="flex items-start justify-between">

      <p className="text-xs text-neutral-800 bg-green-100 px-2 py-1 rounded-full">{lesson.category}</p>
    </div>
    <h4 className="text-lg font-bold text-gray-800 mt-4">{lesson.title}</h4>
    <Link href={`/courses/algebra/${lesson.id}`} className="mt-6 flex items-center justify-between text-blue-600 font-semibold">
      <span>Start Lesson</span>
      <FiArrowRight className="opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
    </Link>
  </motion.div>
);

export default HomePage;