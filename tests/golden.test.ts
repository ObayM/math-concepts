import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { compile, compileLesson } from '@/engine/lang';

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

describe('unified Prism lesson grammar (v2)', () => {
  it('compiles lesson.prism to a stable Lesson IR', () => {
    expect(compileLesson(fixture('lesson.prism'))).toMatchSnapshot();
  });
});
