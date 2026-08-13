'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

const SAVE_DEBOUNCE_MS = 800;
const EMPTY = { notes: '', strokes: [] };

export default function useScratchpad(lessonId, slideId, onSaveError) {
  const [byId, setById] = useState({});
  const byIdRef = useRef(byId);
  const dirtyRef = useRef(new Set());
  const timerRef = useRef(null);
  const errorRef = useRef(onSaveError);

  useEffect(() => {
    byIdRef.current = byId;
    errorRef.current = onSaveError;
  });

  useEffect(() => {
    if (!lessonId) return;
    let cancelled = false;
    fetch(`/api/notes?lessonKey=${encodeURIComponent(lessonId)}`)
      .then((r) => (r.ok ? r.json() : { notes: {} }))
      .then((d) => {
        if (!cancelled) setById(d.notes ?? {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const flush = useCallback(
    (keepalive = false) => {
      clearTimeout(timerRef.current);
      timerRef.current = null;

      const ids = [...dirtyRef.current];
      dirtyRef.current.clear();

      for (const id of ids) {
        const entry = byIdRef.current[id] ?? EMPTY;
        fetch('/api/notes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          keepalive,
          body: JSON.stringify({
            lessonKey: lessonId,
            slideId: id,
            notes: entry.notes ?? '',
            strokes: entry.strokes ?? [],
          }),
        })
          .then((r) => {
            if (!r.ok) errorRef.current?.();
          })
          .catch(() => errorRef.current?.());
      }
    },
    [lessonId]
  );

  useEffect(() => () => flush(), [slideId, flush]);

  useEffect(() => {
    const onUnload = () => flush(true);
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [flush]);

  const update = useCallback(
    (patch) => {
      if (!slideId) return;
      setById((prev) => ({ ...prev, [slideId]: { ...EMPTY, ...prev[slideId], ...patch } }));
      dirtyRef.current.add(slideId);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => flush(), SAVE_DEBOUNCE_MS);
    },
    [slideId, flush]
  );

  const entry = byId[slideId] ?? EMPTY;

  return {
    notes: entry.notes ?? '',
    strokes: entry.strokes ?? [],
    setNotes: useCallback((notes) => update({ notes }), [update]),
    setStrokes: useCallback((strokes) => update({ strokes }), [update]),
    hasWork: Boolean(entry.notes?.trim() || entry.strokes?.length),
  };
}
