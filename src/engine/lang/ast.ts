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
  | { k: 'scene'; spaceType: string; props: PropMap; children: Stmt[]; ln: number }
  | { k: 'param'; name: string; init: Expr; props: PropMap; ln: number }
  | { k: 'bool_d'; name: string; init: Expr; ln: number }
  | { k: 'choice_d'; name: string; init: Expr; props: PropMap; ln: number }
  | { k: 'let'; name: string; value: Expr; ln: number }
  | { k: 'def'; name: string; params: string[]; body: Stmt[]; ln: number }
  | { k: 'for_s'; var: string; start: Expr; end: Expr; step: Expr | null; body: Stmt[]; ln: number }
  | { k: 'repeat_s'; var: string; start: Expr; count: Expr; body: Stmt[]; ln: number }
  | { k: 'if_s'; cases: IfCase[]; elseBody: Stmt[] | null; ln: number }
  | { k: 'reveal'; body: Stmt[]; ln: number }
  | { k: 'call_s'; fn: string; args: Expr[]; ln: number }
  | { k: 'curve'; id: Expr; expr: Expr; props: PropMap; ln: number }
  | { k: 'area'; id: Expr; expr: Expr; props: PropMap; ln: number }
  | { k: 'point'; id: Expr; pos: Expr | null; props: PropMap; ln: number }
  | { k: 'line'; id: Expr; seg: [Expr, Expr] | null; props: PropMap; ln: number }
  | { k: 'label'; id: Expr | null; at: Expr; text: Expr; props: PropMap; ln: number }
  | { k: 'rect'; id: Expr; pos: Expr; props: PropMap; ln: number }
  | { k: 'circle'; id: Expr; center: Expr; props: PropMap; ln: number }
  | { k: 'polygon'; id: Expr; pts: Expr[]; props: PropMap; ln: number }
  | { k: 'vector'; id: Expr; from: Expr; to: Expr; props: PropMap; ln: number }
  | { k: 'arc'; id: Expr; center: Expr; props: PropMap; ln: number }
  | { k: 'image'; id: Expr; pos: Expr; props: PropMap; ln: number }
  | { k: 'point3'; id: Expr; pos: Expr; props: PropMap; ln: number }
  | { k: 'segment3'; id: Expr; from: Expr; to: Expr; props: PropMap; ln: number }
  | { k: 'polygon3'; id: Expr; pts: Expr[]; props: PropMap; ln: number }
  | { k: 'plane3'; id: Expr; props: PropMap; ln: number }
  | { k: 'label3'; id: Expr | null; at: Expr; text: Expr; props: PropMap; ln: number }
  | { k: 'slider'; bind: string; props: PropMap; ln: number }
  | { k: 'toggle'; bind: string; props: PropMap; ln: number }
  | { k: 'stepper'; bind: string; props: PropMap; ln: number }
  | { k: 'picker'; bind: string; props: PropMap; ln: number }
  | { k: 'button'; label: string; props: PropMap; ln: number }
  | { k: 'step'; narrate: string | null; props: PropMap; ln: number }
  | { k: 'morph'; from: string; to: string; props: PropMap; ln: number }
  // lesson-level nodes
  | {
      k: 'lesson';
      title: string;
      props: PropMap;
      slides: SlideStmt[];
      defs: Extract<Stmt, { k: 'def' }>[];
      roles: { name: string; color: string; ln: number }[];
      ln: number;
    }
  | { k: 'prose'; text: string; ln: number }
  | { k: 'goal'; prompt: string; props: PropMap; ln: number }
  | { k: 'quiz'; options: QuizOption[]; common: ExerciseCommon; ln: number }
  | {
      k: 'numeric';
      answers: Expr[];
      tolerance: Expr | null;
      unit: string | null;
      wrong: WrongAnswer[];
      vary: { name: string; values: Expr; ln: number }[];
      common: ExerciseCommon;
      ln: number;
    }
  | {
      k: 'build';
      bank: string[];
      answers: string[][];
      slots: number | null;
      template: string | null;
      reusable: boolean;
      common: ExerciseCommon;
      ln: number;
    }
  | {
      k: 'hotspot';
      target: HotspotTarget | null;
      miss: string | null;
      common: ExerciseCommon;
      ln: number;
    }
  | {
      k: 'sketch';
      mode: 'curve' | 'points' | 'line';
      near: Expr[];
      through: Expr | null;
      slope: Expr | null;
      tol: Expr | null;
      slopeTol: Expr | null;
      follows: Expr | null;
      over: Expr | null;
      common: ExerciseCommon;
      ln: number;
    }
  | {
      k: 'match';
      pairs: [Expr, Expr][];
      decoys: string[];
      common: ExerciseCommon;
      ln: number;
    }
  | {
      k: 'order';
      items: string[];
      decoys: string[];
      common: ExerciseCommon;
      ln: number;
    }
  | {
      k: 'sort';
      bins: { label: string; items: string[] }[];
      common: ExerciseCommon;
      ln: number;
    }
  | {
      k: 'table';
      header: string[] | null;
      rows: Expr[][];
      tolerance: Expr | null;
      common: ExerciseCommon;
      ln: number;
    };

export type HotspotTarget =
  | { kind: 'rect'; pos: Expr; props: PropMap }
  | { kind: 'circle'; pos: Expr; props: PropMap };

export type SlideStmt = {
  k: 'slide';
  title: string;
  props: PropMap;
  items: Stmt[];
  ln: number;
};

export type Branch = { slide: string; retry: boolean };

export type QuizOption = { text: string; correct: boolean; why?: string; onwrong?: Branch };

export type WrongAnswer = { value: Expr; why?: string; onwrong?: Branch; ln: number };

// shared bits every exercise can declare: prompt (ask), hint ladder, explanation
export type ExerciseCommon = {
  ask: string;
  hints: string[];
  explanation?: string;
  skill?: string;
  onwrong?: Branch;
  after?: { on: 'goals' | number; ln: number };
  expect?: { expr: Expr; ln: number };
};
