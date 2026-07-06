'use client';

import { useState, useMemo, useRef } from 'react';
import { compileAny } from '@/components/prism/compileAny';
import MiniPlayer from '@/components/prism/MiniPlayer';
import Button from '@/components/admin/ui/Button';
import './mini-player-admin.css';

export default function LessonSourceEditor({ lessonId, initialSource }) {
  const [source, setSource] = useState(initialSource);
  const [saveState, setSaveState] = useState('idle');
  const [saveError, setSaveError] = useState(null);
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
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div>
        <textarea
          className="h-[560px] w-full border border-neutral-300 p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={source}
          spellCheck={false}
          onChange={(e) => setSource(e.target.value)}
        />
        <div className="mt-3 flex items-center gap-3">
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
        {saveError && (
          <pre className="mt-2 whitespace-pre-wrap border border-danger-100 bg-danger-50 p-3 text-xs text-danger-700">
            {saveError}
          </pre>
        )}
      </div>
      <div className="border border-neutral-200 p-4">
        {previewError ? (
          <pre className="whitespace-pre-wrap text-xs text-danger-600">{previewError}</pre>
        ) : lesson ? (
          <MiniPlayer lesson={lesson} />
        ) : null}
      </div>
    </div>
  );
}
