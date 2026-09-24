'use client';
import { CheckCircle2, XCircle, Pencil, RotateCcw } from 'lucide-react';
import RichText from '../RichText';
import { useT } from '@/components/i18n/LocaleProvider';

const PROMPT_KEY_BY_MODE = {
  curve: 'exercise.sketchCurve',
  points: 'exercise.sketchPoints',
  line: 'exercise.sketchLine',
};

export default function SketchExercise({
  slide,
  value,
  checked,
  correct,
  onChange,
  revealAnswer = true,
}) {
  const t = useT();
  const ex = slide.exercise;
  const hasDrawn = Array.isArray(value) && value.length > 0;

  return (
    <div className="flex flex-col">
      <RichText className="text-xl text-neutral-700 leading-[1.75] font-normal max-w-[42rem] mb-6">
        {ex.prompt}
      </RichText>

      {!checked && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-neutral-400 font-medium text-sm">
            <Pencil className="w-4 h-4 shrink-0" />
            {t(PROMPT_KEY_BY_MODE[ex.mode])}
          </div>
          {hasDrawn && (
            <button
              onClick={() => onChange(null)}
              className="tap-target-h flex items-center gap-1 text-xs font-bold text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {t('exercise.clear')}
            </button>
          )}
        </div>
      )}

      {checked &&
        (correct ? (
          <div className="flex items-center gap-2 text-success-600 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" /> {t('exercise.goodMatch')}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-danger-600 font-bold text-sm">
            <XCircle className="w-5 h-5 shrink-0" /> {t('exercise.notQuite')}
          </div>
        ))}

      {checked && revealAnswer && ex.explanation && (
        <RichText className="mt-4 text-sm text-neutral-500 bg-neutral-50 rounded-xl p-4 leading-relaxed block">
          {ex.explanation}
        </RichText>
      )}
    </div>
  );
}
