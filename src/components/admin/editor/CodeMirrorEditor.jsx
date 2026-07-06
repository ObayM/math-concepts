'use client';

import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { indentOnInput, bracketMatching } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { lintKeymap, lintGutter } from '@codemirror/lint';
import { prismLanguage } from './prismLanguage';
import { prismHighlighting } from './prismHighlight';
import { prismLinter } from './prismLinter';
import { prismAutocomplete } from './prismAutocomplete';

const theme = EditorView.theme({
  '&': { fontSize: '13px', height: '560px' },
  '.cm-scroller': { fontFamily: 'var(--font-mono, monospace)', overflow: 'auto' },
  '.cm-gutters': { backgroundColor: 'white', borderRight: '1px solid var(--color-neutral-200)' },
});

export default function CodeMirrorEditor({ value, onChange, className = '' }) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        EditorView.lineWrapping,
        history(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        lintGutter(),
        prismLanguage,
        prismHighlighting,
        prismLinter,
        prismAutocomplete,
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...completionKeymap,
          ...lintKeymap,
        ]),
        theme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className={`min-w-0 border border-neutral-300 ${className}`} />;
}
