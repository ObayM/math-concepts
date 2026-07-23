'use client';
import { CheckCircle2, XCircle, Crosshair } from 'lucide-react';
import RichText from '../RichText';

export default function HotspotExercise({ slide, value, checked, correct }) {
  const ex = slide.exercise;
  const tapped = Array.isArray(value);

  return (
    <div className="flex flex-col">
      <RichText className="text-xl text-neutral-700 leading-[1.75] font-normal max-w-[42rem] mb-6">
        {ex.prompt}
      </RichText>

      {!checked && (
        <div className="flex items-center gap-2 text-neutral-400 font-medium text-sm">
          <Crosshair className="w-4 h-4 shrink-0" />
          {tapped ? "Tapped — hit Check when you're ready." : 'Tap the scene above to answer.'}
        </div>
      )}

      {checked &&
        (correct ? (
          <div className="flex items-center gap-2 text-success-600 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" /> Right on target.
          </div>
        ) : (
          <div className="flex items-center gap-2 text-danger-600 font-bold text-sm">
            <XCircle className="w-5 h-5 shrink-0" />
            {ex.miss || 'Not quite — take another look.'}
          </div>
        ))}

      {checked && ex.explanation && (
        <RichText className="mt-4 text-sm text-neutral-500 bg-neutral-50 rounded-xl p-4 leading-relaxed block">
          {ex.explanation}
        </RichText>
      )}
    </div>
  );
}
