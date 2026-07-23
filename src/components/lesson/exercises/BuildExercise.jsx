'use client';
import { RotateCcw } from 'lucide-react';
import RichText from '../RichText';

// v2 build — reads slide.exercise (prompt, bank[{id,label,kind}], slots, reusable, answers, explanation)
export default function BuildExercise({ slide, value = [], checked, correct, onChange }) {
  const ex = slide.exercise;
  // value can briefly be a non-array (null / prior slide's answer) during slide swaps
  const placed = Array.isArray(value) ? value : [];
  const labelOf = (id) => ex.bank.find((t) => t.id === id)?.label ?? id;
  const usedCount = (id) => placed.filter((p) => p === id).length;

  const place = (id) => {
    if (placed.length >= ex.slots) return;
    if (!ex.reusable && usedCount(id) > 0) return;
    onChange([...placed, id]);
  };
  const removeAt = (i) => onChange(placed.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col items-center gap-6">
      {ex.prompt && (
        <RichText className="text-xl text-neutral-700 leading-[1.75] font-normal max-w-[42rem] mx-auto text-center block">
          {ex.prompt}
        </RichText>
      )}

      {/* answer slots */}
      <div className="flex flex-wrap justify-center gap-2 bg-neutral-50 border border-neutral-200 rounded-2xl p-4 min-w-[200px]">
        {Array.from({ length: ex.slots }).map((_, i) => {
          const id = placed[i];
          const filled = id != null;
          let cls = 'border-dashed border-neutral-300';
          if (filled) cls = 'border-primary-300 bg-white';
          if (checked && filled)
            cls = correct ? 'border-success-500 bg-success-50' : 'border-danger-500 bg-danger-50';
          return (
            <button
              key={i}
              onClick={() => filled && removeAt(i)}
              className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-lg font-bold text-neutral-700 transition-all ${cls}`}
            >
              {filled ? labelOf(id) : ''}
            </button>
          );
        })}
      </div>

      {/* token bank */}
      <div className="flex flex-wrap justify-center gap-2">
        {ex.bank.map((tok) => {
          const isOp = tok.kind === 'operator';
          const disabled = placed.length >= ex.slots || (!ex.reusable && usedCount(tok.id) > 0);
          return (
            <button
              key={tok.id}
              onClick={() => place(tok.id)}
              disabled={disabled}
              className={`flex items-center justify-center text-lg font-bold transition-all active:scale-90 disabled:opacity-30 ${
                isOp
                  ? 'w-12 h-12 rounded-full border-2 border-neutral-300 text-neutral-600 hover:border-primary-400'
                  : 'min-w-12 h-12 px-3 rounded-xl border-2 border-neutral-300 bg-white text-neutral-800 hover:border-primary-400'
              }`}
            >
              {tok.label}
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
