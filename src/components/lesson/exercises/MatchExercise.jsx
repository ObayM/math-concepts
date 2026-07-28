'use client';
import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import RichText from '../RichText';
import { hashStr, seededShuffle } from './shuffle';
import { useTokenDrag, DragGhost } from './dnd';

export default function MatchExercise({ slide, value, checked, onChange }) {
  const ex = slide.exercise;
  const matches = Array.isArray(value) ? value : new Array(ex.pairs.length).fill(null);
  const [armed, setArmed] = useState(null);

  const rightItems = useMemo(
    () =>
      seededShuffle(
        [...ex.pairs.map((p) => p.right), ...(ex.decoys ?? [])],
        hashStr(ex.pairs.map((p) => p.left).join('|'))
      ),
    [ex]
  );

  const pickLeft = (i) => {
    if (checked) return;
    setArmed(armed === i ? null : i);
  };

  const pickRight = (text) => {
    if (checked || armed == null) return;
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
      <RichText className="text-xl text-neutral-700 leading-[1.75] font-normal max-w-[42rem] mb-6">
        {ex.prompt}
      </RichText>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          {ex.pairs.map((p, i) => {
            const matched = matches[i] != null;
            const isCorrect = checked && matches[i] === p.right;
            const isWrong = checked && matched && !isCorrect;
            let cls = 'border-2 border-neutral-200 bg-white hover:border-primary-300';
            if (armed === i) cls = 'border-primary-500 bg-primary-50';
            else if (matched && !checked) cls = 'border-primary-300 bg-primary-50/50';
            if (isCorrect) cls = 'border-success-500 bg-success-50';
            if (isWrong) cls = 'border-danger-500 bg-danger-50';
            return (
              <button
                key={i}
                {...targetProps(i)}
                onClick={() => pickLeft(i)}
                disabled={checked}
                aria-pressed={armed === i}
                aria-label={matched ? `paired with ${matches[i]}` : undefined}
                className={`p-4 rounded-2xl text-left font-bold transition-all flex items-center justify-between active:scale-95 disabled:cursor-default ${cls}`}
              >
                <RichText>{p.left}</RichText>
                {isCorrect && <CheckCircle2 className="w-4 h-4 shrink-0 text-success-500" />}
                {isWrong && <XCircle className="w-4 h-4 shrink-0 text-danger-500" />}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          {rightItems.map((text) => {
            const owner = matches.findIndex((m) => m === text);
            const used = owner !== -1;
            const isCorrect = checked && used && ex.pairs[owner].right === text;
            const isWrong = checked && used && !isCorrect;
            let cls = 'border-2 border-neutral-200 bg-white hover:border-primary-300';
            if (used && !checked) cls = 'border-primary-300 bg-primary-50/50';
            if (isCorrect) cls = 'border-success-500 bg-success-50';
            if (isWrong) cls = 'border-danger-500 bg-danger-50';
            return (
              <button
                key={text}
                {...(checked ? {} : sourceProps(text))}
                onClick={() => pickRight(text)}
                disabled={checked}
                aria-pressed={used}
                className={`p-4 rounded-2xl text-left font-bold transition-all active:scale-95 disabled:cursor-default ${cls}`}
              >
                <RichText>{text}</RichText>
              </button>
            );
          })}
        </div>
      </div>

      {drag && (
        <DragGhost x={drag.x} y={drag.y}>
          <span className="inline-flex items-center p-4 rounded-2xl border-2 border-primary-400 bg-white font-bold text-neutral-800">
            <RichText>{drag.id}</RichText>
          </span>
        </DragGhost>
      )}

      {checked && ex.explanation && (
        <RichText className="mt-6 text-sm text-neutral-500 bg-neutral-50 rounded-xl p-4 leading-relaxed block">
          {ex.explanation}
        </RichText>
      )}
    </div>
  );
}
