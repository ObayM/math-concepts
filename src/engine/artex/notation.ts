export const LETTERS: Record<string, string> = {
  x: 'س',
  y: 'ص',
  z: 'ع',
  t: 'ن',
  u: 'ع',
  f: 'د',
  g: 'ر',
  h: 'هـ',
  k: 'ك',
  a: 'أ',
  b: 'ب',
  c: 'جـ',
  d: 'ء',
  e: 'هـ',
  l: 'ل',
  m: 'م',
  n: 'ن',
  r: 'نق',
  A: 'أ',
  B: 'ب',
  C: 'جـ',
  D: 'ء',
  E: 'هـ',
  F: 'ق',
  H: 'ح',
  K: 'ك',
  L: 'ل',
  M: 'م',
  N: 'ن',
  O: 'و',
  R: 'ر',
  V: 'ح',
};

export const UNIT_VECTORS: Record<string, string> = { i: 'س', j: 'ص', k: 'ع' };
export const UNIT_VECTOR_OTHER = 'ى';

export const BLACKBOARD: Record<string, string> = { R: 'ح', Z: 'ص', N: 'ط' };

export const OPERATORS: Record<string, string> = {
  '\\sin': 'جا',
  '\\cos': 'جتا',
  '\\tan': 'ظا',
  '\\cot': 'ظتا',
  '\\sec': 'قا',
  '\\csc': 'قتا',
  '\\lim': 'نها',
  '\\log': 'لو',
  '\\ln': 'لوهـ',
};

export const SYMBOL_LETTERS: Record<string, string> = { '\\pi': 'ط' };

const INDIC = '٠١٢٣٤٥٦٧٨٩';

export function indicDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => INDIC[Number(d)]).replace(/(?<=[٠-٩])\.(?=[٠-٩])/g, '٫');
}

export function arabicLetter(latin: string): string {
  return LETTERS[latin] ?? latin;
}
