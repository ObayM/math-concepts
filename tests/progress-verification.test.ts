import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';
import { buildSlideMap, verifyAttempts } from '@/lib/db/progressService';

// this is the mastery/attempts trust boundary: a client can send whatever
// `correct` flag it wants, but only the server-recomputed value should ever
// reach lesson_attempts / user_skill_mastery.

const lesson = compileLesson(`
lesson "Trust Boundary Check" {
  slide "Q1" {
    quiz {
      skill: "quadratics.discriminant"
      ask "pick the right one"
      - "wrong"
      * "right"
      ! "because it's right"
    }
  }
  slide "Q2" {
    numeric {
      ask "what is 2 + 2?"
      answer: 4
      tolerance: 0
    }
  }
}
`);

const slideMap = buildSlideMap(lesson);
const [quizSlide, numericSlide] = lesson.slides;

describe('verifyAttempts', () => {
  it('recomputes correct from the real answer, ignoring a forged `correct` flag', () => {
    const [result] = verifyAttempts(slideMap, [
      {
        slideId: quizSlide.id,
        kind: 'quiz',
        question: 'pick the right one',
        correct: true,
        answer: 0,
      },
    ]);
    expect(result.correct).toBe(false);
  });

  it('marks a genuinely correct answer as correct even if the client sent `correct: false`', () => {
    const [result] = verifyAttempts(slideMap, [
      {
        slideId: quizSlide.id,
        kind: 'quiz',
        question: 'pick the right one',
        correct: false,
        answer: 1,
      },
    ]);
    expect(result.correct).toBe(true);
  });

  it('carries the skill tag from the published slide, not from the client', () => {
    const [result] = verifyAttempts(slideMap, [
      {
        slideId: quizSlide.id,
        kind: 'quiz',
        question: 'pick the right one',
        correct: true,
        answer: 1,
      },
    ]);
    expect(result.skill).toBe('quadratics.discriminant');
  });

  it('works across exercise kinds (numeric)', () => {
    const [ok, wrong] = verifyAttempts(slideMap, [
      { slideId: numericSlide.id, kind: 'numeric', question: '2+2', correct: false, answer: '4' },
      { slideId: numericSlide.id, kind: 'numeric', question: '2+2', correct: true, answer: '5' },
    ]);
    expect(ok.correct).toBe(true);
    expect(wrong.correct).toBe(false);
  });

  it('defaults to incorrect when the slideId is unknown or missing', () => {
    const [unknown, missing] = verifyAttempts(slideMap, [
      { slideId: 'not-a-real-slide', kind: 'quiz', question: '?', correct: true, answer: 1 },
      { slideId: undefined, kind: 'quiz', question: '?', correct: true, answer: 1 },
    ]);
    expect(unknown.correct).toBe(false);
    expect(missing.correct).toBe(false);
  });
});
