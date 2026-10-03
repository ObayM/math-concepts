'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

import DrawPad from './DrawPad';
import NotesPad from './NotesPad';
import { useT } from '@/components/i18n/LocaleProvider';

const TAB_KEY = 'mathly-scratchpad-tab';

export default function Scratchpad({
  slideId,
  notes,
  strokes,
  onNotesChange,
  onStrokesChange,
  onClose,
}) {
  const t = useT();
  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem(TAB_KEY) === 'notes' ? 'notes' : 'draw';
    } catch {
      return 'draw';
    }
  });

  const pickTab = (next) => {
    setTab(next);
    try {
      localStorage.setItem(TAB_KEY, next);
    } catch {}
  };

  const tabButton = (id, label) => (
    <button
      onClick={() => pickTab(id)}
      aria-pressed={tab === id}
      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
        tab === id
          ? 'bg-card text-neutral-800 shadow-sm'
          : 'text-neutral-500 hover:text-neutral-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <aside
      aria-label={t('lesson.scratchpad')}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      className="flex w-[21rem] min-h-[32rem] shrink-0 flex-col border-s border-neutral-200 bg-neutral-50/60 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1 rounded-xl bg-neutral-200/60 p-1">
          {tabButton('draw', 'Draw')}
          {tabButton('notes', 'Notes')}
        </div>
        <button
          onClick={onClose}
          aria-label={t('lesson.closeScratchpad')}
          title={t('lesson.closeScratchpad')}
          className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-200/60 hover:text-neutral-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {tab === 'draw' ? (
        <DrawPad key={slideId} strokes={strokes} onChange={onStrokesChange} />
      ) : (
        <NotesPad key={slideId} value={notes} onChange={onNotesChange} />
      )}
    </aside>
  );
}
