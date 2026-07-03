import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';

// P2.18 — the legacy real-functions-* lessons, ported from the inline v1 seed
// data to the unified grammar. each must compile to a schema-valid v2 lesson.
// add ported lessons here as they land; when all are green the v1 path can die.
const PORTED = ['real-functions-1', 'real-functions-2', 'real-functions-3'];
// note: keep this list in sync with the .prism files that actually exist

const load = (name: string) =>
  compileLesson(
    readFileSync(fileURLToPath(new URL(`../prisma/lessons/${name}.prism`, import.meta.url)), 'utf8')
  );

describe('ported legacy lessons compile to valid v2 IR', () => {
  for (const name of PORTED) {
    it(`${name} is schema-valid`, () => {
      const parsed = lessonSchema.safeParse(load(name));
      if (!parsed.success) throw new Error(JSON.stringify(parsed.error.issues, null, 2));
      expect(parsed.data.version).toBe(2);
      expect(parsed.data.slides.length).toBeGreaterThan(0);
    });
  }
});

describe('real-functions-1 preserves the original content', () => {
  const l = lessonSchema.parse(load('real-functions-1'));

  it('keeps all 8 slides and their ids', () => {
    expect(l.slides.map((s) => s.id)).toEqual([
      'l1-intro',
      'l1-machine',
      'l1-domain',
      'l1-range',
      'l1-div-zero',
      'l1-quiz-1',
      'l1-sqrt',
      'l1-quiz-2',
    ]);
  });

  it('keeps the two quizzes with their original correct answers', () => {
    const q1 = l.slides.find((s) => s.id === 'l1-quiz-1')!.exercise!;
    const q2 = l.slides.find((s) => s.id === 'l1-quiz-2')!.exercise!;
    expect(q1.kind === 'quiz' && q1.correct).toBe(1);
    expect(q2.kind === 'quiz' && q2.correct).toBe(3);
  });

  it('turns the machine slide label ${t} into a live text tree', () => {
    const scene = l.slides.find((s) => s.id === 'l1-machine')!.scene!;
    const p = scene.objects.find((o) => o.id === 'p')!;
    // draggable point with an interpolated label
    expect((p as { draggable?: unknown }).draggable).toBeDefined();
    expect((p as { label?: { parts?: unknown[] } }).label?.parts).toBeDefined();
  });
});
