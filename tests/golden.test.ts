import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { compile } from '@/engine/lang';
import { compileLesson } from '@/lib/lessons/dsl';

// these goldens are the safety net for the evaluator swap + IR v2 migration.
// if a refactor changes the compiled IR, the diff shows up here first.

const fixture = (name: string) =>
  readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8');

describe('scene compiler goldens', () => {
  for (const name of ['basics.prism', 'shapes.prism', 'logic.prism', 'timeline.prism']) {
    it(`compiles ${name} to stable IR`, () => {
      expect(compile(fixture(name))).toMatchSnapshot();
    });
  }
});

describe('lesson compiler golden', () => {
  it('compiles quadratics-1.dsl to stable lesson data', () => {
    const src = readFileSync(
      fileURLToPath(new URL('../prisma/lessons/quadratics-1.dsl', import.meta.url)),
      'utf8'
    );
    expect(compileLesson(src)).toMatchSnapshot();
  });
});
