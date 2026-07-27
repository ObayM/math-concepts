'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const STORAGE_KEY = 'mathly-admin-recent-lessons';
const MAX_TABS = 6;

export default function RecentLessonTabs({ lessonId, title, confirmLeave }) {
  const [recent, setRecent] = useState([]);
  const router = useRouter();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      list = [];
    }
    list = list.filter((l) => l.id !== lessonId);
    list.unshift({ id: lessonId, title });
    list = list.slice(0, MAX_TABS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    setRecent(list);
  }, [lessonId, title]);

  if (recent.length <= 1) return null;

  return (
    <div className="mb-3 flex gap-1 overflow-x-auto border-b border-neutral-200">
      {recent.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => {
            if (l.id === lessonId) return;
            if (confirmLeave && !confirmLeave('Switch lessons and lose them?')) return;
            router.push(`/admin/content/lessons/${l.id}/edit`);
          }}
          className={`shrink-0 border-b-2 px-3 py-1.5 text-xs font-semibold ${
            l.id === lessonId
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          {l.title}
        </button>
      ))}
    </div>
  );
}
