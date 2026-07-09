import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { compileLesson, CompileError } from '@/engine/lang';

export function computeMarkers(source: string, monaco: Monaco): editor.IMarkerData[] {
  try {
    compileLesson(source);
    return [];
  } catch (err) {
    if (err instanceof CompileError && err.line != null) {
      const col = err.col ?? 1;
      return [
        {
          severity: monaco.MarkerSeverity.Error,
          message: err.hint ? `${err.raw}\nhint: ${err.hint}` : err.raw,
          startLineNumber: err.line,
          startColumn: col,
          endLineNumber: err.line,
          endColumn: col + 1,
        },
      ];
    }
    const message = err instanceof Error ? err.message : String(err);
    return [
      {
        severity: monaco.MarkerSeverity.Error,
        message,
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 2,
      },
    ];
  }
}
