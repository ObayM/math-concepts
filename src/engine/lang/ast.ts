export type Expr =
  | { k: 'num'; v: number }
  | { k: 'bool'; v: boolean }
  | { k: 'str'; v: string; fstr: boolean }
  | { k: 'id'; name: string }
  | { k: 'bin'; op: string; l: Expr; r: Expr }
  | { k: 'un'; op: string; e: Expr }
  | { k: 'call'; fn: string; args: Expr[] }
  | { k: 'tuple'; items: Expr[] }
  | { k: 'list'; items: Expr[] }
  | { k: 'dict'; entries: [string, Expr][] }
  | { k: 'arrow'; from: Expr; to: Expr };

export type PropMap = Map<string, Expr | true>;

export type IfCase = { cond: Expr; body: Stmt[] };

export type Stmt =
  | { k: 'scene'; spaceType: string; props: PropMap; ln: number }
  | { k: 'param'; name: string; init: Expr; props: PropMap; ln: number }
  | { k: 'bool_d'; name: string; init: Expr; ln: number }
  | { k: 'let'; name: string; value: Expr; ln: number }
  | { k: 'def'; name: string; params: string[]; body: Stmt[]; ln: number }
  | { k: 'for_s'; var: string; start: Expr; end: Expr; step: Expr | null; body: Stmt[]; ln: number }
  | { k: 'if_s'; cases: IfCase[]; elseBody: Stmt[] | null; ln: number }
  | { k: 'call_s'; fn: string; args: Expr[]; ln: number }
  | { k: 'curve'; id: Expr; expr: Expr; props: PropMap; ln: number }
  | { k: 'point'; id: Expr; pos: Expr | null; props: PropMap; ln: number }
  | { k: 'line'; id: Expr; seg: [Expr, Expr] | null; props: PropMap; ln: number }
  | { k: 'label'; id: Expr | null; at: Expr; text: Expr; props: PropMap; ln: number }
  | { k: 'rect'; id: Expr; pos: Expr; props: PropMap; ln: number }
  | { k: 'circle'; id: Expr; center: Expr; props: PropMap; ln: number }
  | { k: 'polygon'; id: Expr; pts: Expr[]; props: PropMap; ln: number }
  | { k: 'vector'; id: Expr; from: Expr; to: Expr; props: PropMap; ln: number }
  | { k: 'arc'; id: Expr; center: Expr; props: PropMap; ln: number }
  | { k: 'slider'; bind: string; props: PropMap; ln: number }
  | { k: 'toggle'; bind: string; props: PropMap; ln: number }
  | { k: 'stepper'; bind: string; props: PropMap; ln: number }
  | { k: 'button'; label: string; props: PropMap; ln: number }
  | { k: 'step'; narrate: string | null; props: PropMap; ln: number };
