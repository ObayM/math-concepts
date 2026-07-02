import { describe, it, expect } from 'vitest';
import { compile } from '@/engine/lang';
import { CompileError } from '@/engine/lang/errors';
import { compileLesson } from '@/lib/lessons/dsl';

// error table: every case should throw a CompileError with a useful message.
// i snapshot the messages so error *quality* regressions show up in review.

const sceneCases: Record<string, string> = {
  'empty source': '',
  'no scene root': 'curve f = x^2',
  'unknown space type': 'scene banana {\n  x: [-1, 1]\n  y: [-1, 1]\n}',
  'unclosed brace': 'scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  curve f = x^2 { color: primary',
  'point missing y coord': 'scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  point p = (1)\n}',
  'unknown statement keyword': 'scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  wobble p = 3\n}',
  'bad expression': 'scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  curve f = x^^2\n}',
  'range with no args':
    'scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  for i in range() {\n    point f"p{i}" = (i, 0)\n  }\n}',
  'call to undefined macro': 'scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  tick(1, 0.2)\n}',
  'bad identifier': 'scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  param 3x = 1\n}',
  'missing y domain on plane': 'scene plane {\n  x: [-1, 1]\n  curve f = x^2\n}',
};

const lessonCases: Record<string, string> = {
  'quiz without correct option': '@quiz title="q"\nWhich one?\n- nope\n- also nope',
  'build without bank': '@build title="b"\nanswer: x + 2',
  'unknown block type': '@wat title="huh"\nsome text',
};

describe('scene compile errors', () => {
  for (const [name, src] of Object.entries(sceneCases)) {
    it(name, () => {
      let err: unknown;
      try {
        compile(src);
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(CompileError);
      expect((err as CompileError).message).toMatchSnapshot();
    });
  }
});

describe('current silent failures (characterized, should become errors in P0.4)', () => {
  it('a string in a numeric slot silently compiles to 0 (known bug)', () => {
    const ir = compile('scene plane {\n  x: [-1, "a"]\n  y: [-1, 1]\n}');
    expect(ir.space.xDomain).toEqual([-1, 0]);
  });
});

describe('lesson compile errors', () => {
  for (const [name, src] of Object.entries(lessonCases)) {
    it(name, () => {
      let err: unknown;
      try {
        compileLesson(src);
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(CompileError);
      expect((err as CompileError).message).toMatchSnapshot();
    });
  }
});
