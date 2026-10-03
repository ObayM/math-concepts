import { LOCALES, type Locale } from './locale';

export const REGISTERS = ['msa-simple', 'egyptian', 'msa-formal'] as const;

export type Register = (typeof REGISTERS)[number];

const REGISTER_NOTE: Record<Register, string> = {
  'msa-simple':
    'Simple Modern Standard Arabic. Short sentences, second person, the way a confident student explains something to a friend. No classical constructions, nothing that opens like a textbook.',
  egyptian:
    'Egyptian Arabic for the conversational lines (prompts, encouragement, asides); keep the mathematical explanations themselves in simple Modern Standard Arabic so they stay readable across the region.',
  'msa-formal':
    'Standard academic Modern Standard Arabic, matching the register of an Egyptian secondary school textbook.',
};

// the language belongs to the prose only. formulas, variables, digits and every
// identifier stay exactly as they are in english lessons, which is what lets one
// engine render both.
export function authoringDirective(lang: Locale, register: Register = 'msa-simple'): string {
  if (lang === 'en') return '';
  return `
Write all learner-facing prose in Arabic: slide titles, the \`>\` lines, exercise prompts, choices, hints and explanations.
Register: ${REGISTER_NOTE[register]}
Keep ALL mathematics latin in the source: latin variable names, western numerals 0-9, standard LaTeX inside $...$. The page converts it to the book's notation (y becomes ص, sin becomes جا, digits become ٠-٩, right to left), so never write Arabic-Indic numerals, never put Arabic inside \\text{}, and never explain the notation ("your book writes y as ص"): the student already sees ص.
Every variable, point or axis letter in Arabic prose goes inside $...$, even a lone one ("على محور $y$"), or it stays latin on the page. Slide titles cannot hold math, so a title uses the Arabic letter itself ("على محور ص").
Every slide MUST carry an explicit ascii \`id:\`, because ids cannot be derived from an Arabic title and the compiler will reject the lesson without one.
Keep \`skill:\` values as the existing ascii english identifiers so mastery is shared across languages.
Scene labels stay latin too (the diagram converts them): it is a left-to-right island even on a right-to-left page.`;
}

export function isRegister(value: unknown): value is Register {
  return typeof value === 'string' && (REGISTERS as readonly string[]).includes(value);
}

export const AUTHORING_LOCALES = LOCALES;

export function stripFence(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```[^\n]*\n([\s\S]*?)\n?```$/.exec(trimmed);
  return (fenced ? fenced[1] : trimmed).trim();
}
