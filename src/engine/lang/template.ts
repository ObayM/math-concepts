import { CompileError } from './errors';

export type TemplateSeg = { text: string } | { slot: true };

const SLOT_MIN = 3;

function mathSpanEnd(src: string, i: number): number {
  const display = src.startsWith('$$', i);
  const delim = display ? '$$' : '$';
  const close = src.indexOf(delim, i + delim.length);
  if (close === -1) return -1;
  return close + delim.length;
}

export function splitTemplate(src: string, ln: number): TemplateSeg[] {
  const out: TemplateSeg[] = [];
  let buf = '';
  let i = 0;

  const flush = () => {
    if (buf) out.push({ text: buf });
    buf = '';
  };

  while (i < src.length) {
    const ch = src[i];

    if (ch === '$') {
      const end = mathSpanEnd(src, i);
      if (end === -1) {
        throw new CompileError(
          'unbalanced $ in template — every $...$ math span must be closed',
          ln
        );
      }
      buf += src.slice(i, end);
      i = end;
      continue;
    }

    if (ch === '_') {
      let j = i;
      while (src[j] === '_') j++;
      if (j - i >= SLOT_MIN) {
        flush();
        out.push({ slot: true });
      } else {
        buf += src.slice(i, j);
      }
      i = j;
      continue;
    }

    buf += ch;
    i++;
  }

  flush();
  return out;
}

export function countSlots(segs: TemplateSeg[]): number {
  return segs.filter((s) => 'slot' in s).length;
}
