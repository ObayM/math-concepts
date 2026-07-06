'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRISM_DOCS } from '@/engine/lang/docs';
import { useSlidingIndicator } from './useSlidingIndicator';

export default function PrismSidebar() {
  const pathname = usePathname();
  const isGuide = pathname === '/prism' || pathname.startsWith('/prism/docs');
  const activeSection = pathname.startsWith('/prism/docs/') ? pathname.split('/')[3] : null;
  const { listRef, indicatorRef } = useSlidingIndicator(activeSection);

  if (!isGuide) return null;

  return (
    <aside className="prism-sidebar">
      <p className="sidebar-heading">Guide</p>
      <div className="rail" ref={listRef}>
        <span className="rail-indicator" ref={indicatorRef} />
        <nav className="rail-list">
          {PRISM_DOCS.sections.map((s, i) => (
            <Link
              key={s.id}
              href={`/prism/docs/${s.id}`}
              data-rail-id={s.id}
              className={`rail-link ${s.id === activeSection ? 'active' : ''}`}
            >
              <span className="rail-num">{String(i + 1).padStart(2, '0')}</span>
              {s.title}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
