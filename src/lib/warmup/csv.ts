export type CsvCell = string | number | boolean | null | undefined;

const NEEDS_QUOTES = /[",\r\n]|^\s|\s$/;

export function csvCell(value: CsvCell): string {
  if (value == null) return '';
  const text = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
  if (!NEEDS_QUOTES.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(headers: readonly string[], rows: readonly CsvCell[][]): string {
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  return `${lines.join('\r\n')}\r\n`;
}
