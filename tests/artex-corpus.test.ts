import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { compileLesson } from '@/engine/lang';
import { MEMORY_REF } from '@/engine/runtime/memory';
import { arabicMath, collisions } from '@/engine/artex';

const LATIN_ALLOWED = new Set(['P', 'Q', 'p', 'q', 's', 'v', 'w', 'o', 'i']);

const dir = new URL('../prisma/lessons/', import.meta.url);
const files = readdirSync(dir).filter((f) => /^ar-.*\.prism$/.test(f));

function formulas(v: unknown, out: string[]): string[] {
  if (typeof v === 'string') {
    const text = v.replace(MEMORY_REF, (_, _fn, _name, fallback?: string) => fallback ?? '');
    for (const m of text.matchAll(/\$\$([^$]+)\$\$|\$([^$]+)\$/g)) out.push(m[1] ?? m[2]);
  } else if (Array.isArray(v)) v.forEach((x) => formulas(x, out));
  else if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (o.tex === true && typeof o.text === 'string') out.push(o.text);
    else for (const k of Object.keys(o)) formulas(o[k], out);
  }
  return out;
}

describe('every formula in the arabic courses renders as arabic math', () => {
  it('finds the arabic lessons', () => expect(files.length).toBeGreaterThanOrEqual(9));

  for (const file of files) {
    it(file, () => {
      const lesson = compileLesson(readFileSync(new URL(file, dir), 'utf8'));
      const problems: string[] = [];
      for (const tex of formulas(lesson, [])) {
        const r = arabicMath(tex, false);
        if (r.fallback) problems.push(`falls back: ${tex}`);
        for (const [ar, latin] of collisions(r.report))
          problems.push(`${latin.join(' and ')} both become ${ar}: ${tex}`);
        for (const l of r.report.latin)
          if (!LATIN_ALLOWED.has(l)) problems.push(`no arabic letter for ${l}: ${tex}`);
      }
      expect(problems).toEqual([]);
    });
  }
});
