'use client';
import { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import RichText from '../RichText';
import { useTokenDrag, DragGhost } from './dnd';
import { useT } from '@/components/i18n/LocaleProvider';
import { hashStr, shuffledOrder } from './shuffle';

export default function BuildExercise({
  slide,
  value = [],
  checked,
  correct,
  onChange,
  revealAnswer = true,
}) {
  const t = useT();
  const ex = slide.exercise;
  const placed = Array.isArray(value) ? value : [];
  const misses = (ex.misses ?? []).filter((m) => placed.includes(m.token));
  const bank = useMemo(
    () =>
      shuffledOrder(ex.bank.length, hashStr(ex.bank.map((tok) => tok.id).join('|'))).map(
        (i) => ex.bank[i]
      ),
    [ex]
  );
  const labelOf = (id) => ex.bank.find((t) => t.id === id)?.label ?? id;
  const usedCount = (id) => placed.filter((p) => p === id).length;

  const place = (id) => {
    if (placed.length >= ex.slots) return;
    if (!ex.reusable && usedCount(id) > 0) return;
    onChange([...placed, id]);
  };
  const removeAt = (i) => onChange(placed.filter((_, idx) => idx !== i));

  const insertAt = (id, at) => {
    if (placed.length >= ex.slots) return;
    if (!ex.reusable && usedCount(id) > 0) return;
    const next = [...placed];
    next.splice(Math.min(at, next.length), 0, id);
    onChange(next);
  };

  const moveTo = (from, at) => {
    const next = [...placed];
    const [tok] = next.splice(from, 1);
    next.splice(Math.min(at, next.length), 0, tok);
    onChange(next);
  };

  const { drag, sourceProps, targetProps } = useTokenDrag((id, key) => {
    if (checked) return;
    const from = id.startsWith('slot:') ? Number(id.slice(5)) : null;
    if (key === 'bank') {
      if (from !== null) removeAt(from);
      return;
    }
    if (!key.startsWith('slot:')) return;
    const at = Number(key.slice(5));
    if (from !== null) moveTo(from, at);
    else insertAt(id.slice(5), at);
  });

  const dragLabel =
    drag &&
    labelOf(drag.id.startsWith('slot:') ? placed[Number(drag.id.slice(5))] : drag.id.slice(5));

  const slotClass = (i) => {
    const filled = placed[i] != null;
    if (checked && filled)
      return correct ? 'border-success-500 bg-success-50' : 'border-danger-500 bg-danger-50';
    if (filled) return 'border-primary-300 bg-white';
    return 'border-dashed border-neutral-300';
  };

  const slotLabel = (i) =>
    t(placed[i] != null ? 'exercise.slotFilled' : 'exercise.slotEmpty', { n: i + 1 });

  const renderTemplate = () => {
    let slotIndex = -1;
    return (
      <div className="flex flex-wrap items-baseline gap-y-3 w-fit mx-auto max-w-[42rem] text-xl leading-[2] text-neutral-800 max-md:text-lg max-md:w-full max-md:justify-center">
        {ex.template.map((seg, i) => {
          if (!('slot' in seg)) {
            return (
              <RichText key={i} className="whitespace-pre-wrap">
                {seg.text}
              </RichText>
            );
          }
          slotIndex += 1;
          const at = slotIndex;
          const filled = placed[at] != null;
          return (
            <button
              key={i}
              {...targetProps(`slot:${at}`)}
              {...(filled && !checked ? sourceProps(`slot:${at}`) : {})}
              onClick={() => filled && removeAt(at)}
              disabled={checked || !filled}
              aria-label={slotLabel(at)}
              className={`inline-flex items-center justify-center align-baseline min-w-16 h-11 px-3 mx-1 rounded-xl border-2 font-bold text-neutral-800 transition-all disabled:cursor-default max-md:min-w-12 max-md:px-2 max-md:mx-0.5 ${slotClass(at)}`}
            >
              {filled && <RichText>{labelOf(placed[at])}</RichText>}
            </button>
          );
        })}
      </div>
    );
  };

  const renderSlotRow = () => (
    <div className="flex flex-wrap justify-center gap-2 bg-neutral-50 border border-neutral-200 rounded-2xl p-4 min-w-[200px] max-md:min-w-0 max-md:p-3">
      {Array.from({ length: ex.slots }).map((_, i) => {
        const filled = placed[i] != null;
        return (
          <button
            key={i}
            {...targetProps(`slot:${i}`)}
            {...(filled && !checked ? sourceProps(`slot:${i}`) : {})}
            onClick={() => filled && removeAt(i)}
            disabled={checked || !filled}
            aria-label={slotLabel(i)}
            className={`min-w-12 h-12 px-2 rounded-xl border-2 flex items-center justify-center text-lg font-bold text-neutral-700 transition-all disabled:cursor-default ${slotClass(i)}`}
          >
            {filled && <RichText>{labelOf(placed[i])}</RichText>}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-6">
      {ex.prompt && (
        <RichText className="text-xl text-neutral-700 leading-[1.75] font-normal max-w-[42rem] mx-auto text-center block">
          {ex.prompt}
        </RichText>
      )}

      {ex.template ? renderTemplate() : renderSlotRow()}

      <div
        {...targetProps('bank')}
        className="flex flex-wrap justify-center gap-2"
        role="group"
        aria-label={t('exercise.tokenBank')}
      >
        {bank.map((tok) => {
          const isOp = tok.kind === 'operator';
          const disabled =
            checked || placed.length >= ex.slots || (!ex.reusable && usedCount(tok.id) > 0);
          return (
            <button
              key={tok.id}
              data-token={tok.id}
              {...(disabled ? {} : sourceProps(`bank:${tok.id}`))}
              onClick={() => place(tok.id)}
              disabled={disabled}
              className={`flex items-center justify-center text-lg font-bold transition-all active:scale-90 disabled:opacity-30 ${
                isOp
                  ? 'min-w-12 h-12 px-2 rounded-full border-2 border-neutral-300 text-neutral-600 hover:border-primary-400'
                  : 'min-w-12 h-12 px-3 rounded-xl border-2 border-neutral-300 bg-white text-neutral-800 hover:border-primary-400'
              }`}
            >
              <RichText>{tok.label}</RichText>
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
          <span className="inline-flex items-center justify-center min-w-12 h-12 px-3 rounded-xl border-2 border-primary-400 bg-white text-lg font-bold text-neutral-800">
            <RichText>{dragLabel}</RichText>
          </span>
        </DragGhost>
      )}

      {checked && !correct && misses.length > 0 && (
        <div className="flex max-w-md flex-col gap-1 text-center">
          {misses.map((m) => (
            <RichText key={m.token} className="block text-sm text-danger-600">
              {m.why}
            </RichText>
          ))}
        </div>
      )}

      {checked && revealAnswer && ex.explanation && (
        <RichText className="block text-sm text-neutral-500 bg-neutral-50 rounded-xl p-4 leading-relaxed max-w-md text-center">
          {ex.explanation}
        </RichText>
      )}
    </div>
  );
}
