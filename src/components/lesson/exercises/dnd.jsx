'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

// a tap has to survive: nothing happens until the pointer clears this, so the
// button's own onClick (which is also the keyboard path) still fires normally
const THRESHOLD = 4;

export function useTokenDrag(onDrop) {
  const [drag, setDrag] = useState(null);
  const active = useRef(null);
  const suppressClick = useRef(false);
  const latest = useRef(onDrop);
  useEffect(() => {
    latest.current = onDrop;
  });

  const start = useCallback((e, id) => {
    if (e.button != null && e.button !== 0) return;
    suppressClick.current = false;
    active.current = { id, x0: e.clientX, y0: e.clientY, moved: false };

    const move = (ev) => {
      const s = active.current;
      if (!s) return;
      if (!s.moved) {
        if (Math.hypot(ev.clientX - s.x0, ev.clientY - s.y0) < THRESHOLD) return;
        s.moved = true;
        document.body.style.userSelect = 'none';
      }
      setDrag({ id: s.id, x: ev.clientX, y: ev.clientY });
    };

    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      const s = active.current;
      active.current = null;
      setDrag(null);
      if (!s?.moved) return;
      document.body.style.userSelect = '';
      suppressClick.current = true;
      const zone = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-drop-key]');
      if (zone) latest.current?.(s.id, zone.getAttribute('data-drop-key'));
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }, []);

  useEffect(
    () => () => {
      active.current = null;
      document.body.style.userSelect = '';
    },
    []
  );

  const sourceProps = useCallback(
    (id) => ({
      onPointerDown: (e) => start(e, id),
      onClickCapture: (e) => {
        if (!suppressClick.current) return;
        suppressClick.current = false;
        e.stopPropagation();
        e.preventDefault();
      },
      style: { touchAction: 'none' },
    }),
    [start]
  );

  const targetProps = useCallback((key) => ({ 'data-drop-key': String(key) }), []);

  return { drag, sourceProps, targetProps };
}

export function DragGhost({ x, y, children }) {
  return (
    <div
      aria-hidden
      className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2 rotate-3 opacity-95"
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  );
}
