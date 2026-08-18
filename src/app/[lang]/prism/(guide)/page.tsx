import Link from 'next/link';
import { PRISM_DOCS } from '@/engine/lang/docs';
import InlineMd from '@/components/prism/InlineMd';

export default function PrismPage() {
  return (
    <div className="prism-page">
      <header className="prism-hero">
        <div className="prism-hero-content">
          <p className="prism-hero-eyebrow">Mathly Engine</p>
          <h1 className="prism-hero-title">Prism</h1>
          <p className="prism-hero-tagline">{PRISM_DOCS.tagline}</p>
          <p className="prism-hero-intro">
            {PRISM_DOCS.intro.split('\n\n')[0].split('\n').join(' ')}
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

      <p className="home-label">The guide</p>
      <div className="section-card-grid">
        {PRISM_DOCS.sections.map((s, i) => (
          <Link key={s.id} href={`/prism/docs/${s.id}`} className="section-card">
            <span className="section-card-num">{String(i + 1).padStart(2, '0')}</span>
            <h2 className="section-card-title">{s.title}</h2>
            <p className="section-card-desc">
              <InlineMd text={s.description} />
            </p>
            <span className="section-card-count">{s.entries.length} keywords</span>
          </Link>
        ))}
      </div>

      <div className="keyword-index">
        <p className="keyword-index-label">All keywords</p>
        <div className="keyword-chip-row">
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
        <Link href="/" className="prism-footer-link">
          Mathly
        </Link>{' '}
        engine. Compiler lives at <code className="prism-footer-code">src/engine/lang/</code>
      </footer>
    </div>
  );
}
