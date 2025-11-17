'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthProvider';

import { 
  FiPlayCircle, 
  FiArrowRight,
} from 'react-icons/fi';

import { lessonsData } from '@/components/lib/data';


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
  const {user, profile} = useAuth()

  const currentCourse = {
    title: "Math Basics",
  };

  return (
    <div className="bg-slate-100 min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div 
          className="space-y-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
        <WelcomeHeader name={profile?.username} />
          <CurrentCourseCard course={currentCourse} />
        <RecommendedLessons lessons={lessonsData.slice(-3)} />
        </motion.div>
      </div>
    </div>
  );
};


const WelcomeHeader = ({ name }) => (
  <motion.div variants={itemVariants}>
    <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">
      Welcome back, <span className="bg-clip-text text-transparent bg-linear-to-r from-blue-600 to-sky-600">{name}!</span>
    </h1>
    <p className="mt-2 text-lg text-gray-500">Ready to continue your learning journey?</p>
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


      <button className="mt-10 flex items-center space-x-3 bg-white text-blue-700 font-bold px-8 py-3 rounded-xl shadow-lg
       hover:bg-slate-100 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300">
        <FiPlayCircle size={22} />
        <span>Continue Learning</span>
      </button>
    </div>
    

  </motion.div>
);


const RecommendedLessons = ({ lessons }) => (
  <motion.div variants={itemVariants}>
    <h3 className="text-2xl font-bold text-gray-800 mb-6">Explore New lessons</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        
        <p className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{lesson.category}</p>
    </div>
    <h4 className="text-lg font-bold text-gray-800 mt-4">{lesson.title}</h4>
    <div className="mt-6 flex items-center justify-between text-blue-600 font-semibold">
      <span>Start Lesson</span>
      <FiArrowRight className="opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
    </div>
  </motion.div>
);

export default HomePage;