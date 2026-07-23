'use client';
import { CheckCircle2, Circle } from 'lucide-react';
import RichText from './RichText';

export default function GoalBanner({ goals, goalsMet }) {
  if (!goals || goals.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {goals.map((goal, i) => {
        const met = !!goalsMet?.[i];
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
              {!met && goal.hint && (
                <RichText className="block text-sm text-neutral-500 mt-1.5">{goal.hint}</RichText>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
