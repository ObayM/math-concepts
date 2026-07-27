import type { SceneIR } from '@/engine/ir/types';
import type { LessonIR } from '@/engine/ir/lesson';
import { lex } from './lexer';
import { parse } from './parser';
import { emit, emitLesson, slideIdFor } from './emitter';
import { CompileError } from './errors';

function parseSource(source: string): ReturnType<typeof parse> {
  let tokens;
  try {
    tokens = lex(source);
  } catch (e) {
    if (e instanceof CompileError) throw e;
    throw new CompileError(String(e));
  }
  try {
    return parse(tokens);
  } catch (e) {
    if (e instanceof CompileError) throw e;
    throw new CompileError(String(e));
  }
}

// compile a standalone scene (bare `scene {}` source)
export function compile(source: string): SceneIR {
  return emit(parseSource(source));
}

// compile a whole lesson (`lesson {}` source with slides)
export function compileLesson(source: string): LessonIR {
  return emitLesson(parseSource(source));
}

// verify findings only carry a slide id, so pair each id with the line its
// `slide` keyword sits on. uses the real parser, never a regex over the text.
export function slideLines(source: string): Map<string, number> {
  const lines = new Map<string, number>();
  const root = parseSource(source)[0];
  if (!root || root.k !== 'lesson') return lines;
  root.slides.forEach((s, i) => lines.set(slideIdFor(s.props, s.title, i), s.ln));
  return lines;
}
