'use client';
import { useEffect, useState } from 'react';
import { useSlidingIndicator } from './useSlidingIndicator';

function useScrollSpy(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!ids.length) return;
    const observers: IntersectionObserver[] = [];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: '-15% 0px -70% 0px' }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join('|')]);

  return active ?? ids[0] ?? null;
}

export default function OnThisPage({ items }: { items: { id: string; label: string }[] }) {
  const activeId = useScrollSpy(items.map((i) => i.id));
  const { listRef, indicatorRef } = useSlidingIndicator(activeId);

  if (!items.length) return null;

  return (
    <aside className="toc">
      <p className="sidebar-heading">On this page</p>
      <div className="rail" ref={listRef}>
        <span className="rail-indicator" ref={indicatorRef} />
        <nav className="rail-list">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              data-rail-id={item.id}
              className={`rail-link ${activeId === item.id ? 'active' : ''}`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
