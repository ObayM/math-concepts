import {
  BLACKBOARD,
  LETTERS,
  OPERATORS,
  SYMBOL_LETTERS,
  UNIT_VECTOR_OTHER,
  UNIT_VECTORS,
  indicDigits,
} from './notation';
import { DOUBLE_STRUCK, MIRRORED_ARROWS, SYMBOLS } from './symbols';

export type PNode = {
  type: string;
  mode?: string;
  text?: string;
  body?: PNode | PNode[] | PNode[][];
  base?: PNode;
  sup?: PNode;
  sub?: PNode;
  numer?: PNode;
  denom?: PNode;
  index?: PNode;
  left?: string;
  right?: string;
  delim?: string;
  label?: string;
  isStretchy?: boolean;
  name?: string;
  limits?: boolean;
  symbol?: boolean;
  family?: string;
  style?: string;
  dimension?: { number: number; unit: string };
  font?: string;
  color?: string;
  mathml?: PNode[];
  mclass?: string;
  size?: number;
  hasBarLine?: boolean;
  leftDelim?: string | null;
  rightDelim?: string | null;
  cols?: { type: string; align?: string }[];
};

export class Unsupported extends Error {}

export type Report = {
  latin: Set<string>;
  mapped: Map<string, Set<string>>;
};

export const newReport = (): Report => ({ latin: new Set(), mapped: new Map() });

const THIN = '<mspace width="0.1667em"></mspace>';
const DELIM_SIZES = [1.2, 1.8, 2.4, 3];
const OPERATOR_CHAR = /^(?![∞∂∇∅])[\p{Sm}\p{P}]$/u;
const ALIGN: Record<string, string> = { l: 'start', c: 'center', r: 'end' };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const isDigit = (n: PNode | undefined) => n?.type === 'textord' && /^[0-9]$/.test(n.text ?? '');
const isDot = (n: PNode | undefined) => n?.type === 'textord' && n.text === '.';
const list = (x: PNode['body']): PNode[] => (!x ? [] : Array.isArray(x) ? (x as PNode[]) : [x]);
const flat = (x: PNode['body']): PNode[] => {
  const nodes = list(x);
  return nodes.length === 1 && nodes[0].type === 'ordgroup' ? flat(nodes[0].body) : nodes;
};

function symbol(text: string): string {
  const s = SYMBOLS[text] ?? text;
  if (s.startsWith('\\')) throw new Unsupported(text);
  return MIRRORED_ARROWS[s] ?? s;
}

function opensFence(n: PNode | undefined): boolean {
  if (!n) return true;
  if (n.type === 'leftright' || n.type === 'kern' || n.type === 'spacing') return true;
  if (n.type === 'atom' && (n.family === 'open' || n.family === 'punct' || n.family === 'close'))
    return true;
  return n.type === 'delimsizing' && n.mclass === 'mopen';
}

function unaryAfter(nodes: PNode[], i: number): boolean {
  let j = i - 1;
  while (j >= 0 && (nodes[j].type === 'kern' || nodes[j].type === 'spacing')) j--;
  const prev = nodes[j];
  if (!prev) return true;
  if (prev.type === 'atom') return ['bin', 'rel', 'open', 'punct'].includes(prev.family ?? '');
  if (prev.type === 'mclass') return prev.mclass === 'mrel' || prev.mclass === 'mbin';
  return prev.type === 'op' || prev.type === 'htmlmathml';
}

function appliesFunction(n: PNode): boolean {
  if (n.type === 'op') return !n.symbol;
  return n.type === 'supsub' && n.base?.type === 'op' && !n.base.symbol;
}

