import { describe, it, expect } from 'vitest';
import { csvCell, toCsv } from '@/lib/warmup/csv';

describe('csvCell', () => {
  it('leaves a plain value alone', () => {
    expect(csvCell('56')).toBe('56');
    expect(csvCell(56)).toBe('56');
    expect(csvCell(-7)).toBe('-7');
  });

  it('renders blanks for null and undefined', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('renders booleans as words', () => {
    expect(csvCell(true)).toBe('true');
    expect(csvCell(false)).toBe('false');
  });

  it('quotes a value containing a comma', () => {
    expect(csvCell('9 × 6, then subtract')).toBe('"9 × 6, then subtract"');
  });

  it('doubles internal quotes', () => {
    expect(csvCell('he said "56"')).toBe('"he said ""56"""');
  });

  it('quotes newlines so a cell cannot break the row', () => {
    expect(csvCell('one\ntwo')).toBe('"one\ntwo"');
    expect(csvCell('one\r\ntwo')).toBe('"one\r\ntwo"');
  });

  it('quotes leading and trailing whitespace so it survives the round trip', () => {
    expect(csvCell(' 56')).toBe('" 56"');
    expect(csvCell('56 ')).toBe('"56 "');
  });
});

describe('toCsv', () => {
  it('writes a header row even with no data', () => {
    expect(toCsv(['a', 'b'], [])).toBe('a,b\r\n');
  });

  it('writes CRLF-terminated rows', () => {
    expect(
      toCsv(
        ['a', 'b'],
        [
          [1, 2],
          [3, 4],
        ]
      )
    ).toBe('a,b\r\n1,2\r\n3,4\r\n');
  });

  it('escapes header names too', () => {
    expect(toCsv(['pace, ms'], [])).toBe('"pace, ms"\r\n');
  });

  it('survives a row of prompts, verdicts and blanks together', () => {
    const csv = toCsv(
      ['prompt', 'answer', 'given', 'correct', 'ms'],
      [
        ['7 × 8', '56', '56', true, 1420],
        ['-7 × 3', '-21', null, false, 4100],
        ['25% of 36', '9', 'he said "9"', false, 2200],
      ]
    );
    const lines = csv.trimEnd().split('\r\n');
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe('7 × 8,56,56,true,1420');
    expect(lines[2]).toBe('-7 × 3,-21,,false,4100');
    expect(lines[3]).toBe('25% of 36,9,"he said ""9""",false,2200');
  });
});
