'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Lightbulb, Play } from 'lucide-react';
import RichText from './RichText';
import { useT } from '@/components/i18n/LocaleProvider';

export const GOAL_STUCK_MS = 20_000;

const hintsOf = (goal) => goal.hints ?? (goal.hint ? [goal.hint] : []);

export default function GoalBanner({
  goals,
  goalsMet,
  onShowMe = () => {},
  stuckAfterMs = GOAL_STUCK_MS,
}) {
  const t = useT();
  const [stuck, setStuck] = useState(false);
  const [shown, setShown] = useState(() => (goals ?? []).map(() => 1));
  const [helped, setHelped] = useState(() => (goals ?? []).map(() => false));

  useEffect(() => {
    const id = setTimeout(() => setStuck(true), stuckAfterMs);
    return () => clearTimeout(id);
  }, [stuckAfterMs]);

  if (!goals || goals.length === 0) return null;

  const more = (i) => setShown((s) => s.map((n, j) => (j === i ? n + 1 : n)));
  const showMe = (i) => {
    setHelped((h) => h.map((v, j) => v || j === i));
    onShowMe(i);
  };

  return (
    <div className="flex flex-col gap-3">
      {goals.map((goal, i) => {
        const met = !!goalsMet?.[i];
        const hints = hintsOf(goal);
        const visible = hints.slice(0, shown[i]);
        const canShowMe = goal.showme && !helped[i] && shown[i] >= hints.length;
        return (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-2xl border px-5 py-4 transition-colors ${
              met ? 'border-success-500 bg-success-50' : 'border-neutral-200 bg-neutral-50'
            }`}
          >
            {met ? (
              <CheckCircle2 className="animate-pop-in w-5 h-5 text-success-500 shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-5 h-5 text-neutral-300 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <RichText
                className={`font-semibold text-base ${met ? 'text-success-700' : 'text-neutral-800'}`}
              >
                {goal.prompt}
              </RichText>
              {met && helped[i] && (
                <p className="mt-1 text-xs font-bold text-success-600">{t('goal.helped')}</p>
              )}
              {!met && stuck && (
                <div className="animate-fade-in-up mt-1.5 flex flex-col items-start gap-1.5">
                  {visible.map((hint, h) => (
                    <RichText key={h} className="block text-sm text-neutral-500">
                      {hint}
                    </RichText>
                  ))}
                  <div className="flex flex-wrap gap-4">
                    {shown[i] < hints.length && (
                      <button
                        onClick={() => more(i)}
                        className="tap-target-h flex items-center gap-1.5 text-sm font-bold text-neutral-500 hover:text-primary-600"
                      >
                        <Lightbulb className="h-4 w-4" />
                        {t('exercise.anotherHint')}
                      </button>
                    )}
                    {canShowMe && (
                      <button
                        onClick={() => showMe(i)}
                        className="tap-target-h flex items-center gap-1.5 text-sm font-bold text-primary-600 hover:text-primary-700"
                      >
                        <Play className="h-4 w-4" />
                        {t('goal.showMe')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
