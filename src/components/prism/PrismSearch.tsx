'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PRISM_DOCS } from '@/engine/lang/docs';
import { PRISM_COOKBOOK } from '@/engine/lang/docs/cookbook';
import { PRISM_ERRORS } from '@/engine/lang/docs/errors';

interface SearchItem {
  href: string;
  group: string;
  title: string;
  subtitle: string;
}

const INDEX: SearchItem[] = [
  ...PRISM_DOCS.sections.flatMap((s) =>
    s.entries.map((e) => ({
      href: `/prism/docs/${s.id}#entry-${e.keyword}`,
      group: s.title,
      title: e.keyword,
      subtitle: e.description,
    }))
  ),
  ...PRISM_COOKBOOK.map((c) => ({
    href: `/prism/cookbook#${c.id}`,
    group: 'Cookbook',
    title: c.title,
    subtitle: c.description,
  })),
  ...PRISM_ERRORS.map((e) => ({
    href: `/prism/errors#${e.code}`,
    group: 'Errors',
    title: `${e.code} — ${e.title}`,
    subtitle: e.explanation,
  })),
];

function search(query: string): SearchItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return INDEX.slice(0, 8);
  return INDEX.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q)
  ).slice(0, 20);
}

export default function PrismSearch({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => search(query), [query]);
  const activeIndex = results.length ? Math.min(cursor, results.length - 1) : 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function go(item: SearchItem) {
    router.push(item.href);
    onClose();
  }

  return (
    <div className="prism-search-overlay" onClick={onClose}>
      <div className="prism-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="prism-search-input-row">
          <svg width="15" height="15" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M8.5 8.5L11.5 11.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={inputRef}
            className="prism-search-input"
            placeholder="Search Prism docs…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor(Math.min(activeIndex + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor(Math.max(activeIndex - 1, 0));
              } else if (e.key === 'Enter' && results[activeIndex]) {
                go(results[activeIndex]);
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
          />
          <kbd className="prism-search-esc">Esc</kbd>
        </div>

        <div className="prism-search-results">
          {results.length === 0 && <p className="prism-search-empty">No results for “{query}”.</p>}
          {results.map((item, i) => (
            <button
              key={item.href}
              className={`prism-search-item ${i === activeIndex ? 'active' : ''}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => go(item)}
            >
              <span className="prism-search-item-group">{item.group}</span>
              <span className="prism-search-item-title">{item.title}</span>
              <span className="prism-search-item-subtitle">{item.subtitle}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
