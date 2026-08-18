'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { compileAny } from '@/components/prism/compileAny';
import MiniPlayer from '@/components/prism/MiniPlayer';
import '../prism.css';
import './play.css';

const STARTER = `scene plane {
  x: [-5, 5]
  y: [-5, 5]
  grid
  axes

  param a = 1 { range: [-3, 3], step: 0.1 }
  curve f = a*x^2 { color: primary }
  slider a { label: "a" }
}`;

function encode(src: string): string {
  return btoa(encodeURIComponent(src));
}

function decode(hash: string): string | null {
  try {
    return decodeURIComponent(atob(hash));
  } catch {
    return null;
  }
}

export default function PlayPage() {
  const [source, setSource] = useState(STARTER);
  const [debounced, setDebounced] = useState(STARTER);
  const [copied, setCopied] = useState(false);
  const loaded = useRef(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const decoded = decode(hash);
      if (decoded) setSource(decoded);
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(source), 300);
    return () => clearTimeout(id);
  }, [source]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const { lesson, error } = useMemo(() => compileAny(debounced), [debounced]);

  const share = useCallback(() => {
    window.history.replaceState(null, '', `#${encode(source)}`);
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [source]);

  return (
    <div className="play-root">
      <div className="play-bar">
        <Link href="/prism" className="play-back-link">
          ← Docs
        </Link>
        <span className="play-title">Prism Playground</span>
        <button className="play-share-btn" onClick={share}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
      <div className="play-body">
        <textarea
          className="play-editor"
          value={source}
          spellCheck={false}
          onChange={(e) => setSource(e.target.value)}
        />
        <div className="play-preview">
          {error ? (
            <pre className="live-snippet-error">{error}</pre>
          ) : lesson ? (
            <MiniPlayer lesson={lesson} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
