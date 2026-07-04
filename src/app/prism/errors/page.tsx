import Link from 'next/link';
import { PRISM_ERRORS } from '@/engine/lang/docs/errors';
import SyntaxPre from '@/components/prism/SyntaxPre';
import '../prism.css';
import './errors.css';

export default function ErrorsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div className="err-page">
        <header className="err-header">
          <div className="err-header-nav">
            <Link href="/prism" className="err-back-link">
              ← Docs
            </Link>
            <Link href="/prism/play" className="err-back-link">
              Playground
            </Link>
          </div>
          <h1 className="err-page-title">Error index</h1>
          <p className="err-page-sub">
            The compiler catches these at compile time — no partial lessons, no silent zeros. Each
            one below is verified: the &ldquo;bad&rdquo; source actually fails to compile, the
            &ldquo;good&rdquo; source actually compiles clean.
          </p>
        </header>

        <div className="err-list">
          {PRISM_ERRORS.map((err) => (
            <article key={err.code} id={err.code} className="err-card">
              <div className="err-card-header">
                <span className="err-code">{err.code}</span>
                <h2 className="err-title">{err.title}</h2>
              </div>
              <p className="err-explanation">{err.explanation}</p>
              <div className="err-pair">
                <div className="err-pair-col">
                  <p className="err-pair-label err-pair-label-bad">bad</p>
                  <SyntaxPre code={err.bad} />
                </div>
                <div className="err-pair-col">
                  <p className="err-pair-label err-pair-label-good">good</p>
                  <SyntaxPre code={err.good} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
