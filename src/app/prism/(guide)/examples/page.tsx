'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { compile, Scene } from '@/engine';
import type { SceneIR } from '@/engine/ir/types';
import { highlight } from '@/components/prism/SyntaxPre';
import { EXAMPLES } from './examples-data';
import './examples.css';

function ExampleCard({ example }: { example: (typeof EXAMPLES)[number] }) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [revealed, setRevealed] = useState(false);
  const { ir, err } = useMemo(() => {
    try {
      return { ir: compile(example.code), err: null };
    } catch (e: unknown) {
      return { ir: null, err: e instanceof Error ? e.message : String(e) };
    }
  }, [example.code]);
  const playHref = `/prism/play#${btoa(encodeURIComponent(example.code))}`;

  return (
    <article className="ex-card">
      <div className="ex-card-header">
        <div>
          <h2 className="ex-card-title">{example.title}</h2>
          <p className="ex-card-desc">{example.description}</p>
          <div className="ex-tag-row">
            {example.tags.map((t) => (
              <span key={t} className="ex-tag">
                {t}
              </span>
            ))}
          </div>
        </div>
        <Link href={playHref} className="ex-open-btn">
          Open in playground →
        </Link>
      </div>

      <div className="ex-card-body">
        <div className="ex-tabs">
          <button
            className={`ex-tab ${tab === 'preview' ? 'active' : ''}`}
            onClick={() => setTab('preview')}
          >
            Preview
          </button>
          <button
            className={`ex-tab ${tab === 'code' ? 'active' : ''}`}
            onClick={() => setTab('code')}
          >
            Code
          </button>
          {example.hasReveal && tab === 'preview' && (
            <button
              className={`ex-reveal-btn ${revealed ? 'active' : ''}`}
              onClick={() => setRevealed((r) => !r)}
            >
              {revealed ? '✓ Revealed' : 'Reveal'}
            </button>
          )}
        </div>

        <div className={`ex-pane ${tab === 'preview' ? 'active' : ''}`}>
          <div className="ex-preview-bg">
            {err ? (
              <p className="text-xs font-mono text-red-500 p-4">{err}</p>
            ) : ir ? (
              <Scene ir={ir} revealed={revealed} />
            ) : (
              <p className="text-sm text-neutral-400 text-center py-8">Loading…</p>
            )}
          </div>
        </div>

        <div className={`ex-pane ${tab === 'code' ? 'active' : ''}`}>
          <pre
            className="prism-pre"
            style={{ borderRadius: 0, margin: 0 }}
            dangerouslySetInnerHTML={{ __html: highlight(example.code) }}
          />
        </div>
      </div>
    </article>
  );
}

export default function ExamplesPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="ex-page">
        <header className="ex-header">
          <h1 className="ex-page-title">Examples</h1>
          <p className="ex-page-sub">
            Real Prism scenes — source + live output side by side. Click any card to open it in the
            playground.
          </p>
        </header>

        <div className="ex-grid">
          {EXAMPLES.map((ex) => (
            <ExampleCard key={ex.id} example={ex} />
          ))}
        </div>
      </div>
    </div>
  );
}
