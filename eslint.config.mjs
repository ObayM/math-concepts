import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import globals from 'globals';

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'videos/**',
  ]),
  {
    // typescript catches undefined identifiers in .ts/.tsx, and nothing catches
    // them in .js/.jsx, which has shipped two runtime crashes tsc could not see
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: { 'no-undef': 'error' },
  },
]);

export default eslintConfig;
