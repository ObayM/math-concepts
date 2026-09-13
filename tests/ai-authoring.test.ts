import { describe, it, expect } from 'vitest';
import { authoringDirective, isRegister, REGISTERS, stripFence } from '@/lib/ai-authoring';

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

describe('stripping the markdown fence a model wraps its source in', () => {
  it('unwraps a tagged fence', () => {
    expect(stripFence('```prism\nlesson "A" {}\n```')).toBe('lesson "A" {}');
  });

  it('unwraps a bare fence', () => {
    expect(stripFence('```\nscene {}\n```')).toBe('scene {}');
  });

  it('survives the chatter models put around the fence', () => {
    expect(stripFence('  \n```prism\nscene {}\n```  \n')).toBe('scene {}');
  });

  it('leaves unfenced source alone', () => {
    expect(stripFence('lesson "A" {\n  slide "B" {}\n}')).toBe('lesson "A" {\n  slide "B" {}\n}');
  });

  it('keeps backticks that are part of the source', () => {
    expect(stripFence('scene {\n  label "a ``b`` c"\n}')).toBe('scene {\n  label "a ``b`` c"\n}');
  });
});
