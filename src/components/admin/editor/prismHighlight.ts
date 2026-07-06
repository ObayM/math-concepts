import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

const prismHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#7c3aed', fontWeight: '700' },
  { tag: tags.string, color: '#15803d' },
  { tag: tags.number, color: '#b91c1c' },
  { tag: tags.bool, color: '#b91c1c', fontWeight: '700' },
  { tag: tags.comment, color: '#94a3b8', fontStyle: 'italic' },
  { tag: tags.operator, color: '#475569' },
  { tag: tags.punctuation, color: '#475569' },
  { tag: tags.function(tags.variableName), color: '#1d4ed8' },
  { tag: tags.variableName, color: '#0f172a' },
]);

export const prismHighlighting = syntaxHighlighting(prismHighlightStyle);
