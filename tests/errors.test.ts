import { describe, it, expect } from 'vitest';
import { compile, compileLesson } from '@/engine/lang';
import { CompileError, formatCompileError } from '@/engine/lang/errors';

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
  // strictness added in P0.4 — these used to compile silently broken
  'string in domain': 'scene plane {\n  x: [-1, "a"]\n  y: [-1, 1]\n}',
  'unknown id in for bound':
    'scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  for i in range(0, n) {\n    point f"p{i}" = (i, 0)\n  }\n}',
  'typo in curve expr gets did-you-mean':
    'scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  param radius = 2\n  curve f = raduis * x\n}',
  'state declared after use':
    'scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  curve f = a * x^2\n  param a = 1\n}',
  'slider binds unknown state':
    'scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  param t = 1\n  slider s { label: "?" }\n}',
  'unknown function in expr':
    'scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  param t = 1\n  curve f = wobble(x) * t\n}',
  'typo in label template':
    'scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  param t = 1\n  label at (0, 0) = "v = ${tt}"\n}',
  'None is gone': 'scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  point p = (None, 0)\n}',
  'member access is not a thing':
    'scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  point p = (1, 2)\n  label at (0, 0) = p.x\n}',
  'drag to a literal is rejected, not silently dropped':
    'scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  param t = 1\n  point p = (1, 1) { drag: x -> 5, snap: 0.5 }\n}',
  'drag axis must be x, y, or xy':
    'scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  param t = 1\n  point p = (1, 1) { drag: (1 + 2) -> t }\n}',
};

const lessonCases: Record<string, string> = {
  'quiz without a correct option':
    'lesson "L" {\n  slide "s" {\n    quiz {\n      ask "?"\n      - "a"\n      - "b"\n    }\n  }\n}',
  'quiz without an ask':
    'lesson "L" {\n  slide "s" {\n    quiz {\n      - "a"\n      * "b"\n    }\n  }\n}',
  'numeric without an answer':
    'lesson "L" {\n  slide "s" {\n    numeric {\n      ask "?"\n    }\n  }\n}',
  'numeric with a string answer':
    'lesson "L" {\n  slide "s" {\n    numeric {\n      ask "?"\n      answer: "two"\n    }\n  }\n}',
  'build without a bank':
    'lesson "L" {\n  slide "s" {\n    build {\n      ask "?"\n      answer: ["x"]\n    }\n  }\n}',
  'two exercises on one slide':
    'lesson "L" {\n  slide "s" {\n    quiz { ask "?"\n - "a"\n * "b" }\n    quiz { ask "?"\n - "c"\n * "d" }\n  }\n}',
  'unknown thing in slide': 'lesson "L" {\n  slide "s" {\n    wobble\n  }\n}',
  'goal when references undefined state':
    'lesson "L" {\n  slide "s" {\n    scene plane {\n      x: [-1, 1]\n      y: [-1, 1]\n      param t = 1\n    }\n    goal "reach it" { when: zorp > 1 }\n  }\n}',
  'hotspot on a numberline scene is rejected':
    'lesson "L" {\n  slide "s" {\n    scene numberline {\n      x: [0, 10]\n    }\n    hotspot {\n      ask "Tap it"\n      target circle (2, 0) { r: 0.6 }\n    }\n  }\n}',
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

describe('formatCompileError caret frame', () => {
  it('points at the offending column with a caret', () => {
    const src = 'scene plane {\n  x: [-1, 1]\n  y: [-1, 1]\n  curve f = x^^2\n}';
    let err!: CompileError;
    try {
      compile(src);
    } catch (e) {
      err = e as CompileError;
    }
    const frame = formatCompileError(src, err);
    expect(frame).toContain('curve f = x^^2');
    expect(frame).toContain('^');
    expect(frame.split('\n').length).toBeGreaterThanOrEqual(3);
    expect(frame).toMatchSnapshot();
  });

  it('falls back to the plain message when there is no line info', () => {
    const err = new CompileError('something went wrong');
    expect(formatCompileError('whatever', err)).toBe('something went wrong');
  });
});
