'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Check, Lock, Play, ChevronRight } from 'lucide-react';
import { iconMap } from './lib/IconMap';

const statusConfig = {
  locked: {
    icon: Lock,
    color: 'text-gray-400',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    cursor: 'cursor-not-allowed',
    label: 'Locked',
  },
  unlocked: {
    icon: Play,
    color: 'text-blue-600',
    bg: 'bg-white',
    border: 'border-blue-200',
    cursor: 'cursor-pointer',
    label: 'Start Lesson',
  },
  completed: {
    icon: Check,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    cursor: 'cursor-pointer',
    label: 'Completed',
  },
};

export default function LessonCard({ lesson, index }) {
  const { id, title, description, category, status, icon_name } = lesson;
  const Icon = iconMap[icon_name] || iconMap['FunctionSquare'];

  const config = statusConfig[status] || statusConfig.locked;
  const isLocked = status === 'locked';
  const isEven = index % 2 === 0;


  const cardVariants = {
    hidden: { opacity: 0, x: isEven ? -50 : 50, y: 20 },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.5, delay: index * 0.1 }
    }
  };

  const nodeVariants = {
    hidden: { scale: 0 },
    visible: {
      scale: 1,
      transition: { type: "spring", stiffness: 260, damping: 20, delay: index * 0.1 + 0.2 }
    }
  };

  const Content = (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className={`relative flex items-center w-full ${isEven ? 'flex-row' : 'flex-row-reverse'}`}
    >

      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center z-10">
        <motion.div
          variants={nodeVariants}
          className={`w-12 h-12 rounded-full flex items-center justify-center border-4 ${status === 'unlocked' ? 'border-blue-500 bg-white' :
              status === 'completed' ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 bg-gray-100'
            } shadow-lg transition-colors duration-300`}
        >
          {status === 'completed' ? (
            <Check size={20} className="text-white" />
          ) : status === 'unlocked' ? (
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
          ) : (
            <Lock size={18} className="text-gray-400" />
          )}
        </motion.div>
      </div>


      <div className="w-1/2" />


      <div className={`w-1/2 ${isEven ? 'pr-12 text-right' : 'pl-12 text-left'}`}>
        <div
          className={`group relative p-6  border ${config.border} ${config.bg} 
            transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
            ${!isLocked && 'hover:border-blue-300'}
          `}
        >

          <div className={`absolute top-4 ${isEven ? 'left-4' : 'right-4'} opacity-5`}>
            <Icon size={80} />
          </div>

          <div className="relative z-10">
            <div className={`flex items-center gap-2 mb-2 ${isEven ? 'justify-end' : 'justify-start'}`}>
              <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider
                ${status === 'unlocked' ? 'bg-blue-100 text-blue-700' :
                  status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}
              `}>
                {config.label}
              </span>
            </div>

            <h3 className={`text-xl font-bold mb-2 text-gray-900 group-hover:text-blue-700 transition-colors`}>
              {title}
            </h3>

            <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2">
              {description}
            </p>

            {!isLocked && (
              <div className={`flex items-center gap-2 text-sm font-medium text-blue-600 
                ${isEven ? 'justify-end' : 'justify-start'} group-hover:gap-3 transition-all`}
              >
                Start Lesson <ChevronRight size={16} />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (isLocked) {
    return Content;
  }

  return (
    <Link href={`/courses/${category.toLowerCase()}/${id}`} className="block w-full">
      {Content}
    </Link>
  );
}