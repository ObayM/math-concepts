import type { Monaco } from '@monaco-editor/react';
import type { editor, Position } from 'monaco-editor';
import { docsToCompletions } from '@/engine/lang/docs';

let registered = false;

export function registerPrismProviders(monaco: Monaco) {
  if (registered) return;
  registered = true;

  const completions = docsToCompletions();

  monaco.languages.registerCompletionItemProvider('prism', {
    provideCompletionItems(model: editor.ITextModel, position: Position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: completions.map((c) => ({
          label: c.label,
          kind: monaco.languages.CompletionItemKind.Keyword,
          detail: c.detail,
          documentation: c.info,
          insertText: c.label,
          range,
        })),
      };
    },
  });

  const byKeyword = new Map(completions.map((c) => [c.label, c]));

  monaco.languages.registerHoverProvider('prism', {
    provideHover(model: editor.ITextModel, position: Position) {
      const word = model.getWordAtPosition(position);
      if (!word) return null;
      const entry = byKeyword.get(word.word);
      if (!entry) return null;
      return {
        range: new monaco.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn
        ),
        contents: [{ value: `**${entry.label}** \`${entry.detail}\`` }, { value: entry.info }],
      };
    },
  });
}
