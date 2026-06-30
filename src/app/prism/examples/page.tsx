'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { compile, Scene } from '@/engine';
import type { SceneIR } from '@/engine/ir/types';
import { EXAMPLES } from './examples-data';
import '../prism.css';
import './examples.css';

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
      const ci = line.indexOf('#');
      const main = ci === -1 ? line : line.slice(0, ci);
      const cmt = ci === -1 ? '' : line.slice(ci);
      const h = main.replace(
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
      return cmt ? `${h}<span class="tok-cmt">${cmt}</span>` : h;
    })
    .join('\n');
}

function ExampleCard({ example }: { example: (typeof EXAMPLES)[number] }) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const { ir, err } = useMemo(() => {
    try {
      return { ir: compile(example.code), err: null };
    } catch (e: unknown) {
      return { ir: null, err: e instanceof Error ? e.message : String(e) };
    }
  }, [example.code]);

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
        <Link href="/dsl-preview" className="ex-open-btn">
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
        </div>

        <div className={`ex-pane ${tab === 'preview' ? 'active' : ''}`}>
          <div className="ex-preview-bg">
            {err ? (
              <p className="text-xs font-mono text-red-500 p-4">{err}</p>
            ) : ir ? (
              <Scene ir={ir} />
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
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div className="ex-page">
        <header className="ex-header">
          <div className="ex-header-nav">
            <Link href="/prism" className="ex-back-link">
              ← Docs
            </Link>
            <Link href="/dsl-preview" className="ex-back-link">
              Playground
            </Link>
          </div>
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
