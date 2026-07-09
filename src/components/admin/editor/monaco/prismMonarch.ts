import { KEYWORDS, MATH_FNS } from '@/components/prism/prismKeywords';

export const prismMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.prism',
  keywords: Array.from(KEYWORDS),
  mathFns: Array.from(MATH_FNS),

  tokenizer: {
    root: [
      [/^\s*>.*/, 'string'],
      [/#.*$/, 'comment'],
      [/"(?:[^"\\]|\\.)*"/, 'string'],
      [/\d+(?:\.\d+)?/, 'number'],
      [/->|>=|<=|==|!=/, 'operator'],
      [/[+\-*/^%=><!]/, 'operator'],
      [/[()[\]{},:]/, 'delimiter'],
      [
        /[a-zA-Z_]\w*/,
        {
          cases: {
            '@keywords': 'keyword',
            '@mathFns': 'predefined',
            '@default': 'identifier',
          },
        },
      ],
      [/\s+/, 'white'],
    ],
  },
};

export const prismLanguageConfiguration = {
  comments: { lineComment: '#' },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
  ],
};
