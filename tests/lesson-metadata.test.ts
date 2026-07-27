import { describe, it, expect } from 'vitest';
import { compileLesson, CompileError } from '@/engine/lang';
import { LESSON_DIFFICULTIES, LESSON_ICONS } from '@/engine/lang/icons';
import { iconMap } from '@/components/lib/IconMap';

const wrap = (props: string) => `
lesson "Quadratics" {
${props}
  slide "One" {
    id: "one"
    > A quadratic graphs as a **parabola**.
  }
}
`;

describe('lesson metadata props', () => {
  it('carries unit, difficulty, icon and summary into the IR', () => {
    const ir = compileLesson(
      wrap(`  course: "algebra"
  unit: "Polynomials"
  difficulty: "Beginner"
  icon: "FunctionSquare"
  summary: "Meet the parabola."
  skills: ["quad-vertex"]`)
    );

    expect(ir.unit).toBe('Polynomials');
    expect(ir.difficulty).toBe('Beginner');
    expect(ir.icon).toBe('FunctionSquare');
    expect(ir.summary).toBe('Meet the parabola.');
    expect(ir.course).toBe('algebra');
    expect(ir.skills).toEqual(['quad-vertex']);
  });

  it('omits them when they are not declared', () => {
    const ir = compileLesson(wrap(''));
    expect(ir.unit).toBeUndefined();
    expect(ir.difficulty).toBeUndefined();
    expect(ir.icon).toBeUndefined();
    expect(ir.summary).toBeUndefined();
  });

  it('accepts every declared difficulty', () => {
    for (const d of LESSON_DIFFICULTIES) {
      expect(compileLesson(wrap(`  difficulty: "${d}"`)).difficulty).toBe(d);
    }
  });

  it('accepts every icon in the registry', () => {
    for (const icon of LESSON_ICONS) {
      expect(compileLesson(wrap(`  icon: "${icon}"`)).icon).toBe(icon);
    }
  });

  it('rejects a difficulty that is not one of the three', () => {
    expect(() => compileLesson(wrap('  difficulty: "Hard"'))).toThrow(CompileError);
    expect(() => compileLesson(wrap('  difficulty: "beginner"'))).toThrow(/must be one of/);
  });

  it('suggests the right spelling for a near miss', () => {
    expect(() => compileLesson(wrap('  difficulty: "Begginer"'))).toThrow(
      /did you mean "Beginner"/
    );
    expect(() => compileLesson(wrap('  icon: "Sigmaa"'))).toThrow(/did you mean "Sigma"/);
  });

  it('rejects an icon the renderer cannot draw', () => {
    expect(() => compileLesson(wrap('  icon: "Rocket"'))).toThrow(/must be one of/);
  });
});

describe('unknown lesson properties', () => {
  it('are a compile error instead of being silently swallowed', () => {
    expect(() => compileLesson(wrap('  untit: "Polynomials"'))).toThrow(CompileError);
    expect(() => compileLesson(wrap('  untit: "Polynomials"'))).toThrow(/unknown lesson property/);
  });

  it('still accept every property the language really has', () => {
    expect(() =>
      compileLesson(
        wrap(`  course: "algebra"
  skills: ["a"]
  unit: "U"
  difficulty: "Advanced"
  icon: "Star"
  summary: "S"`)
      )
    ).not.toThrow();
  });
});

describe('the icon registry and the renderer agree', () => {
  it('every declarable icon has a component, and vice versa', () => {
    expect(Object.keys(iconMap).sort()).toEqual([...LESSON_ICONS].sort());
  });

  it('every icon resolves to something renderable', () => {
    for (const name of LESSON_ICONS) {
      expect(iconMap[name as keyof typeof iconMap], name).toBeTruthy();
    }
  });
});
