'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import PrismSearch from './PrismSearch';

function PrismIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5L14.5 13.5H1.5L8 1.5Z" fill="white" fillOpacity="0.9" />
      <path d="M8 6L11.5 12.5H4.5L8 6Z" fill="white" fillOpacity="0.4" />
    </svg>
  );
}

const LINKS = [
  {
    href: '/prism',
    label: 'Guide',
    match: (p: string) => p === '/prism' || p.startsWith('/prism/docs'),
  },
  {
    href: '/prism/cookbook',
    label: 'Cookbook',
    match: (p: string) => p.startsWith('/prism/cookbook'),
  },
  {
    href: '/prism/examples',
    label: 'Examples',
    match: (p: string) => p.startsWith('/prism/examples'),
  },
  { href: '/prism/errors', label: 'Errors', match: (p: string) => p.startsWith('/prism/errors') },
  { href: '/prism/play', label: 'Playground', match: (p: string) => p.startsWith('/prism/play') },
];

export default function PrismNavbar() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <header className="prism-navbar">
        <Link href="/prism" className="navbar-brand">
          <div className="navbar-brand-icon">
            <PrismIcon />
          </div>
          <span className="navbar-brand-name">Prism</span>
        </Link>

        <nav className="navbar-links">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`navbar-link ${l.match(pathname) ? 'active' : ''}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <button className="navbar-search-btn" onClick={() => setSearchOpen(true)}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M8.5 8.5L11.5 11.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <span>Search docs</span>
          <kbd className="navbar-search-kbd">⌘K</kbd>
        </button>
      </header>

      {searchOpen && <PrismSearch onClose={() => setSearchOpen(false)} />}
    </>
  );
}
