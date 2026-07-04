'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PRISM_DOCS } from '@/engine/lang/docs';
import type { DocEntry, DocSection } from '@/engine/lang/docs';
import LiveSnippet from '@/components/prism/LiveSnippet';
import SyntaxPre from '@/components/prism/SyntaxPre';
import './prism.css';

function PropTable({ props }: { props: NonNullable<DocEntry['props']> }) {
  return (
    <div className="prop-table-wrap">
      <table className="prop-table">
        <thead>
          <tr>
            <th>prop</th>
            <th>type</th>
            <th>description</th>
          </tr>
        </thead>
        <tbody>
          {props.map((p) => (
            <tr key={p.name}>
              <td>
                <span className="prop-name">{p.name}</span>
                {p.required && <span className="prop-required">*</span>}
              </td>
              <td>
                <span className="prop-type">{p.type}</span>
              </td>
              <td>{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Entry({ entry }: { entry: DocEntry }) {
  return (
    <div id={`entry-${entry.keyword}`} className="prism-entry">
      <div className="entry-header">
        <h3 className="entry-keyword">{entry.keyword}</h3>
      </div>

      <SyntaxPre code={entry.syntax} />

      <p className="entry-description">{entry.description}</p>

      {entry.props && entry.props.length > 0 && <PropTable props={entry.props} />}

      {entry.example && (
        <div style={{ marginTop: 16 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#9ca3af',
              marginBottom: 8,
            }}
          >
            example
          </p>
          <LiveSnippet code={entry.example} />
        </div>
      )}
    </div>
  );
}

function Section({ section }: { section: DocSection }) {
  return (
    <section id={section.id} className="prism-section">
      <h2 className="section-title">{section.title}</h2>
      <p className="section-description">{section.description}</p>
      <div>
        {section.entries.map((e) => (
          <Entry key={e.keyword} entry={e} />
        ))}
      </div>
    </section>
  );
}

function PrismIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5L14.5 13.5H1.5L8 1.5Z" fill="white" fillOpacity="0.9" />
      <path d="M8 6L11.5 12.5H4.5L8 6Z" fill="white" fillOpacity="0.4" />
    </svg>
  );
}

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: '-20% 0px -70% 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [ids]);
  return active;
}

export default function PrismPage() {
  const sectionIds = PRISM_DOCS.sections.map((s) => s.id);
  const active = useActiveSection(sectionIds);

  return (
    <div className="prism-root">
      <aside className="prism-sidebar">
        <Link href="/" className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <PrismIcon size={14} />
          </div>
          <span className="sidebar-brand-name">Prism</span>
        </Link>
        <p className="sidebar-tagline">{PRISM_DOCS.tagline}</p>

        <nav className="sidebar-nav">
          {PRISM_DOCS.sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`sidebar-link ${active === s.id ? 'active' : ''}`}
            >
              {s.title}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link href="/prism/play" className="sidebar-footer-link">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect
                x="1"
                y="1"
                width="5"
                height="5"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <rect
                x="7"
                y="1"
                width="5"
                height="5"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <rect
                x="1"
                y="7"
                width="5"
                height="5"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <rect
                x="7"
                y="7"
                width="5"
                height="5"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            Playground
          </Link>
          <Link href="/prism/examples" className="sidebar-footer-link">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path
                d="M2 3h9M2 6.5h6M2 10h7.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Examples
          </Link>
          <Link href="/prism/cookbook" className="sidebar-footer-link">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path
                d="M2 1.5h9v10l-4.5-2-4.5 2v-10z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            Cookbook
          </Link>
          <Link href="/prism/errors" className="sidebar-footer-link">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6.5 4v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="6.5" cy="9" r="0.6" fill="currentColor" />
            </svg>
            Errors
          </Link>
        </div>
      </aside>

      <main className="prism-main">
        <header className="prism-hero">
          <div className="prism-hero-content">
            <p className="prism-hero-eyebrow">Mathly Engine</p>
            <h1 className="prism-hero-title">Prism</h1>
            <p className="prism-hero-tagline">{PRISM_DOCS.tagline}</p>
            <p className="prism-hero-intro">
              {PRISM_DOCS.intro.split('\n').filter(Boolean).join(' ')}
            </p>
            <div className="hero-cta-row">
              <Link href="/prism/play" className="hero-cta-primary">
                Open playground →
              </Link>
              <Link href="/prism/examples" className="hero-cta-secondary">
                View examples
              </Link>
              <Link href="/prism/cookbook" className="hero-cta-secondary">
                Cookbook
              </Link>
            </div>
          </div>
        </header>

        <div className="keyword-index">
          <p className="keyword-index-label">All keywords</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PRISM_DOCS.sections.flatMap((s) =>
              s.entries.map((e) => (
                <a key={e.keyword} href={`#entry-${e.keyword}`} className="keyword-chip">
                  {e.keyword}
                </a>
              ))
            )}
          </div>
        </div>

        {PRISM_DOCS.sections.map((s, i) => (
          <div key={s.id}>
            {i > 0 && <hr className="section-divider" />}
            <Section section={s} />
          </div>
        ))}

        <footer className="prism-footer">
          Part of the{' '}
          <Link href="/" style={{ color: '#6366f1' }}>
            Mathly
          </Link>{' '}
          engine. Compiler lives at{' '}
          <code
            style={{
              fontSize: 12,
              fontFamily: 'ui-monospace, monospace',
              background: '#f3f4f6',
              padding: '1px 5px',
              borderRadius: 4,
            }}
          >
            src/engine/lang/
          </code>
        </footer>
      </main>
    </div>
  );
}
