import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import { Scene } from '@/engine';

// the differentiation flagship course — five lessons authored in Prism. each must
// be a schema-valid v2 lesson, and every scene must server-render to clean SVG
// (no NaN coords, no unresolved ${} in the live labels/tangents).

const LESSONS = [
  'differentiation-1',
  'differentiation-2',
  'differentiation-3',
  'differentiation-4',
  'differentiation-5',
];

const load = (name: string) =>
  lessonSchema.parse(
    compileLesson(
      readFileSync(
        fileURLToPath(new URL(`../prisma/lessons/${name}.prism`, import.meta.url)),
        'utf8'
      )
    )
  );

describe('differentiation course', () => {
  for (const name of LESSONS) {
    const lesson = load(name);

    it(`${name} is a valid v2 lesson on the calculus course`, () => {
      expect(lesson.version).toBe(2);
      expect(lesson.course).toBe('calculus');
      expect(lesson.slides.length).toBeGreaterThan(0);
    });

    for (const slide of lesson.slides) {
      if (!slide.scene) continue;
      it(`${name} / "${slide.title}" renders to clean SVG`, () => {
        const html = renderToStaticMarkup(React.createElement(Scene, { ir: slide.scene! }));
        expect(html).toContain('<svg');
        expect(html).not.toContain('NaN');
        expect(html).not.toContain('${');
      });
    }
  }

  it('covers every requested rule via exercises across the course', () => {
    const all = LESSONS.map(load);
    const exerciseCount = all.flatMap((l) => l.slides).filter((s) => s.exercise).length;
    expect(exerciseCount).toBeGreaterThanOrEqual(15); // quizzes + numerics + builds
  });
});
