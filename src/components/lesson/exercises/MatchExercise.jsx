'use client';
import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import RichText from '../RichText';

// deterministic shuffle so the right column doesn't reorder on every render,
// but still varies per exercise (seeded off the pair texts, not Math.random)
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function seededShuffle(items, seed) {
  let s = seed || 1;
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// v2 match — tap a left item, then tap a right item to pair them. reads
// slide.exercise (prompt, pairs[{left,right}], decoys?, explanation)
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
    const next = matches.map((m) => (m === text ? null : m));
    next[armed] = text;
    onChange(next);
    setArmed(null);
  };

  return (
    <div className="flex flex-col">
      <RichText className="text-xl text-neutral-600 leading-relaxed font-medium mb-6">
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
                onClick={() => pickLeft(i)}
                className={`p-4 rounded-2xl text-left font-bold transition-all flex items-center justify-between active:scale-95 ${cls}`}
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
                onClick={() => pickRight(text)}
                disabled={checked}
                className={`p-4 rounded-2xl text-left font-bold transition-all active:scale-95 disabled:cursor-default ${cls}`}
              >
                <RichText>{text}</RichText>
              </button>
            );
          })}
        </div>
      </div>

      {checked && ex.explanation && (
        <RichText className="mt-6 text-sm text-neutral-500 bg-neutral-50 rounded-xl p-4 leading-relaxed block">
          {ex.explanation}
        </RichText>
      )}
    </div>
  );
}
