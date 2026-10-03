import { LETTERS, indicDigits } from './notation';

const LRI = '⁦';
const RLI = '⁧';
const PDI = '⁩';

const MATHISH = /^[A-Za-z0-9\s().,+\-=′'/[\]|]+$/;

// svg <text> takes no markup, so direction comes from unicode isolates: the
// label reads right to left as a unit while the scene keeps its ltr anchors,
// and each signed number is its own ltr run so its minus stays in front
export function arabicSceneText(s: string): string {
  if (!MATHISH.test(s) || !/[A-Za-z0-9]/.test(s)) return s;
  const words = s.match(/[A-Za-z]+/g) ?? [];
  if (words.some((w) => w.length > 1 && w !== w.toUpperCase())) return s;
  const out = s
    .replace(/[A-Za-z]/g, (l) => LETTERS[l] ?? l)
    .replace(/,/g, '،')
    .replace(/-?\d+(?:\.\d+)?/g, (n) => LRI + indicDigits(n.replace('-', '−')) + PDI);
  return RLI + out + PDI;
}

export const AXIS_NAMES: Record<string, string> = { x: 'س', y: 'ص', z: 'ع' };
