'use client';
import { CheckCircle2, XCircle } from 'lucide-react';
import RichText from '../RichText';
import { useT } from '@/components/i18n/LocaleProvider';

export default function NumericExercise({
  slide,
  value,
  checked,
  correct,
  onChange,
  revealAnswer = true,
}) {
  const t = useT();
  const ex = slide.exercise;
  const text = typeof value === 'string' ? value : '';

  let cls = 'border-neutral-200 focus:border-primary-400';
  if (checked)
    cls = correct ? 'border-success-500 bg-success-50' : 'border-danger-500 bg-danger-50';

  return (
    <div className="flex flex-col">
      <RichText className="text-xl text-neutral-700 leading-[1.75] font-normal max-w-[42rem] mb-6">
        {ex.prompt}
      </RichText>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            inputMode="decimal"
            dir="ltr"
            value={text}
            disabled={checked}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t('exercise.yourAnswer')}
            aria-label={t('exercise.yourAnswer')}
            className={`w-full p-4 rounded-2xl border-2 text-lg font-bold text-neutral-800 outline-none transition-all ${cls}`}
          />
          {ex.unit && (
            <span className="absolute end-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold pointer-events-none">
              {ex.unit}
            </span>
          )}
        </div>
        {checked &&
          (correct ? (
            <CheckCircle2 className="text-success-500 w-7 h-7 shrink-0" />
          ) : (
            <XCircle className="text-danger-500 w-7 h-7 shrink-0" />
          ))}
      </div>

      {checked && !correct && (
        <p className="mt-2 text-sm text-danger-600 font-medium">
          {revealAnswer ? (
            <>
              {t('exercise.answerIs')}{' '}
              <span dir="ltr">
                {ex.answers[0]}
                {ex.unit ? ` ${ex.unit}` : ''}
              </span>
              .
            </>
          ) : (
            t('exercise.notQuite')
          )}
        </p>
      )}

      {checked && (correct || revealAnswer) && ex.explanation && (
        <RichText className="mt-4 text-sm text-neutral-500 bg-neutral-50 rounded-xl p-4 leading-relaxed block">
          {ex.explanation}
        </RichText>
      )}
    </div>
  );
}
