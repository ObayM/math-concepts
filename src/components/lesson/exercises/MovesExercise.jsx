'use client';
import { useMemo } from 'react';
import { ArrowDown, CheckCircle2 } from 'lucide-react';
import RichText from '../RichText';
import { useT } from '@/components/i18n/LocaleProvider';
import { useMathNotation } from '@/engine/artex/context';
import { hashStr, shuffledOrder } from './shuffle';

export default function MovesExercise({ slide, value, checked, onChange, revealAnswer = true }) {
  const flow = useMathNotation() === 'ar' ? undefined : 'ltr';
  const t = useT();
  const ex = slide.exercise;
  const picks = Array.isArray(value) ? value : ex.steps.map(() => []);
  const at = ex.steps.findIndex((st, i) => picks[i]?.at(-1) !== st.correct);
  const current = at === -1 ? ex.steps.length : at;
  const orders = useMemo(
    () =>
      ex.steps.map((st) =>
        shuffledOrder(
          st.options.length,
          hashStr(st.result + st.options.map((o) => o.text).join('|'))
        )
      ),
    [ex]
  );
  const clean = picks.every((p) => p.length === 1);

  const pick = (i) => {
    if (checked || current >= ex.steps.length) return;
    const next = picks.map((p) => [...p]);
    next[current] = [...(next[current] ?? []), i];
    onChange(next);
  };

  const step = ex.steps[current];
  const lastWrong = step && picks[current]?.length ? step.options[picks[current].at(-1)] : null;

  return (
    <div className="flex flex-col">
      <RichText className="text-xl text-neutral-700 leading-[1.75] font-normal max-w-[42rem] mb-6">
        {ex.prompt}
      </RichText>

      <div className="flex flex-col items-start gap-2" dir={flow}>
        <RichText className="rounded-xl bg-neutral-50 px-4 py-2 text-lg">{ex.start}</RichText>
        {ex.steps.slice(0, current).map((st, i) => (
          <div key={i} className="animate-fade-in-up flex flex-col items-start gap-2">
            <span className="flex items-center gap-2 ps-3 text-sm font-semibold text-success-600">
              <ArrowDown className="h-4 w-4" />
              <RichText>{st.options[st.correct].text}</RichText>
            </span>
            <RichText className="rounded-xl bg-neutral-50 px-4 py-2 text-lg">{st.result}</RichText>
          </div>
        ))}
      </div>

      {step && (
        <div className="mt-5">
          <p className="mb-3 text-sm font-bold uppercase tracking-wider text-neutral-400">
            {t('exercise.nextMove')}
          </p>
          <div className="grid gap-2" role="group" aria-label={t('exercise.movesChoices')}>
            {orders[current].map((i) => {
              const tried = picks[current]?.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => pick(i)}
                  disabled={checked || tried}
                  className={`w-full rounded-2xl border-2 p-4 text-start font-bold transition-all active:scale-95 disabled:cursor-default ${
                    tried
                      ? 'border-danger-500 bg-danger-50 text-danger-600'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-primary-300 hover:bg-primary-50'
                  }`}
                >
                  <RichText>{step.options[i].text}</RichText>
                </button>
              );
            })}
          </div>
          {lastWrong?.why && (
            <RichText className="mt-2 block px-2 text-sm text-danger-600">{lastWrong.why}</RichText>
          )}
        </div>
      )}

      {!step && (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-neutral-600">
          <CheckCircle2 className="h-5 w-5 text-success-500" />
          {clean ? t('exercise.movesClean') : t('exercise.movesMissed')}
        </p>
      )}

      {checked && revealAnswer && ex.explanation && (
        <RichText className="mt-4 text-sm text-neutral-500 bg-neutral-50 rounded-xl p-4 leading-relaxed block">
          {ex.explanation}
        </RichText>
      )}
    </div>
  );
}
