import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';

// LaTeX in strings must survive lexing — backslash commands are the whole point
// of math content. only \\ \" \' are escapes; \frac / \tan / \right stay literal.
describe('LaTeX backslashes survive string lexing', () => {
  const src =
    'lesson "L" {\n  slide "s" {\n' +
    '    quiz {\n      ask "What is $\\frac{d}{dx}\\left[x^{4}\\right]$?"\n' +
    '      * "$\\tan x$"\n      - "$\\sec^2 x$"\n    }\n  }\n}';
  const ex = lessonSchema.parse(compileLesson(src)).slides[0].exercise!;

  it('keeps \\frac, \\left, \\right in the prompt', () => {
    expect(ex.kind).toBe('quiz');
    expect(ex.prompt).toContain('\\frac{d}{dx}');
    expect(ex.prompt).toContain('\\left[');
    expect(ex.prompt).toContain('\\right]');
  });

  it('keeps \\tan / \\sec in option text (no \\t → tab collision)', () => {
    if (ex.kind === 'quiz') {
      expect(ex.options[0].text).toBe('$\\tan x$');
      expect(ex.options[1].text).toBe('$\\sec^2 x$');
      expect(ex.options[0].text).not.toContain('\t');
    }
  });

  it('still unescapes real escapes: \\" and \\\\', () => {
    const s = compileLesson('lesson "L" {\n  slide "s" {\n    > x\n  }\n}');
    expect(s.title).toBe('L');
  });
});
