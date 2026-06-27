'use client';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function QuizBlock({ slide, selectedOption, submitted, onSelect }) {
  return (
    <div className="flex flex-col h-full">
      <p className="text-xl text-slate-600 leading-relaxed font-medium mb-6">{slide.content}</p>

      <div className="grid gap-3">
        {slide.quizOptions.map((option, idx) => {
          const isSelected = selectedOption === idx;
          const isCorrect = idx === slide.correctOption;

          let cls =
            'border-2 border-slate-200 bg-white hover:border-primary-300 hover:bg-primary-50';
          if (isSelected && !submitted) cls = 'border-primary-500 bg-primary-50';
          if (submitted) {
            if (isCorrect) cls = 'border-success-500 bg-green-50';
            else if (isSelected) cls = 'border-red-500 bg-red-50';
            else cls = 'border-slate-100 bg-slate-50 opacity-50';
          }

          return (
            <button
              key={idx}
              onClick={() => !submitted && onSelect(idx)}
              className={`p-5 rounded-2xl text-left text-lg font-bold transition-all flex items-center justify-between active:scale-95 ${cls}`}
            >
              <span
                className={
                  submitted && isCorrect
                    ? 'text-green-700'
                    : submitted && isSelected
                      ? 'text-red-700'
                      : 'text-slate-700'
                }
              >
                {option}
              </span>
              {submitted && isCorrect && (
                <CheckCircle2 className="text-success-500 w-6 h-6 shrink-0" />
              )}
              {submitted && isSelected && !isCorrect && (
                <XCircle className="text-red-500 w-6 h-6 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {submitted && slide.explanation && (
        <p className="mt-4 text-sm text-slate-500 bg-slate-50 rounded-xl p-4 leading-relaxed">
          {slide.explanation}
        </p>
      )}
    </div>
  );
}
