import { linter } from '@codemirror/lint';
import type { Diagnostic } from '@codemirror/lint';
import type { EditorView } from '@codemirror/view';
import { compileLesson, CompileError } from '@/engine/lang';

export const prismLinter = linter(
  (view: EditorView): Diagnostic[] => {
    const source = view.state.doc.toString();
    try {
      compileLesson(source);
      return [];
    } catch (err) {
      const doc = view.state.doc;
      if (err instanceof CompileError && err.line != null) {
        const lineNo = Math.min(Math.max(err.line, 1), doc.lines);
        const line = doc.line(lineNo);
        const from = Math.min(line.from + Math.max((err.col ?? 1) - 1, 0), line.to);
        const to = Math.max(from, Math.min(from + 1, line.to));
        return [
          {
            from,
            to,
            severity: 'error',
            message: err.hint ? `${err.raw}\nhint: ${err.hint}` : err.raw,
          },
        ];
      }
      const message = err instanceof Error ? err.message : String(err);
      return [{ from: 0, to: 0, severity: 'error', message }];
    }
  },
  { delay: 300 }
);
