import type { Monaco } from '@monaco-editor/react';
import { prismMonarchLanguage, prismLanguageConfiguration } from './prismMonarch';
import { registerPrismProviders } from './prismMonacoProviders';

let languageRegistered = false;

export function configurePrismLanguage(monaco: Monaco) {
  if (!languageRegistered) {
    languageRegistered = true;
    monaco.languages.register({ id: 'prism' });
    monaco.languages.setMonarchTokensProvider('prism', prismMonarchLanguage);
    monaco.languages.setLanguageConfiguration('prism', prismLanguageConfiguration);
  }
  registerPrismProviders(monaco);
}
