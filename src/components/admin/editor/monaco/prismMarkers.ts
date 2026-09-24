import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { compileLesson, slideLines, CompileError } from '@/engine/lang';
import { verifyLesson } from '@/engine/verify';

function at(
  monaco: Monaco,
  severity: number,
  message: string,
  line: number,
  col = 1,
  code?: string
): editor.IMarkerData {
  return {
    severity,
    message,
    code,
    startLineNumber: line,
    startColumn: col,
    endLineNumber: line,
    endColumn: col + 1,
  };
}

export function computeMarkers(source: string, monaco: Monaco): editor.IMarkerData[] {
  let lesson;
  try {
    lesson = compileLesson(source);
  } catch (err) {
    if (err instanceof CompileError && err.line != null) {
      const message = err.hint ? `${err.raw}\nhint: ${err.hint}` : err.raw;
      return [at(monaco, monaco.MarkerSeverity.Error, message, err.line, err.col ?? 1)];
    }
    const message = err instanceof Error ? err.message : String(err);
    return [at(monaco, monaco.MarkerSeverity.Error, message, 1)];
  }

  const findings = verifyLesson(lesson);
  if (!findings.length) return [];

  const lines = slideLines(source);
  return findings.map((f) =>
    at(
      monaco,
      f.severity === 'warning' ? monaco.MarkerSeverity.Info : monaco.MarkerSeverity.Warning,
      f.message,
      lines.get(f.slideId) ?? 1,
      1,
      f.code
    )
  );
}
