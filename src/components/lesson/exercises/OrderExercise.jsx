'use client';
import { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import RichText from '../RichText';
import { useTokenDrag, DragGhost } from './dnd';
import { useT } from '@/components/i18n/LocaleProvider';
import { hashStr, shuffledOrder } from './shuffle';

export default function OrderExercise({
  slide,
  value = [],
  checked,
  onChange,
  revealAnswer = true,
}) {
  const t = useT();
  const ex = slide.exercise;
  const placed = Array.isArray(value) ? value : [];
  const bank = [...ex.items, ...(ex.decoys ?? [])];
  const tray = useMemo(
    () => shuffledOrder(ex.items.length + (ex.decoys?.length ?? 0), hashStr(ex.items.join('|'))),
    [ex]
  );

  const place = (idx) => {
    if (placed.length >= ex.items.length || placed.includes(idx)) return;
    onChange([...placed, idx]);
  };
  const removeAt = (i) => onChange(placed.filter((_, idx) => idx !== i));

  const insertAt = (idx, at) => {
    if (placed.length >= ex.items.length || placed.includes(idx)) return;
    const next = [...placed];
    next.splice(Math.min(at, next.length), 0, idx);
    onChange(next);
  };

  const moveTo = (from, at) => {
    const next = [...placed];
    const [idx] = next.splice(from, 1);
    next.splice(Math.min(at, next.length), 0, idx);
    onChange(next);
  };

  const { drag, sourceProps, targetProps } = useTokenDrag((id, key) => {
    if (checked) return;
    const from = id.startsWith('pos:') ? Number(id.slice(4)) : null;
    if (key === 'bank') {
      if (from !== null) removeAt(from);
      return;
    }
    const at = Number(key.slice(4));
    if (from !== null) moveTo(from, at);
    else insertAt(Number(id.slice(5)), at);
  });

  const dragLabel =
    drag &&
    bank[drag.id.startsWith('pos:') ? placed[Number(drag.id.slice(4))] : Number(drag.id.slice(5))];

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
              {...targetProps(`pos:${i}`)}
              {...(filled && !checked ? sourceProps(`pos:${i}`) : {})}
              onClick={() => filled && removeAt(i)}
              disabled={checked || !filled}
              aria-label={t(filled ? 'exercise.positionFilled' : 'exercise.positionEmpty', {
                n: i + 1,
              })}
              className={`w-full min-h-12 px-4 py-2 rounded-xl border-2 flex items-center gap-3 text-start font-bold text-neutral-700 transition-all disabled:cursor-default ${cls}`}
            >
              <span className="text-neutral-400 text-sm shrink-0">{i + 1}.</span>
              {filled && <RichText>{bank[idx]}</RichText>}
            </button>
          );
        })}
      </div>
      <div
        {...targetProps('bank')}
        className="flex flex-wrap justify-center gap-2"
        role="group"
        aria-label={t('exercise.availableItems')}
      >
        {tray.map((idx) => {
          const label = bank[idx];
          const disabled = checked || placed.length >= ex.items.length || placed.includes(idx);
          return (
            <button
              key={idx}
              {...(disabled ? {} : sourceProps(`bank:${idx}`))}
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
        disabled={checked || placed.length === 0}
        className="tap-target-h flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-neutral-700 transition-colors disabled:opacity-40"
      >
        <RotateCcw className="w-4 h-4" /> {t('exercise.startOver')}
      </button>

      {drag && (
        <DragGhost x={drag.x} y={drag.y}>
          <span className="inline-flex items-center min-h-12 px-4 rounded-xl border-2 border-primary-400 bg-white font-bold text-neutral-800">
            <RichText>{dragLabel}</RichText>
          </span>
        </DragGhost>
      )}

      {checked && revealAnswer && ex.explanation && (
        <RichText className="block text-sm text-neutral-500 bg-neutral-50 rounded-xl p-4 leading-relaxed max-w-md text-center">
          {ex.explanation}
        </RichText>
      )}
    </div>
  );
}
