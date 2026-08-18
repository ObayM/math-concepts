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
Keep ALL mathematics latin and left-to-right: latin variable names, western numerals 0-9, standard LaTeX inside $...$. Never use Arabic-Indic numerals and never put Arabic inside \\text{} (the math font has no Arabic glyphs).
Every slide MUST carry an explicit ascii \`id:\`, because ids cannot be derived from an Arabic title and the compiler will reject the lesson without one.
Keep \`skill:\` values as the existing ascii english identifiers so mastery is shared across languages.
Scene labels stay latin: the diagram is a left-to-right island even on a right-to-left page.`;
}

export function isRegister(value: unknown): value is Register {
  return typeof value === 'string' && (REGISTERS as readonly string[]).includes(value);
}

export const AUTHORING_LOCALES = LOCALES;
