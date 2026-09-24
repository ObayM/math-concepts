import { describe, it, expect } from 'vitest';
import { parseNumber } from '@/components/lesson/exercises/answers';
import { exercises } from '@/components/lesson/exercises';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';

const slide = lessonSchema.parse(
  compileLesson(
    'lesson "L" {\n  slide "s" {\n    numeric {\n      ask "q"\n      answer: 2.5\n    }\n  }\n}'
  )
).slides[0];

describe('parseNumber', () => {
  it.each([
    ['42', 42],
    [' 42 ', 42],
    ['-3', -3],
    ['+3', 3],
    ['.5', 0.5],
    ['2.', 2],
    ['1e3', 1000],
    ['−3', -3],
  ])('reads %j as %d', (input, n) => {
    expect(parseNumber(input)).toBe(n);
  });

  it.each([
    '',
    '   ',
    '0x10',
    'Infinity',
    '-Infinity',
    'NaN',
    '1/2',
    '2..5',
    'abc',
    '1e999',
    '1 000',
  ])('refuses %j', (input) => {
    expect(parseNumber(input)).toBeNaN();
  });
});

describe('numeric registry', () => {
  it('treats blank input as incomplete, never as 0', () => {
    expect(exercises.numeric.isComplete(slide, '   ')).toBe(false);
    expect(exercises.numeric.check(slide, '   ')).toBe(false);
  });

  it('grades a padded answer', () => {
    expect(exercises.numeric.check(slide, ' 2.5 ')).toBe(true);
  });

  it('refuses a hex literal', () => {
    expect(exercises.numeric.isComplete(slide, '0x10')).toBe(false);
  });
});
