import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';

// P5.38: `def` at the top of a lesson is callable from every slide's scene,
// not just the scene it was declared in (previously a hard compile error).

const lesson = (body: string) => `lesson "Macro Lesson" {\n${body}\n}`;

describe('lesson-level def macros', () => {
  it('a macro defined at lesson level is usable across multiple slides', () => {
    const ir = compileLesson(
      lesson(
        `  def marker(px, py) {\n    point f"m{px}" = (px, py) { color: accent, r: 3 }\n  }\n\n` +
          `  slide "First" {\n    scene plane {\n      x: [-5, 5]\n      y: [-5, 5]\n      marker(1, 1)\n    }\n  }\n\n` +
          `  slide "Second" {\n    scene plane {\n      x: [-5, 5]\n      y: [-5, 5]\n      marker(2, 4)\n    }\n  }\n`
      )
    );
    expect(ir.slides).toHaveLength(2);
    expect(ir.slides[0].scene!.objects.map((o) => o.id)).toEqual(['m1']);
    expect(ir.slides[1].scene!.objects.map((o) => o.id)).toEqual(['m2']);
  });

  it('a scene-local def with the same name overrides the lesson macro just for that scene', () => {
    const ir = compileLesson(
      lesson(
        `  def marker(px, py) {\n    point f"m{px}" = (px, py) { color: accent, r: 3 }\n  }\n\n` +
          `  slide "Override" {\n    scene plane {\n      x: [-5, 5]\n      y: [-5, 5]\n      def marker(px, py) {\n        circle f"m{px}" = (px, py) { r: 0.5 }\n      }\n      marker(1, 1)\n    }\n  }\n\n` +
          `  slide "Unaffected" {\n    scene plane {\n      x: [-5, 5]\n      y: [-5, 5]\n      marker(2, 2)\n    }\n  }\n`
      )
    );
    expect(ir.slides[0].scene!.objects[0].type).toBe('circle');
    expect(ir.slides[1].scene!.objects[0].type).toBe('point');
  });

  it('calling an undefined macro still throws, with the right line', () => {
    expect(() =>
      compileLesson(
        lesson(
          `  slide "Oops" {\n    scene plane {\n      x: [-5, 5]\n      y: [-5, 5]\n      marker(1, 1)\n    }\n  }\n`
        )
      )
    ).toThrow(/undefined macro "marker"/);
  });
});
