'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { compileAny } from '@/components/prism/compileAny';
import MiniPlayer from '@/components/prism/MiniPlayer';
import Button from '@/components/admin/ui/Button';
import MonacoPrismEditor from './MonacoPrismEditor';
import ProblemsPanel from './ProblemsPanel';
import AiPanel from './AiPanel';
import RecentLessonTabs from './RecentLessonTabs';
import LessonSwitcher from './LessonSwitcher';
import './mini-player-admin.css';

const vSeparator =
  'w-1.5 shrink-0 cursor-col-resize bg-neutral-200 transition-colors hover:bg-primary-300 active:bg-primary-400';
const hSeparator =
  'h-1.5 shrink-0 cursor-row-resize bg-neutral-200 transition-colors hover:bg-primary-300 active:bg-primary-400';

export default function LessonEditor({ lessonId, title, initialSource }) {
  const [source, setSource] = useState(initialSource);
  const [saveState, setSaveState] = useState('idle');
  const [saveError, setSaveError] = useState(null);
  const [showAi, setShowAi] = useState(true);
  const [diagnostics, setDiagnostics] = useState([]);
  const abortRef = useRef(null);
  const editorApiRef = useRef(null);

  const { lesson, error: previewError } = useMemo(() => compileAny(source), [source]);

  const handleEditorReady = useCallback((editor, monaco) => {
    editorApiRef.current = { editor, monaco };
  }, []);

  function jumpToLine(line, col) {
    const api = editorApiRef.current;
    if (!api) return;
    api.editor.revealLineInCenter(line);
    api.editor.setPosition({ lineNumber: line, column: col });
    api.editor.focus();
  }

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
      <RecentLessonTabs lessonId={lessonId} title={title} />
      <LessonSwitcher currentLessonId={lessonId} />
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} isLoading={saveState === 'saving'}>
            Save draft
          </Button>
          <span className="text-xs text-neutral-400">
            Ctrl/Cmd+S · Ctrl/Cmd+K to switch lessons
          </span>
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

      <div className="h-[78vh]">
        <Group orientation="horizontal" className="h-full">
          <Panel defaultSize={showAi ? 55 : 65} minSize={30}>
            <Group orientation="vertical" className="h-full">
              <Panel defaultSize={75} minSize={30}>
                <MonacoPrismEditor
                  value={source}
                  onChange={setSource}
                  onDiagnostics={setDiagnostics}
                  onSave={handleSave}
                  onEditorReady={handleEditorReady}
                  className="h-full"
                />
              </Panel>
              <Separator className={hSeparator} />
              <Panel defaultSize={25} minSize={10} collapsible collapsedSize={0}>
                <ProblemsPanel diagnostics={diagnostics} onJump={jumpToLine} />
              </Panel>
            </Group>
          </Panel>
          <Separator className={vSeparator} />
          <Panel defaultSize={showAi ? 25 : 35} minSize={15} collapsible collapsedSize={0}>
            <div className="h-full min-w-0 overflow-auto border border-neutral-200 p-4">
              {previewError ? (
                <pre className="whitespace-pre-wrap text-xs text-danger-600">{previewError}</pre>
              ) : lesson ? (
                <MiniPlayer lesson={lesson} />
              ) : null}
            </div>
          </Panel>
          {showAi && (
            <>
              <Separator className={vSeparator} />
              <Panel defaultSize={20} minSize={12} collapsible collapsedSize={0}>
                <div className="h-full min-w-0 overflow-auto">
                  <AiPanel source={source} onApply={setSource} />
                </div>
              </Panel>
            </>
          )}
        </Group>
      </div>
    </div>
  );
}
