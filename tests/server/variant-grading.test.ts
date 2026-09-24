import { describe, it, expect } from 'vitest';
import { issueVariant, readVariant } from '@/lib/variant-token';
import { gradeAnswer } from '@/lib/db/progressService';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import { instantiate, seedOf } from '@/engine/runtime/variant';

const slide = lessonSchema.parse(
  compileLesson(`lesson "L" {
  slide "s" {
    id: "s"
    numeric {
      vary a in range(2, 10)
      ask "What's $2 \\times \${a}$?"
      answer: 2*a
    }
  }
}`)
).slides[0];

const who = { userId: 'u1', lessonKey: 'lesson-1' };

describe('variant tokens', () => {
  it('round-trips for the same user, lesson and slide only', () => {
    const token = issueVariant('u1', 'lesson-1', 's');
    const seed = readVariant(token, 'u1', 'lesson-1', 's');
    expect(seed).toBe(seedOf(token));
    expect(readVariant(token, 'u2', 'lesson-1', 's')).toBeNull();
    expect(readVariant(token, 'u1', 'lesson-1', 'other')).toBeNull();
    expect(readVariant(`${seed! + 1}.${token.split('.')[1]}`, 'u1', 'lesson-1', 's')).toBeNull();
    expect(readVariant('nonsense', 'u1', 'lesson-1', 's')).toBeNull();
  });
});

describe('grading a varying numeric on the server', () => {
  it('grades against the variant the token names', () => {
    const token = issueVariant('u1', 'lesson-1', 's');
    const shown = instantiate(slide, seedOf(token));
    const right = shown.exercise!.kind === 'numeric' ? shown.exercise!.answers[0] : NaN;
    expect(gradeAnswer(slide, String(right), token, who)).toBe(true);
    expect(gradeAnswer(slide, String(right + 2), token, who)).toBe(false);
  });

  it('never counts an answer without a genuine token', () => {
    const shown = instantiate(slide, 0);
    const right = shown.exercise!.kind === 'numeric' ? shown.exercise!.answers[0] : NaN;
    expect(gradeAnswer(slide, String(right), undefined, who)).toBe(false);
    expect(gradeAnswer(slide, String(right), '0.local', who)).toBe(false);
  });
});
