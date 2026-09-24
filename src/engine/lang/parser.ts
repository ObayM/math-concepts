import type { Token, TT } from './tokens';
import type {
  Expr,
  PropMap,
  Stmt,
  IfCase,
  SlideStmt,
  QuizOption,
  Branch,
  WrongAnswer,
  ExerciseCommon,
  HotspotTarget,
} from './ast';
import { CompileError } from './errors';

const SPACE_PROPS = new Set(['x', 'y', 'z', 'camera', 'grid', 'axes', 'aspect']);

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
      case 'choice':
        return parseChoice(ln);
      case 'let':
        return parseLet(ln);
      case 'def':
        return parseDef(ln);
      case 'for':
        return parseFor(ln);
      case 'repeat':
        return parseRepeat(ln);
      case 'if':
        return parseIf(ln);
      case 'reveal':
        return parseReveal(ln);
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
      case 'image':
        return parseImage(ln);
      case 'point3':
        return parsePoint3(ln);
      case 'segment3':
        return parseSegment3(ln);
      case 'polygon3':
        return parsePolygon3(ln);
      case 'plane3':
        return parsePlane3(ln);
      case 'label3':
        return parseLabel3(ln);
      case 'slider':
        return parseSlider(ln);
      case 'toggle':
        return parseToggle(ln);
      case 'stepper':
        return parseStepper(ln);
      case 'picker':
        return parsePicker(ln);
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
    const defs: Extract<Stmt, { k: 'def' }>[] = [];
    while (!check('RC') && !check('EOF')) {
      skipNL();
      if (check('RC') || check('EOF')) break;
      if (at('slide')) {
        slides.push(parseSlide(peek().line));
        skipNL();
      } else if (at('def')) {
        defs.push(parseDef(peek().line) as Extract<Stmt, { k: 'def' }>);
        skipNL();
      } else if (check('IDENT')) {
        const t = peek();
        const key = eatIdent();
        if (!LESSON_PROPS.has(key)) {
          throw new CompileError(`unknown lesson property "${key}"`, t.line, t.col);
        }
        eat('COLON');
        props.set(key, parseExpr());
        endStmt();
      } else {
        const t = peek();
        throw new CompileError(`expected a slide or lesson property, got ${t.type}`, t.line, t.col);
      }
    }
    eat('RC');
    return { k: 'lesson', title, props, slides, defs, ln };
  }

  const LESSON_PROPS = new Set(['course', 'skills', 'unit', 'difficulty', 'icon', 'summary']);

  const SLIDE_PROPS = new Set(['cat', 'id', 'skill', 'hidden', 'beat']);

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
      } else if (at('hotspot')) {
        items.push(parseHotspot(peek().line));
      } else if (at('sketch')) {
        items.push(parseSketch(peek().line));
      } else if (at('match')) {
        items.push(parseMatch(peek().line));
      } else if (at('order')) {
        items.push(parseOrder(peek().line));
      } else if (at('sort')) {
        items.push(parseSort(peek().line));
      } else if (at('table')) {
        items.push(parseTable(peek().line));
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
    if (at('expect')) {
      const ln = peek().line;
      pos++;
      eat('COLON');
      common.expect = { expr: parseExpr(), ln };
      endStmt();
      return true;
    }
    if (at('onwrong')) {
      pos++;
      eat('COLON');
      const target = eatStr();
      let retry = false;
      if (at('retry')) {
        pos++;
        retry = true;
      }
      common.onwrong = { slide: target, retry };
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
        let onwrong: Branch | undefined;
        if (check('LC')) {
          const optLine = peek().line;
          const p = parsePropsBlock();
          const w = p.get('why');
          if (w && w !== true && w.k === 'str') why = w.v;
          const o = p.get('onwrong');
          if (o !== undefined) {
            if (o === true || o.k !== 'str')
              throw new CompileError('onwrong: on an option needs a slide id string', optLine);
            onwrong = { slide: o.v, retry: p.get('retry') === true };
          } else if (p.has('retry')) {
            throw new CompileError('retry only means something next to onwrong:', optLine);
          }
        }
        options.push({ text, correct, why, ...(onwrong && { onwrong }) });
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
    const wrong: WrongAnswer[] = [];
    const common: ExerciseCommon = { ask: '', hints: [] };
    while (!check('RC') && !check('EOF')) {
      if (parseCommonLine(common)) continue;
      if (at('wrong')) {
        const wln = peek().line;
        pos++;
        const value = parseOr();
        const entry: WrongAnswer = { value, ln: wln };
        if (check('STR')) entry.why = eatStr();
        if (check('ARROW')) {
          pos++;
          const slide = eatStr();
          let retry = false;
          if (at('retry')) {
            pos++;
            retry = true;
          }
          entry.onwrong = { slide, retry };
        }
        if (!entry.why && !entry.onwrong)
          throw new CompileError('wrong <value> needs a "why" or a -> "detour-id"', wln);
        wrong.push(entry);
        endStmt();
      } else if (at('answer')) {
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
          `unexpected ${what} in numeric - use ask/answer/wrong/tolerance/unit/hint/!`,
          t.line,
          t.col
        );
      }
    }
    eat('RC');
    return { k: 'numeric', answers, tolerance, unit, wrong, common, ln };
  }

  function parseBuild(ln: number): Stmt {
    eat('IDENT', 'build');
    eat('LC');
    skipNL();
    const bank: string[] = [];
    const answers: string[][] = [];
    let slots: number | null = null;
    let template: string | null = null;
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
      } else if (at('template')) {
        pos++;
        eat('COLON');
        template = eatStr();
        endStmt();
      } else if (at('reusable')) {
        pos++;
        reusable = true;
        endStmt();
      } else {
        const t = peek();
        const what = t.type === 'IDENT' ? `"${t.raw}"` : t.type;
        throw new CompileError(
          `unexpected ${what} in build — use ask/bank/answer/slots/template/reusable/hint/!`,
          t.line,
          t.col
        );
      }
    }
    eat('RC');
    return { k: 'build', bank, answers, slots, template, reusable, common, ln };
  }

  function parseHotspot(ln: number): Stmt {
    eat('IDENT', 'hotspot');
    eat('LC');
    skipNL();
    let target: HotspotTarget | null = null;
    let miss: string | null = null;
    const common: ExerciseCommon = { ask: '', hints: [] };
    while (!check('RC') && !check('EOF')) {
      if (parseCommonLine(common)) continue;
      if (at('target')) {
        pos++;
        if (target) throw new CompileError('hotspot can have only one target', peek().line);
        if (!at('rect') && !at('circle')) {
          const t = peek();
          throw new CompileError('target needs a shape — "rect" or "circle"', t.line, t.col);
        }
        const kind = eatIdent() as 'rect' | 'circle';
        const shapePos = parseExpr();
        const props = parsePropsBlock();
        target = { kind, pos: shapePos, props };
        endStmt();
      } else if (at('miss')) {
        pos++;
        miss = eatStr();
        endStmt();
      } else {
        const t = peek();
        const what = t.type === 'IDENT' ? `"${t.raw}"` : t.type;
        throw new CompileError(
          `unexpected ${what} in hotspot — use ask/target/miss/hint/!`,
          t.line,
          t.col
        );
      }
    }
    eat('RC');
    return { k: 'hotspot', target, miss, common, ln };
  }

  function parseSketch(ln: number): Stmt {
    eat('IDENT', 'sketch');
    if (!at('curve') && !at('points') && !at('line')) {
      const t = peek();
      throw new CompileError('sketch needs a mode — "curve", "points", or "line"', t.line, t.col);
    }
    const mode = eatIdent() as 'curve' | 'points' | 'line';
    eat('LC');
    skipNL();
    const near: Expr[] = [];
    let through: Expr | null = null;
    let slope: Expr | null = null;
    let tol: Expr | null = null;
    let slopeTol: Expr | null = null;
    let follows: Expr | null = null;
    let over: Expr | null = null;
    const common: ExerciseCommon = { ask: '', hints: [] };
    while (!check('RC') && !check('EOF')) {
      if (parseCommonLine(common)) continue;
      if (at('follows')) {
        pos++;
        eat('COLON');
        follows = parseExpr();
        endStmt();
      } else if (at('over')) {
        pos++;
        eat('COLON');
        over = parseExpr();
        endStmt();
      } else if (at('near')) {
        pos++;
        near.push(parseExpr());
        endStmt();
      } else if (at('through')) {
        pos++;
        through = parseExpr();
        endStmt();
      } else if (at('slope')) {
        pos++;
        eat('COLON');
        slope = parseExpr();
        endStmt();
      } else if (at('tol')) {
        pos++;
        eat('COLON');
        tol = parseExpr();
        endStmt();
      } else if (at('slopeTol')) {
        pos++;
        eat('COLON');
        slopeTol = parseExpr();
        endStmt();
      } else {
        const t = peek();
        const what = t.type === 'IDENT' ? `"${t.raw}"` : t.type;
        throw new CompileError(
          `unexpected ${what} in sketch - use ask/near/follows/over/through/slope/tol/hint/!`,
          t.line,
          t.col
        );
      }
    }
    eat('RC');
    return { k: 'sketch', mode, near, through, slope, tol, slopeTol, follows, over, common, ln };
  }

  function parseMatch(ln: number): Stmt {
    eat('IDENT', 'match');
    eat('LC');
    skipNL();
    const pairs: [Expr, Expr][] = [];
    const decoys: string[] = [];
    const common: ExerciseCommon = { ask: '', hints: [] };
    while (!check('RC') && !check('EOF')) {
      if (parseCommonLine(common)) continue;
      if (at('pair')) {
        pos++;
        const e = parseExpr();
        if (e.k !== 'arrow') throw new CompileError('pair must be "left" -> "right"', ln);
        pairs.push([e.from, e.to]);
        endStmt();
      } else if (at('decoy')) {
        pos++;
        decoys.push(eatStr());
        endStmt();
      } else {
        const t = peek();
        const what = t.type === 'IDENT' ? `"${t.raw}"` : t.type;
        throw new CompileError(
          `unexpected ${what} in match — use ask/pair/decoy/hint/!`,
          t.line,
          t.col
        );
      }
    }
    eat('RC');
    return { k: 'match', pairs, decoys, common, ln };
  }

  function parseOrder(ln: number): Stmt {
    eat('IDENT', 'order');
    eat('LC');
    skipNL();
    const orderItems: string[] = [];
    const decoys: string[] = [];
    const common: ExerciseCommon = { ask: '', hints: [] };
    while (!check('RC') && !check('EOF')) {
      if (parseCommonLine(common)) continue;
      if (at('item')) {
        pos++;
        orderItems.push(eatStr());
        endStmt();
      } else if (at('decoy')) {
        pos++;
        decoys.push(eatStr());
        endStmt();
      } else {
        const t = peek();
        const what = t.type === 'IDENT' ? `"${t.raw}"` : t.type;
        throw new CompileError(
          `unexpected ${what} in order - use ask/item/decoy/hint/!`,
          t.line,
          t.col
        );
      }
    }
    eat('RC');
    return { k: 'order', items: orderItems, decoys, common, ln };
  }

  function parseSort(ln: number): Stmt {
    eat('IDENT', 'sort');
    eat('LC');
    skipNL();
    const bins: { label: string; items: string[] }[] = [];
    const common: ExerciseCommon = { ask: '', hints: [] };
    while (!check('RC') && !check('EOF')) {
      if (parseCommonLine(common)) continue;
      if (at('bin')) {
        pos++;
        const label = eatStr();
        eat('COLON');
        bins.push({ label, items: parseStrList() });
        endStmt();
      } else {
        const t = peek();
        const what = t.type === 'IDENT' ? `"${t.raw}"` : t.type;
        throw new CompileError(`unexpected ${what} in sort - use ask/bin/hint/!`, t.line, t.col);
      }
    }
    eat('RC');
    return { k: 'sort', bins, common, ln };
  }

  function parseTable(ln: number): Stmt {
    eat('IDENT', 'table');
    eat('LC');
    skipNL();
    let header: string[] | null = null;
    const rows: Expr[][] = [];
    let tolerance: Expr | null = null;
    const common: ExerciseCommon = { ask: '', hints: [] };
    while (!check('RC') && !check('EOF')) {
      if (parseCommonLine(common)) continue;
      if (at('header')) {
        pos++;
        eat('COLON');
        header = parseStrList();
        endStmt();
      } else if (at('row')) {
        pos++;
        eat('COLON');
        const cells: Expr[] = [parseExpr()];
        while (check('COMMA')) {
          pos++;
          cells.push(parseExpr());
        }
        rows.push(cells);
        endStmt();
      } else if (at('tolerance')) {
        pos++;
        eat('COLON');
        tolerance = parseExpr();
        endStmt();
      } else {
        const t = peek();
        const what = t.type === 'IDENT' ? `"${t.raw}"` : t.type;
        throw new CompileError(
          `unexpected ${what} in table — use ask/header/row/tolerance/hint/!`,
          t.line,
          t.col
        );
      }
    }
    eat('RC');
    return { k: 'table', header, rows, tolerance, common, ln };
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

  function parseChoice(ln: number): Stmt {
    eat('IDENT', 'choice');
    const name = eatIdent();
    eat('ASSIGN');
    const init = parseExpr();
    const props = parsePropsBlock();
    endStmt();
    return { k: 'choice_d', name, init, props, ln };
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

  function parseRepeat(ln: number): Stmt {
    eat('IDENT', 'repeat');
    const varName = eatIdent();
    eat('IDENT', 'in');
    eat('IDENT', 'range');
    eat('LP');
    const start = parseExpr();
    eat('COMMA');
    const count = parseExpr();
    eat('RP');
    const body = parseBraceBlock();
    return { k: 'repeat_s', var: varName, start, count, body, ln };
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

  function parseReveal(ln: number): Stmt {
    eat('IDENT', 'reveal');
    const body = parseBraceBlock();
    return { k: 'reveal', body, ln };
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

  function parsePoint3(ln: number): Stmt {
    eat('IDENT', 'point3');
    const id = parseId();
    eat('ASSIGN');
    const pos_ = parseExpr();
    const props = parsePropsBlock();
    endStmt();
    return { k: 'point3', id, pos: pos_, props, ln };
  }

  function parseSegment3(ln: number): Stmt {
    eat('IDENT', 'segment3');
    const id = parseId();
    eat('ASSIGN');
    const e = parseExpr();
    if (e.k !== 'arrow') throw new CompileError('segment3 must be (x1,y1,z1) -> (x2,y2,z2)', ln);
    const props = parsePropsBlock();
    endStmt();
    return { k: 'segment3', id, from: e.from, to: e.to, props, ln };
  }

  function parsePolygon3(ln: number): Stmt {
    eat('IDENT', 'polygon3');
    const id = parseId();
    eat('ASSIGN');
    const listExpr = parseExpr();
    if (listExpr.k !== 'list') throw new CompileError('polygon3 needs [...] point list', ln);
    const props = parsePropsBlock();
    endStmt();
    return { k: 'polygon3', id, pts: listExpr.items, props, ln };
  }

  function parsePlane3(ln: number): Stmt {
    eat('IDENT', 'plane3');
    const id = parseId();
    const props = parsePropsBlock();
    endStmt();
    return { k: 'plane3', id, props, ln };
  }

  function parseLabel3(ln: number): Stmt {
    eat('IDENT', 'label3');
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
    return { k: 'label3', id, at, text, props, ln };
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

  function parseImage(ln: number): Stmt {
    eat('IDENT', 'image');
    const id = parseId();
    eat('ASSIGN');
    const pos_ = parseExpr();
    const props = parsePropsBlock();
    endStmt();
    return { k: 'image', id, pos: pos_, props, ln };
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

  function parsePicker(ln: number): Stmt {
    eat('IDENT', 'picker');
    const bind = eatIdent();
    const props = parsePropsBlock();
    endStmt();
    return { k: 'picker', bind, props, ln };
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
