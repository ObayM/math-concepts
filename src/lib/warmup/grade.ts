const NUMERIC = /^-?(\d+\.?\d*|\.\d+)$/;

export function normalizeAnswer(raw: unknown): string {
  let text = typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
  text = text.replace(/[−–—]/g, '-').replace(/[\s,]/g, '');
  if (text.startsWith('+')) text = text.slice(1);
  if (!NUMERIC.test(text)) return '';
  const n = Number(text);
  return Number.isFinite(n) ? String(n) : '';
}

export function gradeAnswer(question: { answer: string }, given: unknown): boolean {
  const expected = normalizeAnswer(question.answer);
  const actual = normalizeAnswer(given);
  return actual !== '' && actual === expected;
}
