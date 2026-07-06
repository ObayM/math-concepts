'use client';

import { useState, useRef, useMemo } from 'react';
import { compileAny } from '@/components/prism/compileAny';
import MiniPlayer from '@/components/prism/MiniPlayer';
import Button from '@/components/admin/ui/Button';
import CodeMirrorEditor from './CodeMirrorEditor';
import AiPanel from './AiPanel';
import './mini-player-admin.css';

export default function LessonEditor({ lessonId, initialSource }) {
  const [source, setSource] = useState(initialSource);
  const [saveState, setSaveState] = useState('idle');
  const [saveError, setSaveError] = useState(null);
  const [showAi, setShowAi] = useState(true);
  const abortRef = useRef(null);

  const { lesson, error: previewError } = useMemo(() => compileAny(source), [source]);

  async function handleSave() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSaveState('saving');
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/content/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
        signal: controller.signal,
      });
      const body = await res.json();
      if (!res.ok) {
        setSaveState('error');
        setSaveError(body.detail ?? body.error ?? 'Save failed');
        return;
      }
      setSaveState('saved');
    } catch (err) {
      if (err.name === 'AbortError') return;
      setSaveState('error');
      setSaveError(String(err));
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} isLoading={saveState === 'saving'}>
            Save draft
          </Button>
          {saveState === 'saved' && (
            <span className="text-sm font-semibold text-success-600">Saved</span>
          )}
          {saveState === 'error' && (
            <span className="text-sm font-semibold text-danger-600">Save failed</span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAi((v) => !v)}>
          {showAi ? 'Just write Prism' : 'Show AI panel'}
        </Button>
      </div>

      {saveError && (
        <pre className="mb-3 whitespace-pre-wrap border border-danger-100 bg-danger-50 p-3 text-xs text-danger-700">
          {saveError}
        </pre>
      )}

      <div
        className={`grid grid-cols-1 gap-4 ${showAi ? 'lg:grid-cols-[1fr_1fr_320px]' : 'lg:grid-cols-2'}`}
      >
        <CodeMirrorEditor value={source} onChange={setSource} />
        <div className="min-w-0 border border-neutral-200 p-4">
          {previewError ? (
            <pre className="whitespace-pre-wrap text-xs text-danger-600">{previewError}</pre>
          ) : lesson ? (
            <MiniPlayer lesson={lesson} />
          ) : null}
        </div>
        {showAi && (
          <div className="min-w-0">
            <AiPanel source={source} onApply={setSource} />
          </div>
        )}
      </div>
    </div>
  );
}
