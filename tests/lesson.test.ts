import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';

// the flagship lesson is the proof that the language is expressive enough
// for real content. this pins its structure.

const differentiation1 = compileLesson(
  readFileSync(
    fileURLToPath(new URL('../prisma/lessons/differentiation-1.prism', import.meta.url)),
    'utf8'
  )
);

describe('differentiation-1.prism (flagship)', () => {
  it('is a valid v2 lesson with 11 slides', () => {
    expect(differentiation1.version).toBe(2);
    expect(differentiation1.title).toBe('The Derivative & the Power Rule');
    expect(differentiation1.course).toBe('calculus');
    expect(differentiation1.slides).toHaveLength(11);
  });

  it('has the expected block mix', () => {
    const kinds = differentiation1.slides.map((s) =>
      s.exercise ? s.exercise.kind : s.scene ? 'scene' : 'text'
    );
    expect(kinds.filter((k) => k === 'text')).toHaveLength(2);
    expect(kinds.filter((k) => k === 'scene')).toHaveLength(3);
    expect(kinds.filter((k) => k === 'quiz')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'numeric')).toHaveLength(2);
    expect(kinds.filter((k) => k === 'build')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'sketch')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'table')).toHaveLength(1);
  });

  it('gives every slide a stable id and keeps categories', () => {
    const ids = differentiation1.slides.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length); // unique
    expect(ids[0]).toBe('d1-intro');
    expect(differentiation1.slides[0].category).toBe('Foundations');
  });

  it('the derivative-as-function scene binds its draggable point to a live expression', () => {
    const scene = differentiation1.slides.find((s) => s.id === 'd1-derivfn')!.scene!;
    expect(scene.version).toBe(2);
    expect(scene.controls?.filter((c) => c.as === 'slider')).toHaveLength(1);
    // the draggable point binds to an expression tree, not a raw number
    const point = scene.objects.find((o) => o.id === 'P');
    expect(point && typeof (point as { x: unknown }).x).toBe('object');
  });

  it('the "Build the Derivative" exercise assembles the power-rule result', () => {
    const build = differentiation1.slides.find((s) => s.id === 'd1-build')!.exercise!;
    expect(build.kind).toBe('build');
    if (build.kind === 'build') {
      expect(build.answers).toHaveLength(1);
      expect(build.slots).toBe(4);
      expect(build.bank.length).toBeGreaterThan(build.slots); // includes a distractor
    }
  });
});
