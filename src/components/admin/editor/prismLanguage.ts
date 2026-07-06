import { StreamLanguage } from '@codemirror/language';
import type { StringStream } from '@codemirror/language';
import { KEYWORDS, MATH_FNS } from '@/components/prism/prismKeywords';

function token(stream: StringStream): string | null {
  if (stream.pos === 0 && /^\s*>/.test(stream.string)) {
    stream.skipToEnd();
    return 'string';
  }
  if (stream.eatSpace()) return null;
  if (stream.match('#')) {
    stream.skipToEnd();
    return 'comment';
  }
  if (stream.match(/"(?:[^"\\]|\\.)*"/)) return 'string';
  if (stream.match(/\d+(?:\.\d+)?/)) return 'number';
  if (stream.match(/->|>=|<=|==|!=/)) return 'operator';
  if (stream.match(/[+\-*/^%=><!]/)) return 'operator';
  if (stream.match(/[()[\]{},:]/)) return 'punctuation';

  const word = stream.match(/[a-zA-Z_][a-zA-Z0-9_]*/);
  if (word) {
    const w = String(word);
    if (w === 'true' || w === 'false') return 'bool';
    if (KEYWORDS.has(w)) return 'keyword';
    if (MATH_FNS.has(w)) return 'variableName.function';
    return 'variableName';
  }

  stream.next();
  return null;
}

export const prismLanguage = StreamLanguage.define({ token });
