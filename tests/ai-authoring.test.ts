import { describe, it, expect } from 'vitest';
import { authoringDirective, isRegister, REGISTERS } from '@/lib/ai-authoring';

describe('the arabic authoring directive', () => {
  it('says nothing for english, so the english prompt is untouched', () => {
    expect(authoringDirective('en')).toBe('');
  });

  it('demands an explicit id, which the compiler now enforces anyway', () => {
    expect(authoringDirective('ar')).toMatch(/explicit ascii `id:`/);
  });

  it('pins maths to latin and western numerals', () => {
    const d = authoringDirective('ar');
    expect(d).toMatch(/western numerals/);
    expect(d).toMatch(/Arabic-Indic/);
    expect(d).toMatch(/never put Arabic inside/);
  });

  it('keeps skill ids shared across languages', () => {
    expect(authoringDirective('ar')).toMatch(/ascii english identifiers/);
  });

  it('carries a different note per register', () => {
    const notes = REGISTERS.map((r) => authoringDirective('ar', r));
    expect(new Set(notes).size).toBe(REGISTERS.length);
    expect(authoringDirective('ar', 'egyptian')).toMatch(/Egyptian/);
    expect(authoringDirective('ar', 'msa-formal')).toMatch(/textbook/);
  });

  it('defaults to the simple register', () => {
    expect(authoringDirective('ar')).toBe(authoringDirective('ar', 'msa-simple'));
  });

  it('validates register names', () => {
    expect(isRegister('egyptian')).toBe(true);
    expect(isRegister('pirate')).toBe(false);
  });
});
