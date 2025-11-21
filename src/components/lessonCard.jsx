import Link from 'next/link';

const statusStyles = {
  locked: {
    ring: 'ring-gray-300',
    background: 'bg-gray-200',
    icon: 'text-gray-400',
    cursor: 'cursor-not-allowed',
    href: '#',
  },
  unlocked: {
    ring: 'ring-blue-500',
    background: 'bg-blue-500 hover:bg-blue-600',
    icon: 'text-white',
    cursor: 'cursor-pointer',
    pulse: 'animate-pulse',
  },
  completed: {
    ring: 'ring-green-500',
    background: 'bg-green-500 hover:bg-green-600',
    icon: 'text-white',
    cursor: 'cursor-pointer',
  },
};

export default function LessonCard({ lesson }) {
  const { id, title, description, category, status, icon: Icon } = lesson;
  const config = statusStyles[status] || statusStyles.locked;
  const isLocked = status === 'locked';

  const NodeContent = (
    <div className={`relative flex items-center justify-center group ${config.cursor}`}>
      <div className="absolute bottom-full mb-4 w-64 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
        <h3 className="font-bold text-base mb-1">{title}</h3>
        <p className="leading-tight">{description}</p>

        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-8 border-x-transparent border-t-8
         border-t-gray-800"></div>
      </div>

      <div className={`relative w-28 h-28 rounded-full flex items-center justify-center ring-8 ${config.ring} ${config.background} transition-all duration-300 ${config.pulse || ''}`}>
        <Icon className={`${config.icon}`} size={48} />
      </div>
    </div>
  );

  if (isLocked) {
    return <div aria-disabled="true">{NodeContent}</div>;
  }

  return (
    <Link href={`/courses/${category.toLowerCase()}/${id}`}>
      {NodeContent}
    </Link>
  );
}