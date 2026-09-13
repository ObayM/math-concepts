'use client';
import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import RichText from '../RichText';
import { hashStr, seededShuffle } from './shuffle';
import { sortItems } from './index';
import { useTokenDrag, DragGhost } from './dnd';
import { useT } from '@/components/i18n/LocaleProvider';

export default function SortExercise({ slide, value, checked, onChange }) {
  const t = useT();
  const ex = slide.exercise;
  const items = useMemo(() => sortItems(ex), [ex]);
  const placed =
    Array.isArray(value) && value.length === items.length
      ? value
      : new Array(items.length).fill(null);
  const [armed, setArmed] = useState(null);

  const order = useMemo(
    () =>
      seededShuffle(
        items.map((_, i) => i),
        hashStr(items.map((it) => it.text).join('|'))
      ),
    [items]
  );

  const tray = order.filter((i) => placed[i] == null);

  const put = (bin) => {
    if (checked || armed == null) return;
    const next = [...placed];
    next[armed] = bin;
    onChange(next);
    setArmed(null);
  };

  const pull = (i) => {
    if (checked) return;
    const next = [...placed];
    next[i] = null;
    onChange(next);
    setArmed(null);
  };

  const { drag, sourceProps, targetProps } = useTokenDrag((id, key) => {
    if (checked) return;
    const i = Number(id);
    const next = [...placed];
    next[i] = key === 'tray' ? null : Number(key);
    onChange(next);
    setArmed(null);
  });

  const chipClass = (i, inBin) => {
    if (checked && inBin) {
      return placed[i] === items[i].bin
        ? 'border-success-500 bg-success-50 text-success-700'
        : 'border-danger-500 bg-danger-50 text-danger-700';
    }
    if (armed === i) return 'border-primary-500 bg-primary-50';
    return 'border-neutral-300 bg-white hover:border-primary-400';
  };

  return (
    <div className="flex flex-col gap-6">
      {ex.prompt && (
        <RichText className="text-xl text-neutral-700 leading-[1.75] font-normal max-w-[42rem] mx-auto text-center block">
          {ex.prompt}
        </RichText>
      )}

      <div
        {...targetProps('tray')}
        className="flex flex-wrap justify-center gap-2 min-h-14"
        role="group"
        aria-label={t('exercise.itemsLeft')}
      >
        {tray.map((i) => (
          <button
            key={i}
            {...(checked ? {} : sourceProps(String(i)))}
            onClick={() => setArmed(armed === i ? null : i)}
            disabled={checked}
            aria-pressed={armed === i}
            className={`min-h-12 px-4 rounded-xl border-2 font-bold text-neutral-800 transition-all active:scale-95 disabled:cursor-default ${chipClass(i, false)}`}
          >
            <RichText>{items[i].text}</RichText>
          </button>
        ))}
        {tray.length === 0 && !checked && (
          <p className="text-sm font-medium text-neutral-400 self-center">
            Everything is sorted. Hit Check.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ex.bins.map((bin, b) => {
          const mine = items.map((_, i) => i).filter((i) => placed[i] === b);
          const open = armed != null && !checked;
          return (
            <div
              key={b}
              {...targetProps(b)}
              onClick={() => put(b)}
              className={`rounded-2xl border-2 p-3 flex flex-col gap-2 transition-all ${
                open
                  ? 'border-primary-400 border-dashed bg-primary-50/40'
                  : 'border-neutral-200 bg-neutral-50/60'
              }`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  put(b);
                }}
                disabled={checked}
                aria-label={`${bin.label}, holds ${mine.length}. Pick an item first, then choose this bin.`}
                className="text-start text-sm font-bold text-neutral-500 uppercase tracking-wide disabled:cursor-default"
              >
                {bin.label}
              </button>
              <div className="flex flex-wrap gap-2 min-h-12">
                {mine.map((i) => (
                  <button
                    key={i}
                    {...(checked ? {} : sourceProps(String(i)))}
                    onClick={(e) => {
                      e.stopPropagation();
                      pull(i);
                    }}
                    disabled={checked}
                    aria-label={`${items[i].text} in ${bin.label}, tap to take it back`}
                    className={`min-h-10 px-3 rounded-xl border-2 font-bold text-neutral-800 transition-all active:scale-95 disabled:cursor-default flex items-center gap-2 ${chipClass(i, true)}`}
                  >
                    <RichText>{items[i].text}</RichText>
                    {checked &&
                      (placed[i] === items[i].bin ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-success-500" />
                      ) : (
                        <XCircle className="w-4 h-4 shrink-0 text-danger-500" />
                      ))}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => onChange(new Array(items.length).fill(null))}
        disabled={checked || tray.length === items.length}
        className="tap-target-h flex items-center gap-2 mx-auto text-sm font-bold text-neutral-500 hover:text-neutral-700 transition-colors disabled:opacity-40"
      >
        <RotateCcw className="w-4 h-4" /> Start over
      </button>

      {drag && (
        <DragGhost x={drag.x} y={drag.y}>
          <span className="inline-flex items-center min-h-12 px-4 rounded-xl border-2 border-primary-400 bg-white font-bold text-neutral-800">
            <RichText>{items[Number(drag.id)].text}</RichText>
          </span>
        </DragGhost>
      )}

      {checked && ex.explanation && (
        <RichText className="block text-sm text-neutral-500 bg-neutral-50 rounded-xl p-4 leading-relaxed max-w-md mx-auto text-center">
          {ex.explanation}
        </RichText>
      )}
    </div>
  );
}
