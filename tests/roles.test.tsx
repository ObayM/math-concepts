import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import RichText from '@/components/lesson/RichText';

const SRC = `lesson "Speed" {
  role distance = accent
  role gap = primary

  slide "s" {
    > The [distance]{distance} covered over the [gap]{gap} is $\\textcolor{distance}{d}$ over $\\textcolor{gap}{h}$.
    scene plane {
      x: [0, 2]
      y: [0, 4]
      param h = 1 { range: [0.1, 1], step: 0.1 }
      line leg = (1, 1) -> (1, 1 + h) { color: distance }
      label at (0.2, 3) = "$\\\\textcolor{gap}{h}$" { tex }
      slider h
    }
    goal "Shrink the [gap]{gap}" { when: h < 0.5 }
  }
}`;

const lesson = lessonSchema.parse(compileLesson(SRC));
const slide = lesson.slides[0];

describe('colour roles', () => {
  it("rewrites prose spans and TeX colours to the role's colour", () => {
    expect(slide.prose).toContain('[distance]{accent:distance}');
    expect(slide.prose).toContain('\\textcolor{accent}{d}');
    expect(slide.goals![0].prompt).toBe('Shrink the [gap]{primary:gap}');
  });

  it('colours the scene object and remembers which role it plays', () => {
    const leg = slide.scene!.objects.find((o) => o.id === 'leg')!;
    expect(leg.color).toBe('accent');
    expect(leg.role).toBe('distance');
  });

  it('renders a span in the matching colour, tagged with its role', () => {
    const html = renderToStaticMarkup(<RichText>{slide.prose}</RichText>);
    expect(html).toContain('data-role="distance"');
    expect(html).toContain('var(--color-accent-600)');
    expect(html).toContain('var(--scene-accent)');
  });

  it('refuses a span with a role nobody declared', () => {
    expect(() => compileLesson(SRC.replace('[gap]{gap} is', '[gap]{gapp} is'))).toThrow(
      /"gapp" is not a colour role or a colour.*did you mean "gap"/
    );
  });

  it('refuses a role that is not one of the palette colours', () => {
    expect(() => compileLesson(SRC.replace('role gap = primary', 'role gap = pink'))).toThrow(
      /the colour must be one of/
    );
  });

  it('lets a plain colour token through without a role', () => {
    const l = compileLesson(
      `lesson "L" {\n  slide "s" {\n    > A [warm]{warning} word.\n    quiz {\n      ask "q"\n      * "a"\n      - "b"\n    }\n  }\n}`
    );
    expect(l.slides[0].prose).toBe('A [warm]{warning} word.');
  });
});
