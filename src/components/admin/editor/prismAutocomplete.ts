import { autocompletion } from '@codemirror/autocomplete';
import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { docsToCompletions } from '@/engine/lang/docs';

const completions = docsToCompletions();

function prismCompletionSource(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[a-zA-Z_][a-zA-Z0-9_]*/);
  if (!word) return null;
  if (word.from === word.to && !context.explicit) return null;
  return {
    from: word.from,
    options: completions,
    validFor: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
  };
}

export const prismAutocomplete = autocompletion({ override: [prismCompletionSource] });
