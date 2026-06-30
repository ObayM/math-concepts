'use client';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { PRISM_DOCS } from '@/engine/lang/docs';
import type { DocEntry, DocSection } from '@/engine/lang/docs';
import { compile, Scene } from '@/engine';
import type { SceneIR } from '@/engine/ir/types';
import './prism.css';

const KEYWORDS = new Set([
  'scene',
  'param',
  'bool',
  'curve',
  'point',
  'line',
  'label',
  'rect',
  'circle',
  'polygon',
  'vector',
  'arc',
  'slider',
  'toggle',
  'stepper',
  'button',
  'step',
  'for',
  'in',
  'range',
  'if',
  'elif',
  'else',
  'let',
  'def',
  'through',
  'show',
  'drag',
  'grid',
  'axes',
  'tex',
  'set',
  'animate',
  'ease',
  'dur',
  'opacity',
  'style',
  'color',
  'width',
  'min',
  'max',
  'step',
  'true',
  'false',
]);

const MATH_FNS = new Set([
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'sinh',
  'cosh',
  'tanh',
  'sqrt',
  'cbrt',
  'abs',
  'log',
  'log2',
  'log10',
  'exp',
  'floor',
  'ceil',
  'round',
  'sign',
  'pow',
  'hypot',
  'PI',
  'E',
]);

function highlight(code: string): string {
  return code
    .split('\n')
    .map((line) => {
      const commentIdx = line.indexOf('#');
      const main = commentIdx === -1 ? line : line.slice(0, commentIdx);
      const comment = commentIdx === -1 ? '' : line.slice(commentIdx);

      const highlighted = main.replace(
        /("(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?\b)|([+\-*/^%]|->|>=|<=|==|!=|[=><!])|([()[\]{},])|(\b[a-zA-Z_][a-zA-Z0-9_]*\b)/g,
        (_, str, num, op, punc, word) => {
          if (str) return `<span class="tok-str">${str}</span>`;
          if (num) return `<span class="tok-num">${num}</span>`;
          if (op) return `<span class="tok-op">${op}</span>`;
          if (punc) return `<span class="tok-punc">${punc}</span>`;
          if (word) {
            if (KEYWORDS.has(word)) return `<span class="tok-kw">${word}</span>`;
            if (MATH_FNS.has(word)) return `<span class="tok-fn">${word}</span>`;
            return `<span class="tok-id">${word}</span>`;
          }
          return _;
        }
      );

      return comment ? `${highlighted}<span class="tok-cmt">${comment}</span>` : highlighted;
    })
    .join('\n');
}

function SyntaxPre({ code, className = '' }: { code: string; className?: string }) {
  return (
    <pre
      className={`prism-pre syntax ${className}`}
      dangerouslySetInnerHTML={{ __html: highlight(code) }}
    />
  );
}

function CodePreview({ code }: { code: string }) {
  const [tab, setTab] = useState<'code' | 'preview'>('code');
  const { ir, err } = useMemo(() => {
    try {
      return { ir: compile(code), err: null };
    } catch (e: unknown) {
      return { ir: null, err: e instanceof Error ? e.message : String(e) };
    }
  }, [code]);

  return (
    <div className="code-preview">
      <div className="code-preview-tabs">
        <button
          className={`code-preview-tab ${tab === 'code' ? 'active' : ''}`}
          onClick={() => setTab('code')}
        >
          Code
        </button>
        <button
          className={`code-preview-tab ${tab === 'preview' ? 'active' : ''}`}
          onClick={() => setTab('preview')}
        >
          Preview ↗
        </button>
      </div>

      <div className={`code-preview-pane ${tab === 'code' ? 'active' : ''}`}>
        <SyntaxPre code={code} />
      </div>

      <div className={`code-preview-pane ${tab === 'preview' ? 'active' : ''}`}>
        <div className="code-preview-scene">
          {err ? (
            <p className="text-xs font-mono text-red-500 py-2">{err}</p>
          ) : ir ? (
            <Scene ir={ir} />
          ) : (
            <p className="text-xs text-neutral-400 py-4 text-center">compiling…</p>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const hasFullScene = entry.example?.trimStart().startsWith('scene') ?? false;

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
          {hasFullScene ? (
            <CodePreview code={entry.example} />
          ) : (
            <div className="code-preview">
              <SyntaxPre code={entry.example} />
            </div>
          )}
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
          <Link href="/dsl-preview" className="sidebar-footer-link">
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
            Live playground
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
              <Link href="/dsl-preview" className="hero-cta-primary">
                Open playground →
              </Link>
              <Link href="/prism/examples" className="hero-cta-secondary">
                View examples
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
