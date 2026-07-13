import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { compile, compileLesson } from '@/engine/lang';
import { Scene } from '@/engine';

// coverage artifacts, not seeded content: they exist purely to exercise engine
// primitives the flagship course has no pedagogical reason to touch. anything
// genuinely new to the language belongs here or in an existing golden fixture
// before it belongs in real lesson content.

const fixture = (name: string) =>
  readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8');

const lesson = (name: string) =>
  readFileSync(fileURLToPath(new URL(`../prisma/lessons/${name}.prism`, import.meta.url)), 'utf8');

describe('kitchen-sink.prism (plane coverage fixture)', () => {
  const ir = compile(fixture('kitchen-sink.prism'));

  it('compiles to a valid v2 scene IR', () => {
    expect(ir.version).toBe(2);
    expect(ir.space.type).toBe('plane');
  });

  it('renders to clean SVG with no NaN or unresolved interpolation', () => {
    const html = renderToStaticMarkup(React.createElement(Scene, { ir }));
    expect(html).toContain('<svg');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('${');
  });

  it('constrains a drag along another object (along())', () => {
    const onRing = ir.objects.find((o) => o.id === 'onRing')!;
    expect(onRing.type).toBe('point');
    if (onRing.type === 'point') {
      expect(onRing.draggable?.along).toEqual({ ref: 'ring' });
    }
  });

  it('snaps a free xy drag to a step', () => {
    const snapped = ir.objects.find((o) => o.id === 'snapped')!;
    expect(snapped.type).toBe('point');
    if (snapped.type === 'point') {
      expect(snapped.draggable?.snap).toBe(0.5);
    }
  });

  it('draws a piecewise curve via where:', () => {
    const left = ir.objects.find((o) => o.id === 'left')!;
    const right = ir.objects.find((o) => o.id === 'right')!;
    expect(left.type).toBe('curve');
    expect(right.type).toBe('curve');
    if (left.type === 'curve' && right.type === 'curve') {
      expect(left.where).toBeDefined();
      expect(right.where).toBeDefined();
    }
  });

  it('expands a runtime repeat block', () => {
    const repeat = ir.objects.find((o) => o.type === 'repeat');
    expect(repeat).toBeDefined();
  });
});

describe('numberline.prism (space-type coverage fixture)', () => {
  const ir = compile(fixture('numberline.prism'));

  it('compiles to a valid 1D numberline scene', () => {
    expect(ir.version).toBe(2);
    expect(ir.space.type).toBe('numberline');
  });

  it('renders to clean SVG with no NaN or unresolved interpolation', () => {
    const html = renderToStaticMarkup(React.createElement(Scene, { ir }));
    expect(html).toContain('<svg');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('${');
  });
});

describe('flagship course exercise-kind coverage', () => {
  const LESSONS = [
    'differentiation-1',
    'differentiation-2',
    'differentiation-3',
    'differentiation-4',
    'differentiation-5',
  ];
  const ALL_KINDS = [
    'quiz',
    'numeric',
    'build',
    'hotspot',
    'sketch',
    'match',
    'order',
    'table',
  ] as const;

  it('touches every exercise kind across the flagship lessons', () => {
    const kinds = new Set(
      LESSONS.flatMap((name) =>
        compileLesson(lesson(name))
          .slides.filter((s) => s.exercise)
          .map((s) => s.exercise!.kind)
      )
    );
    for (const kind of ALL_KINDS) {
      expect(kinds.has(kind)).toBe(true);
    }
  });
});
