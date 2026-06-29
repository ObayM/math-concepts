export type TT =
  | 'NUM'
  | 'STR'
  | 'FSTR'
  | 'IDENT'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'CARET'
  | 'PCT'
  | 'EQ'
  | 'NEQ'
  | 'LT'
  | 'LTE'
  | 'GT'
  | 'GTE'
  | 'ASSIGN'
  | 'ARROW'
  | 'LP'
  | 'RP'
  | 'LB'
  | 'RB'
  | 'LC'
  | 'RC'
  | 'COMMA'
  | 'COLON'
  | 'DOT'
  | 'NL'
  | 'INDENT'
  | 'DEDENT'
  | 'EOF';

export interface Token {
  type: TT;
  raw: string;
  line: number;
  col: number;
}
