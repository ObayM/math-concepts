import type { Token, TT } from './tokens';
import type { Expr, PropMap, Stmt, IfCase } from './ast';
import { CompileError } from './errors';

export function parse(tokens: Token[]): Stmt[] {
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
        pos++;
        return { k: 'num', v: Infinity };
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
      const entries: [string, Expr][] = [];
      while (!check('RC') && !check('EOF')) {
        const key = eatIdent();
        eat('COLON');
        entries.push([key, parseExpr()]);
        if (!check('RC')) eat('COMMA');
      }
      eat('RC');
      return { k: 'dict', entries };
    }

    throw new CompileError(`unexpected token "${t.raw}" (${t.type})`, t.line, t.col);
  }

  function parseProps(): PropMap {
    const props: PropMap = new Map();
    while (check('COMMA')) {
      pos++;
      if (!check('IDENT')) break; // trailing comma guard
      const key = t().raw;
      pos++;
      if (check('COLON')) {
        pos++;
        props.set(key, parseExpr());
      } else {
        props.set(key, true);
      }
    }
    return props;
  }

  const t = () => tokens[pos];

  function expectNL() {
    if (!check('NL') && !check('EOF') && !check('DEDENT')) {
      throw new CompileError(`expected newline, got ${t().type} "${t().raw}"`, t().line, t().col);
    }
    while (check('NL')) pos++;
  }

  function parseBlock(): Stmt[] {
    eat('INDENT');
    skipNL();
    const stmts: Stmt[] = [];
    while (!check('DEDENT') && !check('EOF')) {
      const s = parseStmt();
      if (s) stmts.push(s);
      skipNL();
    }
    if (check('DEDENT')) pos++;
    return stmts;
  }

  function parseStmt(): Stmt | null {
    skipNL();
    const tok = tokens[pos];
    if (tok.type === 'EOF' || tok.type === 'DEDENT') return null;

    const ln = tok.line;

    if (tok.type !== 'IDENT') {
      throw new CompileError(`expected statement, got ${tok.type}`, tok.line, tok.col);
    }

    switch (tok.raw) {
      case 'scene':
        return parseScene(ln);
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
    eat('COMMA');
    const spaceType = eatIdent();
    const props = parseProps();
    expectNL();
    return { k: 'scene', spaceType, props, ln };
  }

  function parseParam(ln: number): Stmt {
    eat('IDENT', 'param');
    const name = eatIdent();
    eat('ASSIGN');
    const init = parseExpr();
    const props = parseProps();
    expectNL();
    return { k: 'param', name, init, props, ln };
  }

  function parseBoolDecl(ln: number): Stmt {
    eat('IDENT', 'bool');
    const name = eatIdent();
    eat('ASSIGN');
    const init = parseExpr();
    expectNL();
    return { k: 'bool_d', name, init, ln };
  }

  function parseLet(ln: number): Stmt {
    eat('IDENT', 'let');
    const name = eatIdent();
    eat('ASSIGN');
    const value = parseExpr();
    expectNL();
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
    eat('COLON');
    expectNL();
    const body = parseBlock();
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
    eat('COLON');
    expectNL();
    const body = parseBlock();
    return { k: 'for_s', var: varName, start, end, step, body, ln };
  }

  function parseIf(ln: number): Stmt {
    const cases: IfCase[] = [];
    let elseBody: Stmt[] | null = null;

    eat('IDENT', 'if');
    const cond = parseOr();
    eat('COLON');
    expectNL();
    cases.push({ cond, body: parseBlock() });

    while (true) {
      skipNL();
      if (at('elif')) {
        pos++;
        const c = parseOr();
        eat('COLON');
        expectNL();
        cases.push({ cond: c, body: parseBlock() });
      } else if (at('else')) {
        pos++;
        eat('COLON');
        expectNL();
        elseBody = parseBlock();
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
    const props = parseProps();
    expectNL();
    return { k: 'curve', id, expr, props, ln };
  }

  function parsePoint(ln: number): Stmt {
    eat('IDENT', 'point');
    const id = parseId();
    let pos_: Expr | null = null;
    if (check('ASSIGN')) {
      eat('ASSIGN');
      pos_ = parseExpr();
    }
    const props = parseProps();
    expectNL();
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
    const props = parseProps();
    expectNL();
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
    eat('COMMA');
    const text = parseExpr();
    const props = parseProps();
    expectNL();
    return { k: 'label', id, at, text, props, ln };
  }

  function parseRect(ln: number): Stmt {
    eat('IDENT', 'rect');
    const id = parseId();
    eat('ASSIGN');
    const pos_ = parseExpr();
    const props = parseProps();
    expectNL();
    return { k: 'rect', id, pos: pos_, props, ln };
  }

  function parseCircle(ln: number): Stmt {
    eat('IDENT', 'circle');
    const id = parseId();
    eat('ASSIGN');
    const center = parseExpr();
    const props = parseProps();
    expectNL();
    return { k: 'circle', id, center, props, ln };
  }

  function parsePolygon(ln: number): Stmt {
    eat('IDENT', 'polygon');
    const id = parseId();
    eat('ASSIGN');
    const listExpr = parseExpr();
    if (listExpr.k !== 'list') throw new CompileError('polygon needs [...] point list', ln);
    const props = parseProps();
    expectNL();
    return { k: 'polygon', id, pts: listExpr.items, props, ln };
  }

  function parseVector(ln: number): Stmt {
    eat('IDENT', 'vector');
    const id = parseId();
    eat('ASSIGN');
    const e = parseExpr();
    if (e.k !== 'arrow') throw new CompileError('vector must be (x1,y1) -> (x2,y2)', ln);
    const props = parseProps();
    expectNL();
    return { k: 'vector', id, from: e.from, to: e.to, props, ln };
  }

  function parseArc(ln: number): Stmt {
    eat('IDENT', 'arc');
    const id = parseId();
    eat('ASSIGN');
    const center = parseExpr();
    const props = parseProps();
    expectNL();
    return { k: 'arc', id, center, props, ln };
  }

  function parseSlider(ln: number): Stmt {
    eat('IDENT', 'slider');
    const bind = eatIdent();
    const props = parseProps();
    expectNL();
    return { k: 'slider', bind, props, ln };
  }

  function parseToggle(ln: number): Stmt {
    eat('IDENT', 'toggle');
    const bind = eatIdent();
    const props = parseProps();
    expectNL();
    return { k: 'toggle', bind, props, ln };
  }

  function parseStepper(ln: number): Stmt {
    eat('IDENT', 'stepper');
    const bind = eatIdent();
    const props = parseProps();
    expectNL();
    return { k: 'stepper', bind, props, ln };
  }

  function parseButton(ln: number): Stmt {
    eat('IDENT', 'button');
    const label = eatStr();
    const props = parseProps();
    expectNL();
    return { k: 'button', label, props, ln };
  }

  function parseStep(ln: number): Stmt {
    eat('IDENT', 'step');
    let narrate: string | null = null;
    if (check('STR') || check('FSTR')) narrate = eatStr();
    const props = parseProps();
    expectNL();
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
    expectNL();
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

  skipNL();
  const stmts: Stmt[] = [];
  while (!check('EOF')) {
    const s = parseStmt();
    if (s) stmts.push(s);
    skipNL();
  }
  return stmts;
}
