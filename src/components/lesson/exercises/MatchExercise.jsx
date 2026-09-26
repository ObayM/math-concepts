'use client';
import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import RichText from '../RichText';
import { hashStr, seededShuffle } from './shuffle';
import { sameAnswer } from './answers';
import { useTokenDrag, DragGhost } from './dnd';

const PAIR = [
  {
    dot: 'bg-pair-1',
    box: 'border-pair-1 bg-pair-1-soft',
    armed: 'border-pair-1 bg-pair-1-soft ring-4 ring-pair-1/25',
  },
  {
    dot: 'bg-pair-2',
    box: 'border-pair-2 bg-pair-2-soft',
    armed: 'border-pair-2 bg-pair-2-soft ring-4 ring-pair-2/25',
  },
  {
    dot: 'bg-pair-3',
    box: 'border-pair-3 bg-pair-3-soft',
    armed: 'border-pair-3 bg-pair-3-soft ring-4 ring-pair-3/25',
  },
  {
    dot: 'bg-pair-4',
    box: 'border-pair-4 bg-pair-4-soft',
    armed: 'border-pair-4 bg-pair-4-soft ring-4 ring-pair-4/25',
  },
  {
    dot: 'bg-pair-5',
    box: 'border-pair-5 bg-pair-5-soft',
    armed: 'border-pair-5 bg-pair-5-soft ring-4 ring-pair-5/25',
  },
  {
    dot: 'bg-pair-6',
    box: 'border-pair-6 bg-pair-6-soft',
    armed: 'border-pair-6 bg-pair-6-soft ring-4 ring-pair-6/25',
  },
];

const hueOf = (i) => PAIR[i % PAIR.length];

export default function MatchExercise({
  slide,
  value,
  checked,
  correct,
  onChange,
  revealAnswer = true,
}) {
  const ex = slide.exercise;
  const matches = Array.isArray(value) ? value : new Array(ex.pairs.length).fill(null);
  const misses = (ex.misses ?? []).filter((m) =>
    ex.pairs.some((p, i) => p.left === m.left && sameAnswer(matches[i], m.right))
  );
  const [armed, setArmed] = useState(null);

  const rightItems = useMemo(
    () =>
      seededShuffle(
        [...ex.pairs.map((p) => p.right), ...(ex.decoys ?? [])],
        hashStr(ex.pairs.map((p) => p.left).join('|'))
      ),
    [ex]
  );

  const clear = (i) => {
    const next = [...matches];
    next[i] = null;
    onChange(next);
  };

  const pickLeft = (i) => {
    if (checked) return;
    if (armed === i) {
      setArmed(null);
      return;
    }
    if (matches[i] != null) clear(i);
    setArmed(i);
  };

  const pickRight = (text) => {
    if (checked) return;
    if (armed == null) {
      const owner = matches.findIndex((m) => m === text);
      if (owner !== -1) clear(owner);
      return;
    }
    pair(armed, text);
  };

  const pair = (left, text) => {
    const next = matches.map((m) => (m === text ? null : m));
    next[left] = text;
    onChange(next);
    setArmed(null);
  };

  const { drag, sourceProps, targetProps } = useTokenDrag((text, key) => {
    if (checked) return;
    pair(Number(key), text);
  });

  return (
    <div className="flex flex-col">
      <RichText className="text-xl text-neutral-700 leading-[1.75] font-normal max-w-[42rem] mb-2">
        {ex.prompt}
      </RichText>

      {!checked && (
        <p className="text-sm text-neutral-400 mb-6">
          Tap one on the left, then its partner on the right. They turn the same color. Tap either
          one again to undo.
        </p>
      )}

      <div className={`grid gap-4 sm:grid-cols-2 ${checked ? 'mt-4' : ''}`}>
        <div className="flex flex-col gap-2">
          {ex.pairs.map((p, i) => {
            const hue = hueOf(i);
            const matched = matches[i] != null;
            const isCorrect = checked && sameAnswer(matches[i], p.right);
            const isWrong = checked && matched && !isCorrect;
            let cls = 'border-2 border-neutral-200 bg-white hover:border-neutral-300';
            if (matched) cls = `border-2 ${hue.box}`;
            if (armed === i) cls = `border-2 ${hue.armed}`;
            if (isCorrect) cls = 'border-2 border-success-500 bg-success-50';
            if (isWrong) cls = 'border-2 border-danger-500 bg-danger-50';
            const lit = matched || armed === i;
            return (
              <button
                key={i}
                {...targetProps(i)}
                onClick={() => pickLeft(i)}
                disabled={checked}
                aria-pressed={armed === i}
                aria-label={matched ? `paired with ${matches[i]}` : undefined}
                className={`p-4 rounded-2xl text-start font-bold transition-all flex items-center gap-3 active:scale-95 disabled:cursor-default ${cls}`}
              >
                <span
                  aria-hidden
                  className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${lit ? hue.dot : 'bg-neutral-200'}`}
                />
                <RichText className="grow">{p.left}</RichText>
                {isCorrect && <CheckCircle2 className="w-4 h-4 shrink-0 text-success-500" />}
                {isWrong && <XCircle className="w-4 h-4 shrink-0 text-danger-500" />}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 sm:hidden">
            Match with
          </p>
          {rightItems.map((text) => {
            const owner = matches.findIndex((m) => m === text);
            const used = owner !== -1;
            const hue = used ? hueOf(owner) : null;
            const isCorrect = checked && used && sameAnswer(text, ex.pairs[owner].right);
            const isWrong = checked && used && !isCorrect;
            let cls = 'border-2 border-neutral-200 bg-white hover:border-neutral-300';
            if (used) cls = `border-2 ${hue.box}`;
            if (isCorrect) cls = 'border-2 border-success-500 bg-success-50';
            if (isWrong) cls = 'border-2 border-danger-500 bg-danger-50';
            return (
              <button
                key={text}
                {...(checked ? {} : sourceProps(text))}
                onClick={() => pickRight(text)}
                disabled={checked}
                aria-pressed={used}
                className={`p-4 rounded-2xl text-start font-bold transition-all flex items-center gap-3 active:scale-95 disabled:cursor-default ${cls}`}
              >
                <span
                  aria-hidden
                  className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${hue ? hue.dot : 'bg-neutral-200'}`}
                />
                <RichText className="grow">{text}</RichText>
              </button>
            );
          })}
        </div>
      </div>

      {drag && (
        <DragGhost x={drag.x} y={drag.y}>
          <span className="inline-flex items-center p-4 rounded-2xl border-2 border-neutral-300 bg-white font-bold text-neutral-800">
            <RichText>{drag.id}</RichText>
          </span>
        </DragGhost>
      )}

      {checked && !correct && misses.length > 0 && (
        <div className="mt-6 flex flex-col gap-1">
          {misses.map((m) => (
            <RichText key={`${m.left}>${m.right}`} className="block text-sm text-danger-600">
              {m.why}
            </RichText>
          ))}
        </div>
      )}

      {checked && revealAnswer && ex.explanation && (
        <RichText className="mt-6 text-sm text-neutral-500 bg-neutral-50 rounded-xl p-4 leading-relaxed block">
          {ex.explanation}
        </RichText>
      )}
    </div>
  );
}
