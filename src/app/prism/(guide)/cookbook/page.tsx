'use client';
import { PRISM_COOKBOOK } from '@/engine/lang/docs/cookbook';
import LiveSnippet from '@/components/prism/LiveSnippet';
import './cookbook.css';

export default function CookbookPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div className="cb-page">
        <header className="cb-header">
          <h1 className="cb-page-title">Cookbook</h1>
          <p className="cb-page-sub">
            Six pedagogical patterns, each a full runnable lesson. These are the shapes worth
            reaching for when authoring a slide — predict-then-reveal, build-the-thing, and so on —
            not just syntax reference. Edit any one right here.
          </p>
        </header>

        <div className="cb-list">
          {PRISM_COOKBOOK.map((entry) => (
            <section key={entry.id} id={entry.id} className="cb-entry">
              <h2 className="cb-entry-title">{entry.title}</h2>
              <p className="cb-entry-desc">{entry.description}</p>
              <LiveSnippet code={entry.source} />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
