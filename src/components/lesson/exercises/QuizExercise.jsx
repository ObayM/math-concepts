'use client';
import { CheckCircle2, XCircle } from 'lucide-react';
import RichText from '../RichText';

// v2 quiz — reads slide.exercise (prompt, options[{text, why?}], correct, explanation)
export default function QuizExercise({ slide, value, checked, onChange }) {
  const ex = slide.exercise;
  const selected = value;

  return (
    <div className="flex flex-col">
      <RichText className="text-xl text-neutral-600 leading-relaxed font-medium mb-6">
        {ex.prompt}
      </RichText>

      <div className="grid gap-3" role="radiogroup" aria-label="Answer choices">
        {ex.options.map((option, idx) => {
          const isSelected = selected === idx;
          const isCorrect = idx === ex.correct;

          let cls =
            'border-2 border-neutral-200 bg-white hover:border-primary-300 hover:bg-primary-50';
          if (isSelected && !checked) cls = 'border-primary-500 bg-primary-50';
          if (checked) {
            if (isCorrect) cls = 'border-success-500 bg-success-50';
            else if (isSelected) cls = 'border-danger-500 bg-danger-50';
            else cls = 'border-neutral-100 bg-neutral-50 opacity-50';
          }

          return (
            <div key={idx}>
              <button
                role="radio"
                aria-checked={isSelected}
                disabled={checked}
                onClick={() => !checked && onChange(idx)}
                className={`w-full p-5 rounded-2xl text-left text-lg font-bold transition-all flex items-center justify-between active:scale-95 disabled:cursor-default ${cls}`}
              >
                <span
                  className={
                    checked && isCorrect
                      ? 'text-success-600'
                      : checked && isSelected
                        ? 'text-danger-600'
                        : 'text-neutral-700'
                  }
                >
                  <RichText>{option.text}</RichText>
                </span>
                {checked && isCorrect && (
                  <CheckCircle2 className="text-success-500 w-6 h-6 shrink-0" />
                )}
                {checked && isSelected && !isCorrect && (
                  <XCircle className="text-danger-500 w-6 h-6 shrink-0" />
                )}
              </button>
              {/* per-option feedback: show the picked wrong option's `why` */}
              {checked && isSelected && !isCorrect && option.why && (
                <RichText className="mt-2 text-sm text-danger-600 px-2 block">
                  {option.why}
                </RichText>
              )}
            </div>
          );
        })}
      </div>

      {checked && ex.explanation && (
        <RichText className="mt-4 text-sm text-neutral-500 bg-neutral-50 rounded-xl p-4 leading-relaxed block">
          {ex.explanation}
        </RichText>
      )}
    </div>
  );
}
