'use client';
import { RotateCcw } from 'lucide-react';
import RichText from '../RichText';

export default function OrderExercise({ slide, value = [], checked, onChange }) {
  const ex = slide.exercise;
  const placed = Array.isArray(value) ? value : [];
  const bank = [...ex.items, ...(ex.decoys ?? [])];

  const place = (idx) => {
    if (placed.length >= ex.items.length || placed.includes(idx)) return;
    onChange([...placed, idx]);
  };
  const removeAt = (i) => onChange(placed.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col items-center gap-6">
      {ex.prompt && (
        <RichText className="text-xl text-neutral-700 leading-[1.75] font-normal max-w-[42rem] mx-auto text-center block">
          {ex.prompt}
        </RichText>
      )}

      <div className="flex flex-col gap-2 w-full max-w-md">
        {Array.from({ length: ex.items.length }).map((_, i) => {
          const idx = placed[i];
          const filled = idx != null;
          const isCorrect = filled && bank[idx] === ex.items[i];
          let cls = 'border-dashed border-neutral-300';
          if (filled) cls = 'border-primary-300 bg-white';
          if (checked && filled) {
            cls = isCorrect ? 'border-success-500 bg-success-50' : 'border-danger-500 bg-danger-50';
          }
          return (
            <button
              key={i}
              onClick={() => filled && removeAt(i)}
              disabled={checked || !filled}
              aria-label={
                filled ? `position ${i + 1}, filled, tap to remove` : `position ${i + 1}, empty`
              }
              className={`w-full min-h-12 px-4 py-2 rounded-xl border-2 flex items-center gap-3 text-left font-bold text-neutral-700 transition-all disabled:cursor-default ${cls}`}
            >
              <span className="text-neutral-400 text-sm shrink-0">{i + 1}.</span>
              {filled && <RichText>{bank[idx]}</RichText>}
            </button>
          );
        })}
      </div>
      <div
        className="flex flex-wrap justify-center gap-2"
        role="group"
        aria-label="Available items"
      >
        {bank.map((label, idx) => {
          const disabled = placed.length >= ex.items.length || placed.includes(idx);
          return (
            <button
              key={idx}
              onClick={() => place(idx)}
              disabled={disabled}
              className="px-4 h-12 rounded-xl border-2 border-neutral-300 bg-white text-neutral-800 font-bold transition-all active:scale-90 hover:border-primary-400 disabled:opacity-30"
            >
              <RichText>{label}</RichText>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onChange([])}
        className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-neutral-700 transition-colors"
      >
        <RotateCcw className="w-4 h-4" /> Start over
      </button>

      {checked && ex.explanation && (
        <RichText className="block text-sm text-neutral-500 bg-neutral-50 rounded-xl p-4 leading-relaxed max-w-md text-center">
          {ex.explanation}
        </RichText>
      )}
    </div>
  );
}
