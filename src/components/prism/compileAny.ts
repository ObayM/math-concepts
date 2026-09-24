import { compileLesson, CompileError, formatCompileError } from '@/engine/lang';
import type { LessonIR } from '@/engine/ir/lesson';

// a doc/cookbook/playground snippet can be a full lesson, a bare slide, a bare
// scene, a single exercise/goal/prose fragment, or a bare scene-level object —
// wrap whatever it is so it always ends up as valid `lesson { slide { ... } }`
// source, so one compiler entry point (compileLesson) and one renderer
// (MiniPlayer) cover every doc example.
const SLIDE_ITEM_KEYWORDS = new Set([
  'goal',
  'quiz',
  'numeric',
  'build',
  'hotspot',
  'sketch',
  'match',
  'order',
  'sort',
  'table',
  'moves',
  'scene',
]);

function firstWord(src: string): string {
  const m = src.trimStart().match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
  return m ? m[0] : '';
}

function wrap(src: string): string {
  const trimmed = src.trimStart();
  if (trimmed.startsWith('lesson')) return src;
  if (trimmed.startsWith('>')) return `lesson "Preview" {\n  slide "Preview" {\n${src}\n  }\n}`;
  if (trimmed.startsWith('slide')) return `lesson "Preview" {\n${src}\n}`;
  if (SLIDE_ITEM_KEYWORDS.has(firstWord(trimmed))) {
    return `lesson "Preview" {\n  slide "Preview" {\n${src}\n  }\n}`;
  }
  // a bare scene-level fragment (param/curve/point/for/...) — give it a
  // generic bounding scene to live in
  return `lesson "Preview" {\n  slide "Preview" {\n    scene plane {\n      x: [-6, 6]\n      y: [-6, 6]\n      grid\n      axes\n${src}\n    }\n  }\n}`;
}

export type CompileAnyResult = { lesson: LessonIR; error: null } | { lesson: null; error: string };

export function compileAny(src: string): CompileAnyResult {
  const wrapped = wrap(src);
  try {
    return { lesson: compileLesson(wrapped), error: null };
  } catch (e) {
    const message = e instanceof CompileError ? formatCompileError(wrapped, e) : String(e);
    return { lesson: null, error: message };
  }
}
