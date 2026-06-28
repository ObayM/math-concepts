export class CompileError extends Error {
  line?: number;
  constructor(message: string, line?: number) {
    super(line != null ? `line ${line}: ${message}` : message);
    this.name = 'CompileError';
    this.line = line;
  }
}
