// expression IR: the parser's Expr tree, minus compile-time-only shapes
// (tuple/list/dict/arrow get destructured by the emitter; fstr lowers to Text).
// this is what the scene IR stores instead of expression strings.

export type Value = number | boolean | string;
export type Scope = Record<string, Value>;

export type UnOp = '-' | '+' | 'not';
export type BinOp =
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '^'
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | 'and'
  | 'or';

export type ExprIR =
  | { k: 'num'; v: number }
  | { k: 'bool'; v: boolean }
  | { k: 'str'; v: string }
  | { k: 'id'; name: string }
  | { k: 'un'; op: UnOp; e: ExprIR }
  | { k: 'bin'; op: BinOp; l: ExprIR; r: ExprIR }
  | { k: 'call'; fn: string; args: ExprIR[] };

// most props are plain numbers after constant folding — keep the fast path cheap
export type NumExpr = number | ExprIR;

// replaces "${expr}" template strings: static parts + live expressions
export type Text = { parts: (string | ExprIR)[] };
