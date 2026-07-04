const KEYWORDS = new Set([
  'lesson',
  'slide',
  'scene',
  'param',
  'bool',
  'choice',
  'curve',
  'area',
  'point',
  'line',
  'label',
  'rect',
  'circle',
  'polygon',
  'vector',
  'arc',
  'slider',
  'toggle',
  'stepper',
  'picker',
  'button',
  'step',
  'for',
  'in',
  'range',
  'if',
  'elif',
  'else',
  'let',
  'def',
  'repeat',
  'reveal',
  'through',
  'show',
  'drag',
  'grid',
  'axes',
  'tex',
  'set',
  'animate',
  'ease',
  'dur',
  'opacity',
  'style',
  'color',
  'width',
  'min',
  'max',
  'step',
  'true',
  'false',
  'goal',
  'quiz',
  'numeric',
  'build',
  'hotspot',
  'sketch',
  'match',
  'order',
  'table',
  'ask',
  'hint',
  'answer',
  'target',
  'near',
  'slope',
  'tolerance',
  'unit',
  'reusable',
  'bank',
  'slots',
  'when',
  'course',
  'skills',
  'skill',
  'cat',
  'options',
  'pair',
  'decoy',
  'item',
  'row',
  'header',
  'blank',
]);

const MATH_FNS = new Set([
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'sinh',
  'cosh',
  'tanh',
  'sqrt',
  'cbrt',
  'abs',
  'log',
  'log2',
  'log10',
  'exp',
  'floor',
  'ceil',
  'round',
  'sign',
  'pow',
  'hypot',
  'PI',
  'E',
]);

export function highlight(code: string): string {
  return code
    .split('\n')
    .map((line) => {
      if (/^\s*>/.test(line)) return `<span class="tok-str">${line}</span>`;
      const commentIdx = line.indexOf('#');
      const main = commentIdx === -1 ? line : line.slice(0, commentIdx);
      const comment = commentIdx === -1 ? '' : line.slice(commentIdx);

      const highlighted = main.replace(
        /("(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?\b)|([+\-*/^%]|->|>=|<=|==|!=|[=><!])|([()[\]{},])|(\b[a-zA-Z_][a-zA-Z0-9_]*\b)/g,
        (_, str, num, op, punc, word) => {
          if (str) return `<span class="tok-str">${str}</span>`;
          if (num) return `<span class="tok-num">${num}</span>`;
          if (op) return `<span class="tok-op">${op}</span>`;
          if (punc) return `<span class="tok-punc">${punc}</span>`;
          if (word) {
            if (KEYWORDS.has(word)) return `<span class="tok-kw">${word}</span>`;
            if (MATH_FNS.has(word)) return `<span class="tok-fn">${word}</span>`;
            return `<span class="tok-id">${word}</span>`;
          }
          return _;
        }
      );

      return comment ? `${highlighted}<span class="tok-cmt">${comment}</span>` : highlighted;
    })
    .join('\n');
}

export default function SyntaxPre({ code, className = '' }: { code: string; className?: string }) {
  return (
    <pre
      className={`prism-pre syntax ${className}`}
      dangerouslySetInnerHTML={{ __html: highlight(code) }}
    />
  );
}
