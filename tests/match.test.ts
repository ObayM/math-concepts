import { describe, it, expect } from 'vitest';
import { compileLesson, CompileError } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import { exercises } from '../src/components/lesson/exercises';

function firstExercise(src: string) {
  const lesson = lessonSchema.parse(compileLesson(src));
  return lesson.slides[0].exercise!;
}

describe('match exercise compile', () => {
  it('collects pairs and decoys', () => {
    const ex = firstExercise(
      'lesson "L" {\n  slide "s" {\n    match {\n      ask "match them"\n      pair "a" -> "1"\n      pair "b" -> "2"\n      decoy "3"\n    }\n  }\n}'
    );
    expect(ex.kind).toBe('match');
    if (ex.kind === 'match') {
      expect(ex.pairs).toEqual([
        { left: 'a', right: '1' },
        { left: 'b', right: '2' },
      ]);
      expect(ex.decoys).toEqual(['3']);
    }
  });

  it('omits decoys when none are given', () => {
    const ex = firstExercise(
      'lesson "L" {\n  slide "s" {\n    match {\n      ask "match them"\n      pair "a" -> "1"\n      pair "b" -> "2"\n    }\n  }\n}'
    );
    if (ex.kind === 'match') expect(ex.decoys).toBeUndefined();
  });

  it('rejects a match with fewer than 2 pairs', () => {
    expect(() =>
      compileLesson(
        'lesson "L" {\n  slide "s" {\n    match {\n      ask "match them"\n      pair "a" -> "1"\n    }\n  }\n}'
      )
    ).toThrow(/at least 2 pair/);
  });

  it('rejects a match with no ask', () => {
    expect(() =>
      compileLesson(
        'lesson "L" {\n  slide "s" {\n    match {\n      pair "a" -> "1"\n      pair "b" -> "2"\n    }\n  }\n}'
      )
    ).toThrow(CompileError);
  });

  it('rejects a pair that is not "left" -> "right"', () => {
    expect(() =>
      compileLesson(
        'lesson "L" {\n  slide "s" {\n    match {\n      ask "match them"\n      pair "a"\n      pair "b" -> "2"\n    }\n  }\n}'
      )
    ).toThrow(/pair must be/);
  });
});

describe('exercises.match', () => {
  const slide = {
    exercise: {
      kind: 'match',
      pairs: [
        { left: 'a', right: '1' },
        { left: 'b', right: '2' },
      ],
      decoys: ['3'],
    },
  };

  it('starts as an all-null array sized to the pair count', () => {
    expect(exercises.match.initial(slide)).toEqual([null, null]);
  });

  it('is incomplete until every left item is matched', () => {
    expect(exercises.match.isComplete(slide, [null, null])).toBe(false);
    expect(exercises.match.isComplete(slide, ['1', null])).toBe(false);
    expect(exercises.match.isComplete(slide, ['1', '2'])).toBe(true);
  });

  it('checks each match against its correct right side', () => {
    expect(exercises.match.check(slide, ['1', '2'])).toBe(true);
    expect(exercises.match.check(slide, ['2', '1'])).toBe(false);
    expect(exercises.match.check(slide, [null, null])).toBe(false);
  });
});
