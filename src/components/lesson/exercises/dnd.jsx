'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

// a tap has to survive: nothing happens until the pointer clears this, so the
// button's own onClick (which is also the keyboard path) still fires normally
const THRESHOLD = 4;
// a stacked phone layout puts the bank and its slots a screenful apart, so a
// drag that cannot scroll is a drag that cannot finish
const EDGE = 72;
const MAX_SPEED = 16;

function scrollParent(el) {
  for (let n = el?.parentElement; n; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight) return n;
  }
  return null;
}

export function useTokenDrag(onDrop) {
  const [drag, setDrag] = useState(null);
  const active = useRef(null);
  const suppressClick = useRef(false);
  const overRef = useRef(null);
  const rafRef = useRef(null);
  const teardownRef = useRef(null);
  const latest = useRef(onDrop);
  useEffect(() => {
    latest.current = onDrop;
  });

  const markOver = (zone) => {
    if (overRef.current === zone) return;
    overRef.current?.removeAttribute('data-drop-over');
    if (zone) zone.setAttribute('data-drop-over', 'true');
    overRef.current = zone;
  };

  const start = useCallback((e, id) => {
    if (e.button != null && e.button !== 0) return;
    suppressClick.current = false;
    const box = scrollParent(e.currentTarget);
    active.current = { id, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, moved: false };

    const autoscroll = () => {
      const s = active.current;
      if (s?.moved) {
        const top = box ? box.getBoundingClientRect().top : 0;
        const bottom = box ? box.getBoundingClientRect().bottom : window.innerHeight;
        let d = 0;
        if (s.y - top < EDGE) d = -((EDGE - (s.y - top)) / EDGE) * MAX_SPEED;
        else if (bottom - s.y < EDGE) d = ((EDGE - (bottom - s.y)) / EDGE) * MAX_SPEED;
        if (d) {
          if (box) box.scrollTop += d;
          else window.scrollBy(0, d);
        }
      }
      rafRef.current = requestAnimationFrame(autoscroll);
    };

    const move = (ev) => {
      const s = active.current;
      if (!s) return;
      s.x = ev.clientX;
      s.y = ev.clientY;
      if (!s.moved) {
        if (Math.hypot(ev.clientX - s.x0, ev.clientY - s.y0) < THRESHOLD) return;
        s.moved = true;
        document.body.style.userSelect = 'none';
        if (rafRef.current == null) rafRef.current = requestAnimationFrame(autoscroll);
      }
      markOver(document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-drop-key]'));
      setDrag({ id: s.id, x: ev.clientX, y: ev.clientY });
    };

    const teardown = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      teardownRef.current = null;
    };

    const up = (ev) => {
      teardown();
      const s = active.current;
      active.current = null;
      setDrag(null);
      markOver(null);
      if (!s?.moved) return;
      document.body.style.userSelect = '';
      suppressClick.current = true;
      const zone = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-drop-key]');
      if (zone) latest.current?.(s.id, zone.getAttribute('data-drop-key'));
    };

    teardownRef.current = teardown;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }, []);

  useEffect(
    () => () => {
      teardownRef.current?.();
      active.current = null;
      overRef.current?.removeAttribute('data-drop-over');
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
