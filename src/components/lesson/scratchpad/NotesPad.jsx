'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

import RichText from '../RichText';

const CARET_END = -1;

export default function NotesPad({ value, onChange }) {
  const lines = useMemo(() => value.split('\n'), [value]);
  const [active, setActive] = useState(null);
  const taRef = useRef(null);
  const caretRef = useRef(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;

    if (document.activeElement !== ta) ta.focus();

    if (caretRef.current !== null) {
      const pos = caretRef.current === CARET_END ? ta.value.length : caretRef.current;
      ta.setSelectionRange(pos, pos);
      caretRef.current = null;
    }

    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [active, value]);

  const focusLine = (i, caret) => {
    caretRef.current = caret;
    setActive(i);
  };

  const commit = (next) => onChange(next.join('\n'));

  const handleKeyDown = (e, i) => {
    const ta = e.target;
    const start = ta.selectionStart;
    const collapsed = start === ta.selectionEnd;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const before = lines[i].slice(0, start);
      const after = lines[i].slice(ta.selectionEnd);
      focusLine(i + 1, 0);
      commit([...lines.slice(0, i), before, after, ...lines.slice(i + 1)]);
      return;
    }

    if (e.key === 'Backspace' && collapsed && start === 0 && i > 0) {
      e.preventDefault();
      focusLine(i - 1, lines[i - 1].length);
      commit([...lines.slice(0, i - 1), lines[i - 1] + lines[i], ...lines.slice(i + 1)]);
      return;
    }

    if (e.key === 'ArrowUp' && collapsed && start === 0 && i > 0) {
      e.preventDefault();
      focusLine(i - 1, CARET_END);
      return;
    }

    if (e.key === 'ArrowDown' && collapsed && start === ta.value.length && i < lines.length - 1) {
      e.preventDefault();
      focusLine(i + 1, CARET_END);
      return;
    }

    if (e.key === 'Escape') {
      e.stopPropagation();
      setActive(null);
    }
  };

  const isBlank = lines.length === 1 && lines[0] === '';

  return (
    <div
      className="min-h-0 flex-1 cursor-text overflow-y-auto rounded-xl border border-neutral-200 bg-white p-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          focusLine(lines.length - 1, CARET_END);
        }
      }}
    >
      {isBlank && active === null && (
        <p className="pointer-events-none text-sm text-neutral-400">
          Type here. Wrap math in $…$ and it renders when you leave the line.
        </p>
      )}

      {lines.map((line, i) =>
        i === active ? (
          <textarea
            key={i}
            ref={taRef}
            rows={1}
            value={line}
            spellCheck={false}
            onChange={(e) => commit(lines.map((l, j) => (j === i ? e.target.value : l)))}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onBlur={() => setActive(null)}
            className="block w-full resize-none overflow-hidden bg-primary-50/40 font-mono text-[13px] leading-6 text-neutral-800 outline-none"
          />
        ) : (
          <div
            key={i}
            onMouseDown={(e) => {
              e.preventDefault();
              focusLine(i, CARET_END);
            }}
            className="min-h-6 text-[15px] leading-6 text-neutral-700"
          >
            <RichText>{line}</RichText>
          </div>
        )
      )}
    </div>
  );
}
