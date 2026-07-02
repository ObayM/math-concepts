import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';

// the flagship lesson, ported to the unified grammar, is the proof that the
// language is expressive enough for real content. this pins its structure.

const quadratics = compileLesson(
  readFileSync(
    fileURLToPath(new URL('../prisma/lessons/quadratics-1.prism', import.meta.url)),
    'utf8'
  )
);

describe('quadratics-1.prism (flagship, unified grammar)', () => {
  it('is a valid v2 lesson with 15 slides', () => {
    expect(quadratics.version).toBe(2);
    expect(quadratics.title).toBe('Quadratic Equations');
    expect(quadratics.course).toBe('algebra');
    expect(quadratics.slides).toHaveLength(15);
  });

  it('has the expected block mix (2 text, 8 scene, 3 quiz, 2 build)', () => {
    const kinds = quadratics.slides.map((s) =>
      s.exercise ? s.exercise.kind : s.scene ? 'scene' : 'text'
    );
    expect(kinds.filter((k) => k === 'text')).toHaveLength(2);
    expect(kinds.filter((k) => k === 'scene')).toHaveLength(8);
    expect(kinds.filter((k) => k === 'quiz')).toHaveLength(3);
    expect(kinds.filter((k) => k === 'build')).toHaveLength(2);
  });

  it('gives every slide a stable id and keeps categories', () => {
    const ids = quadratics.slides.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length); // unique
    expect(ids[0]).toBe('meet-the-quadratic');
    expect(quadratics.slides[0].category).toBe('Quadratics');
  });

  it('the standard-form scene keeps its three sliders and vertex expression', () => {
    const scene = quadratics.slides[2].scene!;
    expect(scene.version).toBe(2);
    expect(scene.controls?.filter((c) => c.as === 'slider')).toHaveLength(3);
    // the vertex point binds to an expression tree, not a string
    const vertex = scene.objects.find((o) => o.type === 'point' && o.label === 'vertex');
    expect(vertex && typeof (vertex as { x: unknown }).x).toBe('object');
  });

  it('the "Factor It" build accepts both commutative orderings', () => {
    const factor = quadratics.slides.find((s) => s.id === 'factor-it')!.exercise!;
    expect(factor.kind).toBe('build');
    if (factor.kind === 'build') {
      expect(factor.answers).toHaveLength(2);
      expect(factor.slots).toBe(10);
      expect(factor.reusable).toBe(true);
    }
  });
});
