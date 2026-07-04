'use client';
import { useState, useMemo } from 'react';
import { compileAny } from './compileAny';
import MiniPlayer from './MiniPlayer';

// client-compiled, editable code sample: a Code tab (plain textarea — edits
// recompile live) and a Preview tab (MiniPlayer over whatever the source
// compiles to). used across /prism reference, /prism/cookbook, /prism/play.
export default function LiveSnippet({ code: initialCode }: { code: string }) {
  const [code, setCode] = useState(initialCode);
  const [tab, setTab] = useState<'code' | 'preview'>('code');
  const { lesson, error } = useMemo(() => compileAny(code), [code]);

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
        <textarea
          className="live-snippet-editor"
          value={code}
          spellCheck={false}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>

      <div className={`code-preview-pane ${tab === 'preview' ? 'active' : ''}`}>
        <div className="code-preview-scene">
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
