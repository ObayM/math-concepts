export class CompileError extends Error {
  line?: number;
  col?: number;
  raw: string; // message without the "line X:Y:" prefix
  hint?: string;
  constructor(message: string, line?: number, col?: number, hint?: string) {
    const loc = line != null ? (col != null ? `line ${line}:${col}: ` : `line ${line}: `) : '';
    super(`${loc}${message}`);
    this.name = 'CompileError';
    this.line = line;
    this.col = col;
    this.raw = message;
    this.hint = hint;
  }
}

// a 3-line caret frame pointing at the offending source, e.g.
//
//   3 |   curve f = x^^2
//     |             ^
//   line 3:13: unexpected token "^"
//
// falls back to just the message when there's no line info.
export function formatCompileError(source: string, err: CompileError): string {
  if (err.line == null) return err.message;
  const lines = source.split('\n');
  const src = lines[err.line - 1] ?? '';
  const gutter = String(err.line);
  const pad = ' '.repeat(gutter.length);
  const out = [`${gutter} | ${src}`];
  if (err.col != null) {
    out.push(`${pad} | ${' '.repeat(Math.max(0, err.col - 1))}^`);
  }
  out.push(`${pad} | ${err.message}`);
  if (err.hint) out.push(`${pad} | hint: ${err.hint}`);
  return out.join('\n');
}
