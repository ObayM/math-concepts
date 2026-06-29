import type { SceneIR } from '@/engine/ir/types';
import { lex } from './lexer';
import { parse } from './parser';
import { emit } from './emitter';
import { CompileError } from './errors';

export function compile(source: string): SceneIR {
  let tokens;
  try {
    tokens = lex(source);
  } catch (e) {
    if (e instanceof CompileError) throw e;
    throw new CompileError(String(e));
  }

  let ast;
  try {
    ast = parse(tokens);
  } catch (e) {
    if (e instanceof CompileError) throw e;
    throw new CompileError(String(e));
  }

  return emit(ast);
}
