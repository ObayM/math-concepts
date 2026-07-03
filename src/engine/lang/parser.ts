import type { Token, TT } from './tokens';
import type { Expr, PropMap, Stmt, IfCase, SlideStmt, QuizOption, ExerciseCommon } from './ast';
import { CompileError } from './errors';

const SPACE_PROPS = new Set(['x', 'y', 'grid', 'axes']);

// the whole parser lives in one closure over (tokens, pos); makeParser exposes
// the two entry points — a full file, or a bare expression (f-string fragments etc.)
function makeParser(tokens: Token[]) {
  let pos = 0;

  const peek = () => tokens[pos];
  const at = (raw: string) => tokens[pos].type === 'IDENT' && tokens[pos].raw === raw;
  const check = (type: TT) => tokens[pos].type === type;

  function eat(type: TT, raw?: string): Token {
    const t = tokens[pos];
    if (t.type !== type || (raw != null && t.raw !== raw)) {
      const got = t.type === 'IDENT' ? `"${t.raw}"` : t.type;
      const want = raw ? `"${raw}"` : type;
      throw new CompileError(`expected ${want}, got ${got}`, t.line, t.col);
    }
    pos++;
    return t;
  }

  const eatIdent = () => eat('IDENT').raw;
  const skipNL = () => {
    while (check('NL')) pos++;
  };

  function endStmt() {
    if (!check('NL') && !check('RC') && !check('EOF')) {
      const t = peek();
      throw new CompileError(`expected end of statement, got ${t.type} "${t.raw}"`, t.line, t.col);
    }
    skipNL();
  }

  function parseExpr(): Expr {
    return parseArrow();
  }

  function parseArrow(): Expr {
    const l = parseOr();
    if (check('ARROW')) {
      pos++;
      return { k: 'arrow', from: l, to: parseOr() };
    }
    return l;
  }

  function parseOr(): Expr {
    let l = parseAnd();
    while (at('or')) {
      pos++;
      l = { k: 'bin', op: 'or', l, r: parseAnd() };
    }
    return l;
  }

  function parseAnd(): Expr {
    let l = parseNot();
    while (at('and')) {
      pos++;
      l = { k: 'bin', op: 'and', l, r: parseNot() };
    }
    return l;
  }

  function parseNot(): Expr {
    if (at('not')) {
      pos++;
      return { k: 'un', op: 'not', e: parseNot() };
    }
    return parseCmp();
  }

  function parseCmp(): Expr {
    const l = parseAdd();
    const ops: Record<TT, string> = {
      EQ: '==',
      NEQ: '!=',
      LT: '<',
      LTE: '<=',
      GT: '>',
      GTE: '>=',
    } as any;
    const op = ops[peek().type as TT];
    if (op) {
      pos++;
      return { k: 'bin', op, l, r: parseAdd() };
    }
    return l;
  }

  function parseAdd(): Expr {
    let l = parseMul();
    while (check('PLUS') || check('MINUS')) {
      const op = tokens[pos++].raw;
      l = { k: 'bin', op, l, r: parseMul() };
    }
    return l;
  }

  function parseMul(): Expr {
    let l = parseUnary();
    while (check('STAR') || check('SLASH') || check('PCT')) {
      const op = tokens[pos++].raw;
      l = { k: 'bin', op, l, r: parseUnary() };
    }
    return l;
  }

  function parseUnary(): Expr {
    if (check('MINUS') || check('PLUS')) {
      const op = tokens[pos++].raw;
      return { k: 'un', op, e: parsePow() };
    }
    return parsePow();
  }

  function parsePow(): Expr {
    const l = parsePostfix();
    if (check('CARET')) {
      pos++;
      return { k: 'bin', op: '^', l, r: parseUnary() };
    }
    return l;
  }

  function parsePostfix(): Expr {
    let l = parsePrimary();
    while (check('LP')) {
      if (l.k !== 'id') break;
      pos++;
      const args: Expr[] = [];
      while (!check('RP') && !check('EOF')) {
        args.push(parseExpr());
        if (!check('RP')) eat('COMMA');
      }
      eat('RP');
      l = { k: 'call', fn: l.name, args };
    }
    if (check('DOT')) {
      const t = peek();
      throw new CompileError(
        'member access ("a.b") is not supported — positions are expressions of state',
        t.line,
        t.col
      );
    }
    return l;
  }

  function parsePrimary(): Expr {
    const t = tokens[pos];

    if (t.type === 'NUM') {
      pos++;
      return { k: 'num', v: parseFloat(t.raw) };
    }

    if (t.type === 'STR') {
      pos++;
      return { k: 'str', v: t.raw, fstr: false };
    }

    if (t.type === 'FSTR') {
      pos++;
      return { k: 'str', v: t.raw, fstr: true };
    }

    if (t.type === 'IDENT') {
      if (t.raw === 'true') {
        pos++;
        return { k: 'bool', v: true };
      }
      if (t.raw === 'false') {
        pos++;
        return { k: 'bool', v: false };
      }
      if (t.raw === 'None') {
        // used to silently become Infinity, which made baffling off-screen geometry
        throw new CompileError('"None" is not supported — omit the prop instead', t.line, t.col);
      }
      pos++;
      return { k: 'id', name: t.raw };
    }

    if (t.type === 'LP') {
      pos++;
      if (check('RP')) {
        pos++;
        return { k: 'tuple', items: [] };
      }
      const first = parseExpr();
      if (check('COMMA')) {
        pos++;
        const items = [first];
        while (!check('RP') && !check('EOF')) {
          items.push(parseExpr());
          if (!check('RP')) eat('COMMA');
        }
        eat('RP');
        return { k: 'tuple', items };
      }
      eat('RP');
      return first;
    }

    if (t.type === 'LB') {
      pos++;
      const items: Expr[] = [];
      while (!check('RB') && !check('EOF')) {
        items.push(parseExpr());
        if (!check('RB')) eat('COMMA');
      }
      eat('RB');
      return { k: 'list', items };
    }

    if (t.type === 'LC') {
      pos++;
      skipNL();
      const entries: [string, Expr][] = [];
      while (!check('RC') && !check('EOF')) {
        const key = eatIdent();
        eat('COLON');
        entries.push([key, parseExpr()]);
        if (check('COMMA')) pos++;
        skipNL();
      }
      eat('RC');
      return { k: 'dict', entries };
    }

    throw new CompileError(`unexpected token "${t.raw}" (${t.type})`, t.line, t.col);
  }

  // trailing `{ key: value, ... }` modifier block. optional — omit entirely if
  // there's nothing to configure. lines can be newline- or comma-separated (or both).
  function parsePropsBlock(): PropMap {
    const props: PropMap = new Map();
    if (!check('LC')) return props;
    pos++;
    skipNL();
    while (!check('RC') && !check('EOF')) {
      const key = eatIdent();
      if (check('COLON')) {
        pos++;
        props.set(key, parseExpr());
      } else {
        props.set(key, true);
      }
      if (check('COMMA')) pos++;
      skipNL();
    }
    eat('RC');
    return props;
  }

  function parseBraceBlock(): Stmt[] {
    eat('LC');
    skipNL();
    const stmts: Stmt[] = [];
    while (!check('RC') && !check('EOF')) {
      const s = parseStmt();
      if (s) stmts.push(s);
      skipNL();
    }
    eat('RC');
    return stmts;
  }

  function parseStmt(): Stmt | null {
    skipNL();
    const tok = tokens[pos];
    if (tok.type === 'EOF' || tok.type === 'RC') return null;

    const ln = tok.line;

    if (tok.type !== 'IDENT') {
      throw new CompileError(`expected statement, got ${tok.type}`, tok.line, tok.col);
    }

    switch (tok.raw) {
      case 'param':
        return parseParam(ln);
      case 'bool':
        return parseBoolDecl(ln);
      case 'let':
        return parseLet(ln);
      case 'def':
        return parseDef(ln);
      case 'for':
        return parseFor(ln);
      case 'if':
        return parseIf(ln);
      case 'curve':
        return parseCurve(ln);
      case 'area':
        return parseArea(ln);
      case 'point':
        return parsePoint(ln);
      case 'line':
        return parseLine(ln);
      case 'label':
        return parseLabel(ln);
      case 'rect':
        return parseRect(ln);
      case 'circle':
        return parseCircle(ln);
      case 'polygon':
        return parsePolygon(ln);
      case 'vector':
        return parseVector(ln);
      case 'arc':
        return parseArc(ln);
      case 'slider':
        return parseSlider(ln);
      case 'toggle':
        return parseToggle(ln);
      case 'stepper':
        return parseStepper(ln);
      case 'button':
        return parseButton(ln);
      case 'step':
        return parseStep(ln);
      default:
        return parseCallStmt(ln);
    }
  }

  function parseScene(ln: number): Stmt {
    eat('IDENT', 'scene');
    const spaceType = eatIdent();
    eat('LC');
    skipNL();
    const props: PropMap = new Map();
    const children: Stmt[] = [];
    while (!check('RC') && !check('EOF')) {
      if (check('IDENT') && SPACE_PROPS.has(peek().raw)) {
        const key = eatIdent();
        if (check('COLON')) {
          pos++;
          props.set(key, parseExpr());
        } else {
          props.set(key, true);
        }
        endStmt();
      } else {
        const s = parseStmt();
        if (s) children.push(s);
        skipNL();
      }
    }
    eat('RC');
    return { k: 'scene', spaceType, props, children, ln };
  }

  // --- lesson-level grammar -------------------------------------------------

  function parseLesson(ln: number): Stmt {
    eat('IDENT', 'lesson');
    const title = eatStr();
    eat('LC');
    skipNL();
    const props: PropMap = new Map();
    const slides: SlideStmt[] = [];
    while (!check('RC') && !check('EOF')) {
      skipNL();
      if (check('RC') || check('EOF')) break;
      if (at('slide')) {
        slides.push(parseSlide(peek().line));
        skipNL();
      } else if (at('def')) {
        const t = peek();
        throw new CompileError(
          'lesson-level macros are not supported yet — define `def` inside a scene',
          t.line,
          t.col
        );
      } else if (check('IDENT')) {
        const key = eatIdent();
        eat('COLON');
        props.set(key, parseExpr());
        endStmt();
      } else {
        const t = peek();
        throw new CompileError(`expected a slide or lesson property, got ${t.type}`, t.line, t.col);
      }
    }
    eat('RC');
    return { k: 'lesson', title, props, slides, ln };
  }

  const SLIDE_PROPS = new Set(['cat', 'id', 'skill']);

  function parseSlide(ln: number): SlideStmt {
    eat('IDENT', 'slide');
    const title = eatStr();
    eat('LC');
    skipNL();
    const props: PropMap = new Map();
    const items: Stmt[] = [];
    while (!check('RC') && !check('EOF')) {
      skipNL();
      if (check('RC') || check('EOF')) break;
      if (check('PROSE')) {
        items.push(parseProse());
      } else if (at('scene')) {
        items.push(parseScene(peek().line));
        skipNL();
      } else if (at('goal')) {
        items.push(parseGoal(peek().line));
      } else if (at('quiz')) {
        items.push(parseQuiz(peek().line));
      } else if (at('numeric')) {
        items.push(parseNumeric(peek().line));
      } else if (at('build')) {
        items.push(parseBuild(peek().line));
      } else if (check('IDENT') && SLIDE_PROPS.has(peek().raw)) {
        const key = eatIdent();
        eat('COLON');
        props.set(key, parseExpr());
        endStmt();
      } else {
        const t = peek();
        const what = t.type === 'IDENT' ? `"${t.raw}"` : t.type;
        throw new CompileError(`unexpected ${what} in slide`, t.line, t.col);
      }
    }
    eat('RC');
    return { k: 'slide', title, props, items, ln };
  }

  function parseProse(): Stmt {
    const ln = peek().line;
    const parts: string[] = [];
    while (check('PROSE')) {
      parts.push(peek().raw);
      pos++;
      skipNL();
    }
    return { k: 'prose', text: parts.join('\n'), ln };
  }

  function parseGoal(ln: number): Stmt {
    eat('IDENT', 'goal');
    const prompt = eatStr();
    const props = parsePropsBlock();
    endStmt();
    return { k: 'goal', prompt, props, ln };
  }

  // a bracketed list of strings: ["(", ")", "x", "+"]
  function parseStrList(): string[] {
    eat('LB');
    const out: string[] = [];
    while (!check('RB') && !check('EOF')) {
      out.push(eatStr());
      if (!check('RB')) eat('COMMA');
    }
    eat('RB');
    return out;
  }

  // ask / hint / skill / ! lines are shared by every exercise kind. returns
  // true if it consumed a common line, false if the caller should handle it.
  function parseCommonLine(common: ExerciseCommon): boolean {
    if (at('ask')) {
      pos++;
      common.ask = eatStr();
      endStmt();
      return true;
    }
    if (at('hint')) {
      pos++;
      common.hints.push(eatStr());
      endStmt();
      return true;
    }
    if (at('skill')) {
      pos++;
      eat('COLON');
      common.skill = eatStr();
      endStmt();
      return true;
    }
    if (check('BANG')) {
      pos++;
      common.explanation = eatStr();
      endStmt();
      return true;
    }
    return false;
  }

  function parseQuiz(ln: number): Stmt {
    eat('IDENT', 'quiz');
    eat('LC');
    skipNL();
    const options: QuizOption[] = [];
    const common: ExerciseCommon = { ask: '', hints: [] };
    while (!check('RC') && !check('EOF')) {
      if (parseCommonLine(common)) continue;
      if (check('MINUS') || check('STAR')) {
        const correct = check('STAR');
        pos++;
        const text = eatStr();
        let why: string | undefined;
        if (check('LC')) {
          const p = parsePropsBlock();
          const w = p.get('why');
          if (w && w !== true && w.k === 'str') why = w.v;
        }
        options.push({ text, correct, why });
        endStmt();
      } else {
        const t = peek();
        const what = t.type === 'IDENT' ? `"${t.raw}"` : t.type;
        throw new CompileError(`unexpected ${what} in quiz — use ask/-/*/!/hint`, t.line, t.col);
      }
    }
    eat('RC');
    return { k: 'quiz', options, common, ln };
  }

  function parseNumeric(ln: number): Stmt {
    eat('IDENT', 'numeric');
    eat('LC');
    skipNL();
    const answers: Expr[] = [];
    let tolerance: Expr | null = null;
    let unit: string | null = null;
    const common: ExerciseCommon = { ask: '', hints: [] };
    while (!check('RC') && !check('EOF')) {
      if (parseCommonLine(common)) continue;
      if (at('answer')) {
        pos++;
        eat('COLON');
        answers.push(parseExpr()); // any listed value is accepted
        endStmt();
      } else if (at('tolerance')) {
        pos++;
        eat('COLON');
        tolerance = parseExpr();
        endStmt();
      } else if (at('unit')) {
        pos++;
        eat('COLON');
        unit = eatStr();
        endStmt();
      } else {
        const t = peek();
        const what = t.type === 'IDENT' ? `"${t.raw}"` : t.type;
        throw new CompileError(
          `unexpected ${what} in numeric — use ask/answer/tolerance/unit/hint/!`,
          t.line,
          t.col
        );
      }
    }
    eat('RC');
    return { k: 'numeric', answers, tolerance, unit, common, ln };
  }

  function parseBuild(ln: number): Stmt {
    eat('IDENT', 'build');
    eat('LC');
    skipNL();
    const bank: string[] = [];
    const answers: string[][] = [];
    let slots: number | null = null;
    let reusable = false;
    const common: ExerciseCommon = { ask: '', hints: [] };
    while (!check('RC') && !check('EOF')) {
      if (parseCommonLine(common)) continue;
      if (at('bank')) {
        pos++;
        eat('COLON');
        bank.push(...parseStrList());
        endStmt();
      } else if (at('answer')) {
        pos++;
        eat('COLON');
        answers.push(parseStrList());
        endStmt();
      } else if (at('slots')) {
        pos++;
        eat('COLON');
        slots = parseFloat(eat('NUM').raw);
        endStmt();
      } else if (at('reusable')) {
        pos++;
        reusable = true;
        endStmt();
      } else {
        const t = peek();
        const what = t.type === 'IDENT' ? `"${t.raw}"` : t.type;
        throw new CompileError(
          `unexpected ${what} in build — use ask/bank/answer/slots/reusable/hint/!`,
          t.line,
          t.col
        );
      }
    }
    eat('RC');
    return { k: 'build', bank, answers, slots, reusable, common, ln };
  }

  function parseParam(ln: number): Stmt {
    eat('IDENT', 'param');
    const name = eatIdent();
    eat('ASSIGN');
    const init = parseExpr();
    const props = parsePropsBlock();
    endStmt();
    return { k: 'param', name, init, props, ln };
  }

  function parseBoolDecl(ln: number): Stmt {
    eat('IDENT', 'bool');
    const name = eatIdent();
    eat('ASSIGN');
    const init = parseExpr();
    endStmt();
    return { k: 'bool_d', name, init, ln };
  }

  function parseLet(ln: number): Stmt {
    eat('IDENT', 'let');
    const name = eatIdent();
    eat('ASSIGN');
    const value = parseExpr();
    endStmt();
    return { k: 'let', name, value, ln };
  }

  function parseDef(ln: number): Stmt {
    eat('IDENT', 'def');
    const name = eatIdent();
    eat('LP');
    const params: string[] = [];
    while (!check('RP') && !check('EOF')) {
      params.push(eatIdent());
      if (!check('RP')) eat('COMMA');
    }
    eat('RP');
    const body = parseBraceBlock();
    return { k: 'def', name, params, body, ln };
  }

  function parseFor(ln: number): Stmt {
    eat('IDENT', 'for');
    const varName = eatIdent();
    eat('IDENT', 'in');
    eat('IDENT', 'range');
    eat('LP');
    const start = parseExpr();
    eat('COMMA');
    const end = parseExpr();
    let step: Expr | null = null;
    if (check('COMMA')) {
      pos++;
      step = parseExpr();
    }
    eat('RP');
    const body = parseBraceBlock();
    return { k: 'for_s', var: varName, start, end, step, body, ln };
  }

  function parseIf(ln: number): Stmt {
    const cases: IfCase[] = [];
    let elseBody: Stmt[] | null = null;

    eat('IDENT', 'if');
    const cond = parseOr();
    cases.push({ cond, body: parseBraceBlock() });

    while (true) {
      skipNL();
      if (at('elif')) {
        pos++;
        const c = parseOr();
        cases.push({ cond: c, body: parseBraceBlock() });
      } else if (at('else')) {
        pos++;
        elseBody = parseBraceBlock();
        break;
      } else break;
    }
    return { k: 'if_s', cases, elseBody, ln };
  }

  function parseId(): Expr {
    const t = tokens[pos];
    if (t.type === 'IDENT') {
      pos++;
      return { k: 'id', name: t.raw };
    }
    if (t.type === 'FSTR') {
      pos++;
      return { k: 'str', v: t.raw, fstr: true };
    }
    if (t.type === 'STR') {
      pos++;
      return { k: 'str', v: t.raw, fstr: false };
    }
    throw new CompileError(`expected object id, got ${t.type}`, t.line, t.col);
  }

  function parseCurve(ln: number): Stmt {
    eat('IDENT', 'curve');
    const id = parseId();
    eat('ASSIGN');
    const expr = parseExpr();
    const props = parsePropsBlock();
    endStmt();
    return { k: 'curve', id, expr, props, ln };
  }

  // same shape as curve: area <id> = <upper expr> { from, to, lower, opacity, ... }
  function parseArea(ln: number): Stmt {
    eat('IDENT', 'area');
    const id = parseId();
    eat('ASSIGN');
    const expr = parseExpr();
    const props = parsePropsBlock();
    endStmt();
    return { k: 'area', id, expr, props, ln };
  }

  function parsePoint(ln: number): Stmt {
    eat('IDENT', 'point');
    const id = parseId();
    let pos_: Expr | null = null;
    if (check('ASSIGN')) {
      eat('ASSIGN');
      pos_ = parseExpr();
    }
    const props = parsePropsBlock();
    endStmt();
    return { k: 'point', id, pos: pos_, props, ln };
  }

  function parseLine(ln: number): Stmt {
    eat('IDENT', 'line');
    const id = parseId();
    let seg: [Expr, Expr] | null = null;
    if (check('ASSIGN')) {
      eat('ASSIGN');
      const e = parseExpr();
      if (e.k !== 'arrow') throw new CompileError('line segment must be (x1,y1) -> (x2,y2)', ln);
      seg = [e.from, e.to];
    }
    const props = parsePropsBlock();
    endStmt();
    return { k: 'line', id, seg, props, ln };
  }

  function parseLabel(ln: number): Stmt {
    eat('IDENT', 'label');
    let id: Expr | null = null;
    if (check('IDENT') && tokens[pos].raw !== 'at') {
      id = parseId();
    } else if (check('FSTR') || check('STR')) {
      id = parseId();
    }
    eat('IDENT', 'at');
    const at = parseExpr();
    eat('ASSIGN');
    const text = parseExpr();
    const props = parsePropsBlock();
    endStmt();
    return { k: 'label', id, at, text, props, ln };
  }

  function parseRect(ln: number): Stmt {
    eat('IDENT', 'rect');
    const id = parseId();
    eat('ASSIGN');
    const pos_ = parseExpr();
    const props = parsePropsBlock();
    endStmt();
    return { k: 'rect', id, pos: pos_, props, ln };
  }

  function parseCircle(ln: number): Stmt {
    eat('IDENT', 'circle');
    const id = parseId();
    eat('ASSIGN');
    const center = parseExpr();
    const props = parsePropsBlock();
    endStmt();
    return { k: 'circle', id, center, props, ln };
  }

  function parsePolygon(ln: number): Stmt {
    eat('IDENT', 'polygon');
    const id = parseId();
    eat('ASSIGN');
    const listExpr = parseExpr();
    if (listExpr.k !== 'list') throw new CompileError('polygon needs [...] point list', ln);
    const props = parsePropsBlock();
    endStmt();
    return { k: 'polygon', id, pts: listExpr.items, props, ln };
  }

  function parseVector(ln: number): Stmt {
    eat('IDENT', 'vector');
    const id = parseId();
    eat('ASSIGN');
    const e = parseExpr();
    if (e.k !== 'arrow') throw new CompileError('vector must be (x1,y1) -> (x2,y2)', ln);
    const props = parsePropsBlock();
    endStmt();
    return { k: 'vector', id, from: e.from, to: e.to, props, ln };
  }

  function parseArc(ln: number): Stmt {
    eat('IDENT', 'arc');
    const id = parseId();
    eat('ASSIGN');
    const center = parseExpr();
    const props = parsePropsBlock();
    endStmt();
    return { k: 'arc', id, center, props, ln };
  }

  function parseSlider(ln: number): Stmt {
    eat('IDENT', 'slider');
    const bind = eatIdent();
    const props = parsePropsBlock();
    endStmt();
    return { k: 'slider', bind, props, ln };
  }

  function parseToggle(ln: number): Stmt {
    eat('IDENT', 'toggle');
    const bind = eatIdent();
    const props = parsePropsBlock();
    endStmt();
    return { k: 'toggle', bind, props, ln };
  }

  function parseStepper(ln: number): Stmt {
    eat('IDENT', 'stepper');
    const bind = eatIdent();
    const props = parsePropsBlock();
    endStmt();
    return { k: 'stepper', bind, props, ln };
  }

  function parseButton(ln: number): Stmt {
    eat('IDENT', 'button');
    const label = eatStr();
    const props = parsePropsBlock();
    endStmt();
    return { k: 'button', label, props, ln };
  }

  function parseStep(ln: number): Stmt {
    eat('IDENT', 'step');
    let narrate: string | null = null;
    if (check('STR') || check('FSTR')) narrate = eatStr();
    const props = parsePropsBlock();
    endStmt();
    return { k: 'step', narrate, props, ln };
  }

  function parseCallStmt(ln: number): Stmt {
    const fn = eatIdent();
    eat('LP');
    const args: Expr[] = [];
    while (!check('RP') && !check('EOF')) {
      args.push(parseExpr());
      if (!check('RP')) eat('COMMA');
    }
    eat('RP');
    endStmt();
    return { k: 'call_s', fn, args, ln };
  }

  function eatStr(): string {
    const tok = tokens[pos];
    if (tok.type !== 'STR' && tok.type !== 'FSTR') {
      throw new CompileError(`expected string, got ${tok.type}`, tok.line, tok.col);
    }
    pos++;
    return tok.raw;
  }

  function parseFile(): Stmt[] {
    skipNL();
    if (at('lesson')) {
      const lesson = parseLesson(peek().line);
      skipNL();
      if (!check('EOF')) {
        const t = peek();
        throw new CompileError('unexpected content after the lesson block', t.line, t.col);
      }
      return [lesson];
    }
    if (!at('scene')) {
      const t = peek();
      throw new CompileError(
        'a Prism file must start with a "scene <type> { ... }" or "lesson" block',
        t.line,
        t.col
      );
    }
    const scene = parseScene(peek().line);
    skipNL();
    if (!check('EOF')) {
      const t = peek();
      throw new CompileError('unexpected content after the scene block', t.line, t.col);
    }
    return [scene];
  }

  function parseBareExpr(): Expr {
    skipNL();
    const e = parseExpr();
    skipNL();
    if (!check('EOF')) {
      const t = peek();
      throw new CompileError(`unexpected "${t.raw}" after expression`, t.line, t.col);
    }
    return e;
  }

  return { parseFile, parseBareExpr };
}

export function parse(tokens: Token[]): Stmt[] {
  return makeParser(tokens).parseFile();
}

// parse a standalone expression string into an Expr tree — used by the emitter
// for f-string fragments, and later by the legacy-content converter
export function parseExprTokens(tokens: Token[]): Expr {
  return makeParser(tokens).parseBareExpr();
}
