'use client';
import Link from 'next/link';
import { Check, Lock, ChevronRight } from 'lucide-react';
import { iconMap } from './lib/IconMap';
import Badge from '@/components/ui/Badge';

const statusConfig = {
  locked: {
    nodeBg: 'bg-neutral-100',
    nodeBorder: 'border-neutral-300',
    nodeIcon: <Lock size={16} className="text-neutral-400" />,
    badgeVariant: 'neutral',
    label: 'Locked',
    dim: true,
  },
  unlocked: {
    nodeBg: 'bg-primary-600',
    nodeBorder: 'border-primary-700',
    nodeIcon: <span className="w-3 h-3 rounded-full bg-white" />,
    badgeVariant: 'primary',
    label: 'Up Next',
    dim: false,
  },
  completed: {
    nodeBg: 'bg-success-500',
    nodeBorder: 'border-success-600',
    nodeIcon: <Check size={16} className="text-white" strokeWidth={3} />,
    badgeVariant: 'success',
    label: 'Completed',
    dim: false,
  },
};

export default function LessonCard({ lesson, index, isLast = false }) {
  const { id, title, description, category, difficulty, status, icon_name } = lesson;
  const Icon = iconMap[icon_name] || iconMap['FunctionSquare'];
  const config = statusConfig[status] || statusConfig.locked;
  const isLocked = status === 'locked';

  const inner = (
    <div
      className={`animate-fade-in-up opacity-0 flex items-stretch gap-0 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer group'}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* left: connector + node */}
      <div className="flex flex-col items-center w-12 shrink-0">
        <div
          className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center shrink-0 ${config.nodeBg} ${config.nodeBorder}`}
        >
          {config.nodeIcon}
        </div>
        {!isLast && <div className="w-0.5 flex-1 mt-1 bg-neutral-200" />}
      </div>

      {/* right: lesson card */}
      <div
        className={`flex-1 mb-3 ml-3 border rounded-lg p-4 transition-colors ${
          isLocked
            ? 'border-neutral-200 bg-white opacity-60'
            : 'border-neutral-200 bg-white group-hover:border-primary-300 group-hover:bg-primary-50'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${isLocked ? 'bg-neutral-100' : 'bg-primary-50'}`}
            >
              <Icon size={16} className={isLocked ? 'text-neutral-400' : 'text-primary-600'} />
            </div>
            <div className="min-w-0">
              <p
                className={`font-bold text-sm leading-tight ${isLocked ? 'text-neutral-500' : 'text-neutral-900 group-hover:text-primary-700 transition-colors'}`}
              >
                {title}
              </p>
              <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={config.badgeVariant} className="text-xs whitespace-nowrap">
              {config.label}
            </Badge>
            {!isLocked && (
              <ChevronRight
                size={16}
                className="text-neutral-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all"
              />
            )}
          </div>
        </div>

        {difficulty && (
          <p className="text-xs text-neutral-400 font-medium mt-2 ml-11">{difficulty}</p>
        )}
      </div>
    </div>
  );

  if (isLocked) return inner;

  return (
    <Link href={`/courses/${category.toLowerCase()}/${id}`} className="block">
      {inner}
    </Link>
  );
}
