'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRISM_DOCS } from '@/engine/lang/docs';

export default function PrismSidebar() {
  const pathname = usePathname();
  const activeSection = pathname.startsWith('/prism/docs/') ? pathname.split('/')[3] : null;

  return (
    <aside className="prism-sidebar">
      <p className="sidebar-heading">Guide</p>
      <nav className="sidebar-nav">
        {PRISM_DOCS.sections.map((s) => {
          const isActive = s.id === activeSection;
          return (
            <div key={s.id} className="sidebar-group">
              <Link
                href={`/prism/docs/${s.id}`}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                {s.title}
              </Link>
              {isActive && (
                <div className="sidebar-sublinks">
                  {s.entries.map((e) => (
                    <a key={e.keyword} href={`#entry-${e.keyword}`} className="sidebar-sublink">
                      {e.keyword}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
