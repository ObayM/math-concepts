import type { SceneIR } from '@/engine/ir/types';
import type { LessonIR } from '@/engine/ir/lesson';
import { lex } from './lexer';
import { parse } from './parser';
import { emit, emitLesson } from './emitter';
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
