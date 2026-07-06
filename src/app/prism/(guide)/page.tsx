import Link from 'next/link';
import { PRISM_DOCS } from '@/engine/lang/docs';

export default function PrismPage() {
  return (
    <div className="prism-page">
      <header className="prism-hero">
        <div className="prism-hero-content">
          <p className="prism-hero-eyebrow">Mathly Engine</p>
          <h1 className="prism-hero-title">Prism</h1>
          <p className="prism-hero-tagline">{PRISM_DOCS.tagline}</p>
          <p className="prism-hero-intro">
            {PRISM_DOCS.intro.split('\n').filter(Boolean).join(' ')}
          </p>
          <div className="hero-cta-row">
            <Link href={`/prism/docs/${PRISM_DOCS.sections[0].id}`} className="hero-cta-primary">
              Start reading →
            </Link>
            <Link href="/prism/play" className="hero-cta-secondary">
              Open playground
            </Link>
            <Link href="/prism/cookbook" className="hero-cta-secondary">
              Cookbook
            </Link>
          </div>
        </div>
      </header>

      <div className="section-card-grid">
        {PRISM_DOCS.sections.map((s) => (
          <Link key={s.id} href={`/prism/docs/${s.id}`} className="section-card">
            <h2 className="section-card-title">{s.title}</h2>
            <p className="section-card-desc">{s.description}</p>
            <span className="section-card-count">{s.entries.length} keywords</span>
          </Link>
        ))}
      </div>

      <div className="keyword-index">
        <p className="keyword-index-label">All keywords</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PRISM_DOCS.sections.flatMap((s) =>
            s.entries.map((e) => (
              <Link
                key={e.keyword}
                href={`/prism/docs/${s.id}#entry-${e.keyword}`}
                className="keyword-chip"
              >
                {e.keyword}
              </Link>
            ))
          )}
        </div>
      </div>

      <footer className="prism-footer">
        Part of the{' '}
        <Link href="/" style={{ color: 'var(--color-primary-600)' }}>
          Mathly
        </Link>{' '}
        engine. Compiler lives at{' '}
        <code
          style={{
            fontSize: 12,
            fontFamily: 'ui-monospace, monospace',
            background: 'var(--color-neutral-100)',
            padding: '1px 5px',
            borderRadius: 4,
          }}
        >
          src/engine/lang/
        </code>
      </footer>
    </div>
  );
}
