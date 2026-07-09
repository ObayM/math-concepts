'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function LessonSwitcher({ currentLessonId }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [lessons, setLessons] = useState(null);
  const inputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
    if (lessons === null) {
      fetch('/api/admin/content/lessons')
        .then((r) => r.json())
        .then((body) => setLessons(body.lessons ?? []))
        .catch(() => setLessons([]));
    }
  }, [open, lessons]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const filtered = (lessons ?? []).filter((l) => {
    if (!q) return true;
    return (
      l.title.toLowerCase().includes(q) ||
      l.lessonKey.toLowerCase().includes(q) ||
      (l.courseName ?? '').toLowerCase().includes(q)
    );
  });

  function go(lesson) {
    setOpen(false);
    if (lesson.id !== currentLessonId) router.push(`/admin/content/lessons/${lesson.id}/edit`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg border border-neutral-300 bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Jump to lesson..."
          className="w-full border-b border-neutral-200 px-3 py-2 text-sm focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && filtered[0]) go(filtered[0]);
          }}
        />
        <ul className="max-h-80 overflow-auto">
          {lessons === null && <li className="p-3 text-sm text-neutral-400">Loading...</li>}
          {lessons !== null && filtered.length === 0 && (
            <li className="p-3 text-sm text-neutral-400">No lessons found.</li>
          )}
          {filtered.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => go(l)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-primary-50 ${
                  l.id === currentLessonId ? 'bg-primary-50' : ''
                }`}
              >
                <span className="font-semibold text-neutral-800">{l.title}</span>
                <span className="text-xs text-neutral-400">{l.courseName}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
