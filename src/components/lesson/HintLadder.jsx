'use client';
import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import RichText from './RichText';
import { useT } from '@/components/i18n/LocaleProvider';

export default function HintLadder({ hints, disabled = false }) {
  const t = useT();
  const [shown, setShown] = useState(0);
  if (!hints?.length) return null;

  return (
    <div className="flex flex-col items-start gap-2">
      {hints.slice(0, shown).map((hint, i) => (
        <div
          key={i}
          className="animate-fade-in-up flex items-start gap-2 rounded-xl border border-warning-100 bg-warning-50 px-4 py-3 text-sm text-neutral-700"
        >
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning-500" />
          <RichText>{hint}</RichText>
        </div>
      ))}
      {shown < hints.length && !disabled && (
        <button
          onClick={() => setShown((n) => n + 1)}
          className="tap-target-h flex items-center gap-2 text-sm font-bold text-neutral-500 transition-colors hover:text-primary-600"
        >
          <Lightbulb className="h-4 w-4" />
          {shown === 0 ? t('exercise.hint') : t('exercise.anotherHint')}
        </button>
      )}
    </div>
  );
}
