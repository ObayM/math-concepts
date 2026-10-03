import { LETTERS, indicDigits } from './notation';

const RLI = '\u2067';
const PDI = '\u2069';

const MATHISH = /^[A-Za-z0-9\s().,+\-=′'/[\]|°\u0370-\u03ff]+$/;
const ARABIC = /\p{Script=Arabic}/u;
const NUMBER = /-?\d+(?:\.\d+)?/g;

// svg <text> takes no markup, so direction comes from unicode isolates: the
// label reads right to left as a unit inside the ltr scene, and each signed
// number is its own run so a minus lands on its reading side, as in the math
const number = (n: string) => RLI + indicDigits(n.replace('-', '−')) + PDI;

export function arabicSceneText(s: string): string {
  if (!/[0-9]/.test(s) && !/[A-Za-z]/.test(s)) return s;
  if (ARABIC.test(s)) return /[0-9]/.test(s) ? RLI + s.replace(NUMBER, number) + PDI : s;
  if (!MATHISH.test(s)) return s;
  const words = s.match(/[A-Za-z]+/g) ?? [];
  if (words.some((w) => w.length > 1 && w !== w.toUpperCase())) return s;
  const out = s
    .replace(/[A-Za-z]/g, (l) => LETTERS[l] ?? l)
    .replace(/,/g, '،')
    .replace(NUMBER, number);
  return RLI + out + PDI;
}

export const AXIS_NAMES: Record<string, string> = { x: 'س', y: 'ص', z: 'ع' };
