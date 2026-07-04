'use client';
import { CheckCircle2, XCircle, Pencil, RotateCcw } from 'lucide-react';
import RichText from '../RichText';

const PROMPT_BY_MODE = {
  curve: 'Draw on the scene above.',
  points: 'Tap the scene above to place points.',
  line: 'Drag on the scene above to draw a line.',
};

export default function SketchExercise({ slide, value, checked, correct, onChange }) {
  const ex = slide.exercise;
  const hasDrawn = Array.isArray(value) && value.length > 0;

  return (
    <div className="flex flex-col">
      <RichText className="text-xl text-neutral-600 leading-relaxed font-medium mb-4">
        {ex.prompt}
      </RichText>

      {!checked && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-neutral-400 font-medium text-sm">
            <Pencil className="w-4 h-4 shrink-0" />
            {PROMPT_BY_MODE[ex.mode]}
          </div>
          {hasDrawn && (
            <button
              onClick={() => onChange(null)}
              className="flex items-center gap-1 text-xs font-bold text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      )}

      {checked &&
        (correct ? (
          <div className="flex items-center gap-2 text-success-600 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" /> Nice — good match.
          </div>
        ) : (
          <div className="flex items-center gap-2 text-danger-600 font-bold text-sm">
            <XCircle className="w-5 h-5 shrink-0" /> Not quite — take another look.
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
