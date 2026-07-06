'use client';
import { useEffect, useRef } from 'react';

export function useSlidingIndicator(activeId: string | null) {
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;

    function position() {
      const activeLink = activeId
        ? list!.querySelector<HTMLElement>(`[data-rail-id="${CSS.escape(activeId)}"]`)
        : null;
      if (!activeLink) {
        indicator!.style.opacity = '0';
        return;
      }
      indicator!.style.opacity = '1';
      indicator!.style.transform = `translateY(${activeLink.offsetTop}px)`;
      indicator!.style.height = `${activeLink.offsetHeight}px`;
    }

    position();
    window.addEventListener('resize', position);
    return () => window.removeEventListener('resize', position);
  }, [activeId]);

  return { listRef, indicatorRef };
}
