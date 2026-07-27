'use client';

import { useRef, useCallback, useEffect } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monacoEditor from 'monaco-editor';
import { configurePrismLanguage } from './monaco/configurePrismLanguage';
import { computeMarkers } from './monaco/prismMarkers';

// without this @monaco-editor/react fetches monaco from jsdelivr at runtime,
// which makes the whole editor dead offline or behind a CDN block.
loader.config({ monaco: monacoEditor });

export default function MonacoPrismEditor({
  value,
  onChange,
  onDiagnostics,
  onSave,
  onEditorReady,
  className = '',
}) {
  const monacoRef = useRef(null);
  const editorRef = useRef(null);
  const debounceRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onDiagnosticsRef = useRef(onDiagnostics);
  const onSaveRef = useRef(onSave);
  const onEditorReadyRef = useRef(onEditorReady);

  useEffect(() => {
    onChangeRef.current = onChange;
    onDiagnosticsRef.current = onDiagnostics;
    onSaveRef.current = onSave;
    onEditorReadyRef.current = onEditorReady;
  }, [onChange, onDiagnostics, onSave, onEditorReady]);

  const runMarkers = useCallback((source) => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;
    const model = editor.getModel();
    if (!model) return;
    monaco.editor.setModelMarkers(model, 'prism', computeMarkers(source, monaco));
  }, []);

  function handleBeforeMount(monaco) {
    monacoRef.current = monaco;
    configurePrismLanguage(monaco);
  }

  function handleMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSaveRef.current?.();
    });
    runMarkers(editor.getValue());
    onEditorReadyRef.current?.(editor, monaco);
  }

  function handleChange(newValue) {
    const source = newValue ?? '';
    onChangeRef.current?.(source);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runMarkers(source), 300);
  }

  function handleValidate(markers) {
    onDiagnosticsRef.current?.(markers);
  }

  return (
    <div className={`min-w-0 h-full border border-neutral-300 ${className}`}>
      <Editor
        height="100%"
        defaultLanguage="prism"
        theme="vs-dark"
        value={value}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        onChange={handleChange}
        onValidate={handleValidate}
        options={{
          fontSize: 13,
          fontFamily: 'var(--font-mono, monospace)',
          minimap: { enabled: false },
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
