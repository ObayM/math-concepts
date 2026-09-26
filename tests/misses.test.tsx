import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { compileLesson, CompileError } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import BuildExercise from '@/components/lesson/exercises/BuildExercise';
import MatchExercise from '@/components/lesson/exercises/MatchExercise';

const slideOf = (body: string) =>
  lessonSchema.parse(compileLesson(`lesson "L" {\n  slide "s" {\n${body}\n  }\n}`)).slides[0];

const build = (extra: string) => `    build {
      ask "Area of the panel?"
      bank: ["a", "b", "sin", "cos", "half"]
      answer: ["a", "b", "sin"]
${extra}
    }`;

const match = (extra: string) => `    match {
      ask "Cross them."
      pair "i × j" -> "k"
      pair "j × i" -> "-k"
      decoy "1"
${extra}
    }`;

const throws = (src: string, msg: RegExp) => {
  expect(() => slideOf(src)).toThrow(CompileError);
  expect(() => slideOf(src)).toThrow(msg);
};

describe('miss on build', () => {
  it('compiles into the IR', () => {
    const ex = slideOf(build('      miss "cos" "That is the dot product."')).exercise;
    expect(ex?.kind === 'build' && ex.misses).toEqual([
      { token: 'cos', why: 'That is the dot product.' },
    ]);
  });

  it('refuses a token outside the bank', () => {
    throws(build('      miss "tan" "no"'), /isn't in the bank/);
  });

  it('refuses a token the answer uses', () => {
    throws(build('      miss "sin" "no"'), /part of an accepted answer/);
  });

  it('shows the why of each placed decoy after a wrong check', () => {
    const slide = slideOf(
      build('      miss "cos" "That is the dot product."\n      miss "half" "That is a triangle."')
    );
    const html = renderToStaticMarkup(
      <BuildExercise
        slide={slide}
        value={['a', 'b', 'cos'] as never}
        checked
        correct={false}
        onChange={() => {}}
      />
    );
    expect(html).toContain('That is the dot product.');
    expect(html).not.toContain('That is a triangle.');
  });
});

describe('miss on match', () => {
  it('compiles into the IR', () => {
    const ex = slideOf(match('      miss "j × i" -> "k" "Order flips the face."')).exercise;
    expect(ex?.kind === 'match' && ex.misses).toEqual([
      { left: 'j × i', right: 'k', why: 'Order flips the face.' },
    ]);
  });

  it('refuses an unknown left side', () => {
    throws(match('      miss "k × k" -> "k" "no"'), /no pair has that left side/);
  });

  it('refuses an unknown right side', () => {
    throws(match('      miss "j × i" -> "2" "no"'), /isn't one of the right-hand options/);
  });

  it('refuses the correct pairing', () => {
    throws(match('      miss "i × j" -> "k" "no"'), /correct pairing/);
  });

  it('shows the why only for a pairing the student made', () => {
    const slide = slideOf(match('      miss "j × i" -> "k" "Order flips the face."'));
    const made = renderToStaticMarkup(
      <MatchExercise
        slide={slide}
        value={['-k', 'k']}
        checked
        correct={false}
        onChange={() => {}}
      />
    );
    expect(made).toContain('Order flips the face.');
    const notMade = renderToStaticMarkup(
      <MatchExercise slide={slide} value={['k', '1']} checked correct={false} onChange={() => {}} />
    );
    expect(notMade).not.toContain('Order flips the face.');
  });
});
