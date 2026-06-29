export class CompileError extends Error {
  line?: number;
  col?: number;
  constructor(message: string, line?: number, col?: number) {
    const loc = line != null ? (col != null ? `line ${line}:${col}: ` : `line ${line}: `) : '';
    super(`${loc}${message}`);
    this.name = 'CompileError';
    this.line = line;
    this.col = col;
  }
}
