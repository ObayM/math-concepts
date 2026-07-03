import type { Token, TT } from './tokens';
import { CompileError } from './errors';

// block structure is fully brace-delimited (no indentation sensitivity), so the
// lexer only tracks () / [] to let expressions and arg lists wrap across lines —
// {} never suppresses NL, since NL is what separates statements/props inside a block
export function lex(source: string): Token[] {
  const out: Token[] = [];
  const lines = source.split('\n');
  let bracketDepth = 0;

  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li];
    const ln = li + 1;

    const contentStart = raw.search(/\S/);
    if (contentStart === -1) continue;

    // line-initial "> " is prose (lesson text): the rest of the line is raw —
    // markdown, $latex$, even #, all preserved. never tokenized.
    const trimmed = raw.slice(contentStart);
    if (trimmed[0] === '>' && (trimmed[1] === ' ' || trimmed.length === 1)) {
      out.push(tok('PROSE', trimmed.slice(1).replace(/^ /, ''), ln, contentStart + 1));
      if (bracketDepth === 0) out.push(tok('NL', '\n', ln, raw.length + 1));
      continue;
    }

    const content = stripComment(raw);
    if (content.trim() === '') continue;

    const lineTokens = lexLine(content.trimStart(), ln, contentStart + 1);
    for (const t of lineTokens) {
      if (t.type === 'LP' || t.type === 'LB') bracketDepth++;
      if (t.type === 'RP' || t.type === 'RB') bracketDepth = Math.max(0, bracketDepth - 1);
      out.push(t);
    }

    if (bracketDepth === 0) {
      out.push(tok('NL', '\n', ln, raw.length + 1));
    }
  }

  out.push(tok('EOF', '', lines.length + 1, 1));
  return out;
}

function tok(type: TT, raw: string, line: number, col: number): Token {
  return { type, raw, line, col };
}

function stripComment(line: string): string {
  let inStr = false;
  let strChar = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === strChar) inStr = false;
    } else {
      if (c === '"' || c === "'") {
        inStr = true;
        strChar = c;
      } else if (c === '#') return line.slice(0, i);
    }
  }
  return line;
}

function lexLine(line: string, ln: number, startCol: number): Token[] {
  const out: Token[] = [];
  let i = 0;
  const col = () => startCol + i;

  const emit = (type: TT, raw: string) => {
    out.push(tok(type, raw, ln, col() - raw.length));
  };

  while (i < line.length) {
    if (line[i] === ' ' || line[i] === '\t') {
      i++;
      continue;
    }

    const c = line[i];

    if (/\d/.test(c) || (c === '.' && /\d/.test(line[i + 1] ?? ''))) {
      let j = i;
      while (j < line.length && /[\d.]/.test(line[j])) j++;
      if (line[j] === 'e' || line[j] === 'E') {
        j++;
        if (line[j] === '+' || line[j] === '-') j++;
        while (j < line.length && /\d/.test(line[j])) j++;
      }
      const raw = line.slice(i, j);
      i = j;
      emit('NUM', raw);
      continue;
    }

    if (c === 'f' && (line[i + 1] === '"' || line[i + 1] === "'")) {
      const q = line[i + 1];
      let j = i + 2;
      let s = '';
      while (j < line.length && line[j] !== q) {
        if (line[j] === '\\') {
          s += unescapeChar(line[j + 1] ?? '');
          j += 2;
        } else s += line[j++];
      }
      if (line[j] !== q) throw new CompileError('unterminated f-string', ln);
      i = j + 1;
      emit('FSTR', s);
      continue;
    }

    if (c === '"' || c === "'") {
      let j = i + 1;
      let s = '';
      while (j < line.length && line[j] !== c) {
        if (line[j] === '\\') {
          s += unescapeChar(line[j + 1] ?? '');
          j += 2;
        } else s += line[j++];
      }
      if (line[j] !== c) throw new CompileError('unterminated string', ln);
      i = j + 1;
      emit('STR', s);
      continue;
    }

    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < line.length && /\w/.test(line[j])) j++;
      const raw = line.slice(i, j);
      i = j;
      emit('IDENT', raw);
      continue;
    }

    const two = line.slice(i, i + 2);
    if (two === '->') {
      emit('ARROW', '->');
      i += 2;
      continue;
    }
    if (two === '==') {
      emit('EQ', '==');
      i += 2;
      continue;
    }
    if (two === '!=') {
      emit('NEQ', '!=');
      i += 2;
      continue;
    }
    if (two === '<=') {
      emit('LTE', '<=');
      i += 2;
      continue;
    }
    if (two === '>=') {
      emit('GTE', '>=');
      i += 2;
      continue;
    }

    const single: Record<string, TT> = {
      '+': 'PLUS',
      '-': 'MINUS',
      '*': 'STAR',
      '/': 'SLASH',
      '^': 'CARET',
      '%': 'PCT',
      '<': 'LT',
      '>': 'GT',
      '=': 'ASSIGN',
      '(': 'LP',
      ')': 'RP',
      '[': 'LB',
      ']': 'RB',
      '{': 'LC',
      '}': 'RC',
      ',': 'COMMA',
      ':': 'COLON',
      '.': 'DOT',
      '!': 'BANG',
    };
    if (single[c]) {
      emit(single[c], c);
      i++;
      continue;
    }

    throw new CompileError(`unexpected character: ${JSON.stringify(c)}`, ln);
  }

  return out;
}

function unescapeChar(c: string): string {
  // only quotes and the backslash itself are escapes. every other "\x" keeps its
  // backslash so LaTeX commands (\frac, \tan, \right, \n...) survive intact —
  // strings carry math, and \n/\t collide with \neq/\tan anyway.
  switch (c) {
    case '\\':
      return '\\';
    case '"':
      return '"';
    case "'":
      return "'";
    default:
      return '\\' + c;
  }
}