export function toMathML(nodes: PNode[], report: Report): string {
  const letter = (latin: string): string => {
    const ar = LETTERS[latin];
    if (!ar) {
      report.latin.add(latin);
      return `<mi>${esc(latin)}</mi>`;
    }
    const seen = report.mapped.get(ar) ?? new Set<string>();
    seen.add(latin);
    report.mapped.set(ar, seen);
    return `<mi>${ar}</mi>`;
  };

  const mi = (text: string): string => {
    if (/^[a-zA-Z]$/.test(text)) return letter(text);
    if (SYMBOL_LETTERS[text]) return `<mi>${SYMBOL_LETTERS[text]}</mi>`;
    return `<mi>${esc(symbol(text))}</mi>`;
  };

  const fence = (d: string | undefined): string =>
    !d || d === '.' ? '' : `<mo fence="true" stretchy="true">${esc(symbol(d))}</mo>`;

  const group = (x: PNode['body']): string => {
    const nodes = list(x);
    if (nodes.length === 1 && nodes[0].type === 'ordgroup') return group(nodes[0].body);
    if (nodes.length === 1 && !isDigit(nodes[0])) return emit(nodes[0]);
    if (nodes.length > 0 && nodes.every((n) => isDigit(n) || isDot(n))) return seq(nodes);
    return `<mrow>${seq(nodes)}</mrow>`;
  };

  const unitVector = (base: PNode | undefined): string | null => {
    const inner = base?.type === 'ordgroup' ? list(base.body) : base ? [base] : [];
    if (inner.length !== 1 || inner[0].type !== 'mathord') return null;
    const t = inner[0].text ?? '';
    if (!/^[a-zA-Z]$/.test(t)) return null;
    return UNIT_VECTORS[t] ?? UNIT_VECTOR_OTHER;
  };

  const over = (base: string, mark: string, stretchy: boolean) =>
    `<mover accent="true">${base}<mo stretchy="${stretchy}">${mark}</mo></mover>`;

  function accent(n: PNode): string {
    switch (n.label) {
      case '\\hat': {
        const uv = unitVector(n.base);
        return uv ? over(`<mi>${uv}</mi>`, '←', false) : over(group(n.base), '^', false);
      }
      case '\\widehat':
        return over(group(n.base), '^', true);
      case '\\vec':
        return over(group(n.base), '←', false);
      case '\\overrightarrow':
        return over(group(n.base), '←', true);
      case '\\overleftarrow':
        return over(group(n.base), '→', true);
      case '\\overleftrightarrow':
        return over(group(n.base), '↔', true);
      case '\\bar':
        return over(group(n.base), '¯', false);
      case '\\tilde':
        return over(group(n.base), '˜', false);
      case '\\dot':
        return over(group(n.base), '˙', false);
      case '\\ddot':
        return over(group(n.base), '¨', false);
      default:
        throw new Unsupported(n.label);
    }
  }

  function text(nodes: PNode[]): string {
    let out = '';
    for (const n of nodes) {
      if (n.type === 'textord' || n.type === 'mathord') out += symbol(n.text ?? '');
      else if (n.type === 'spacing') out += n.text === '\\nobreak' ? '' : ' ';
      else if (n.type === 'text' || n.type === 'ordgroup' || n.type === 'styling')
        out += text(list(n.body));
      else throw new Unsupported(`text:${n.type}`);
    }
    return out;
  }

  function emit(n: PNode): string {
    switch (n.type) {
      case 'mathord':
        return mi(n.text ?? '');
      case 'textord': {
        const t = n.text ?? '';
        if (/^[0-9]$/.test(t)) return `<mn>${indicDigits(t)}</mn>`;
        if (/^\p{Script=Arabic}+$/u.test(t)) return `<mi>${t}</mi>`;
        if (/^[a-zA-Z]$/.test(t)) return letter(t);
        const s = symbol(t);
        return OPERATOR_CHAR.test(s) ? `<mo>${esc(s)}</mo>` : `<mi>${esc(s)}</mi>`;
      }
      case 'atom': {
        const t = n.text ?? '';
        if (n.family === 'punct' && t === ',') return '<mo>،</mo>';
        return `<mo>${esc(symbol(t))}</mo>`;
      }
      case 'ordgroup':
        return `<mrow>${seq(list(n.body))}</mrow>`;
      case 'supsub': {
        const base = n.base ? group(n.base) : '<mrow></mrow>';
        const limits = n.base?.type === 'op' && n.base.limits;
        const [subTag, supTag, bothTag] = limits
          ? ['munder', 'mover', 'munderover']
          : ['msub', 'msup', 'msubsup'];
        if (n.sub && n.sup) return `<${bothTag}>${base}${group(n.sub)}${group(n.sup)}</${bothTag}>`;
        if (n.sub) return `<${subTag}>${base}${group(n.sub)}</${subTag}>`;
        if (n.sup) return `<${supTag}>${base}${group(n.sup)}</${supTag}>`;
        return base;
      }
      case 'genfrac': {
        const bar = n.hasBarLine === false ? ' linethickness="0"' : '';
        const frac = `<mfrac${bar}>${group(n.numer)}${group(n.denom)}</mfrac>`;
        if (!n.leftDelim && !n.rightDelim) return frac;
        return `<mrow>${fence(n.leftDelim ?? undefined)}${frac}${fence(n.rightDelim ?? undefined)}</mrow>`;
      }
      case 'sqrt':
        return n.index
          ? `<mroot>${group(n.body)}${group(n.index)}</mroot>`
          : `<msqrt>${seq(flat(n.body))}</msqrt>`;
      case 'leftright':
        return `<mrow>${fence(n.left)}${seq(list(n.body))}${fence(n.right)}</mrow>`;
      case 'middle':
        return fence(n.delim);
      case 'delimsizing': {
        const em = DELIM_SIZES[(n.size ?? 1) - 1] ?? 1.2;
        return `<mo stretchy="true" symmetric="true" minsize="${em}em" maxsize="${em}em">${esc(symbol(n.delim ?? ''))}</mo>`;
      }
      case 'accent':
        return accent(n);
      case 'overline':
        return over(group(n.body), '‾', true);
      case 'underline':
        return `<munder accentunder="true">${group(n.body)}<mo stretchy="true">‾</mo></munder>`;
      case 'op': {
        if (n.symbol)
          return `<mo largeop="true" movablelimits="true">${esc(symbol(n.name ?? ''))}</mo>`;
        if (n.body) return `<mi>${esc(text(list(n.body)))}</mi>`;
        const name = n.name ?? '';
        return `<mi>${esc(OPERATORS[name] ?? name.replace(/^\\/, ''))}</mi>`;
      }
      case 'operatorname':
        return `<mi>${esc(text(list(n.body)))}</mi>`;
      case 'styling': {
        const attr =
          n.style === 'display'
            ? 'displaystyle="true" scriptlevel="0"'
            : n.style === 'text'
              ? 'displaystyle="false" scriptlevel="0"'
              : n.style === 'script'
                ? 'displaystyle="false" scriptlevel="1"'
                : 'displaystyle="false" scriptlevel="2"';
        return `<mstyle ${attr}>${seq(list(n.body))}</mstyle>`;
      }
      case 'sizing':
        return `<mrow>${seq(list(n.body))}</mrow>`;
      case 'kern': {
        const d = n.dimension ?? { number: 0, unit: 'em' };
        const width =
          d.unit === 'mu' ? `${Math.round((d.number / 18) * 1e4) / 1e4}em` : `${d.number}${d.unit}`;
        return `<mspace width="${width}"></mspace>`;
      }
      case 'spacing':
        return n.text === '\\nobreak' ? '' : '<mspace width="0.25em"></mspace>';
      case 'text':
        return `<mtext>${esc(indicDigits(text(list(n.body))))}</mtext>`;
      case 'mclass':
        return `<mrow>${seq(list(n.body))}</mrow>`;
      case 'htmlmathml':
        return seq(n.mathml ?? []);
      case 'lap':
        return `<mpadded width="0">${group(n.body)}</mpadded>`;
      case 'phantom':
        return `<mphantom>${seq(list(n.body))}</mphantom>`;
      case 'smash':
        return group(n.body);
      case 'font': {
        const inner = list(n.body);
        if (n.font === 'mathbb' && inner.length === 1 && inner[0].type === 'mathord') {
          const t = inner[0].text ?? '';
          return `<mi>${BLACKBOARD[t] ?? DOUBLE_STRUCK[t] ?? esc(t)}</mi>`;
        }
        if (n.font === 'mathbf' || n.font === 'boldsymbol')
          return `<mstyle style="font-weight:bold">${seq(inner)}</mstyle>`;
        return `<mrow>${seq(inner)}</mrow>`;
      }
      case 'color':
        return `<mstyle mathcolor="${esc(n.color ?? '')}">${seq(list(n.body))}</mstyle>`;
      case 'array': {
        const rows = (n.body ?? []) as PNode[][];
        const aligns = (n.cols ?? [])
          .filter((c) => c.type === 'align')
          .map((c) => ALIGN[c.align ?? 'c']);
        const cells = rows.map(
          (r) =>
            `<mtr>${r
              .map((c, i) => {
                const a = aligns[i];
                return `<mtd${a ? ` style="text-align:${a}"` : ''}>${seq(list(c))}</mtd>`;
              })
              .join('')}</mtr>`
        );
        return `<mtable>${cells.join('')}</mtable>`;
      }
      case 'internal':
        return '';
      default:
        throw new Unsupported(n.type);
    }
  }

  function seq(nodes: PNode[]): string {
    let out = '';
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (isDigit(n) || (isDot(n) && isDigit(nodes[i + 1]))) {
        let run = '';
        while (isDigit(nodes[i]) || (isDot(nodes[i]) && isDigit(nodes[i + 1])))
          run += nodes[i++].text;
        i--;
        out += `<mn>${indicDigits(run)}</mn>`;
        continue;
      }
      if (n.type === 'textord' && /^\p{M}$/u.test(n.text ?? '') && nodes[i + 1]) {
        const next = nodes[++i];
        out += `<mo>${esc((symbol(next.text ?? '') + n.text).normalize('NFC'))}</mo>`;
        continue;
      }
      if (n.type === 'atom' && n.family === 'bin' && unaryAfter(nodes, i)) {
        out += `<mo form="prefix">${esc(symbol(n.text ?? ''))}</mo>`;
        continue;
      }
      out += emit(n);
      if (appliesFunction(n) && !opensFence(nodes[i + 1])) out += THIN;
    }
    return out;
  }

  return seq(nodes);
}
