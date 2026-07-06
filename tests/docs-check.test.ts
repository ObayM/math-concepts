import { describe, it, expect } from 'vitest';
import { PRISM_DOCS } from '@/engine/lang/docs';
import { PRISM_COOKBOOK } from '@/engine/lang/docs/cookbook';
import { PRISM_ERRORS } from '@/engine/lang/docs/errors';
import { EXAMPLES } from '../src/app/prism/(guide)/examples/examples-data';
import { compileAny } from '@/components/prism/compileAny';

// every docs example, gallery entry, and cookbook source must actually
// compile — a doc that doesn't compile is a build failure, permanently.
// mirrors `npm run dsl docs-check`, but also runs under `npm test`.

describe('docs examples all compile', () => {
  for (const section of PRISM_DOCS.sections) {
    for (const entry of section.entries) {
      if (!entry.example) continue;
      it(`${section.id}/${entry.keyword}`, () => {
        const { error } = compileAny(entry.example!);
        expect(error, error ?? undefined).toBeNull();
      });
    }
  }
});

describe('example gallery all compile', () => {
  for (const ex of EXAMPLES) {
    it(ex.id, () => {
      const { error } = compileAny(ex.code);
      expect(error, error ?? undefined).toBeNull();
    });
  }
});

describe('cookbook entries all compile', () => {
  for (const entry of PRISM_COOKBOOK) {
    it(entry.id, () => {
      const { error } = compileAny(entry.source);
      expect(error, error ?? undefined).toBeNull();
    });
  }
});

describe('error index bad/good pairs', () => {
  for (const err of PRISM_ERRORS) {
    it(`${err.code}: bad example actually fails`, () => {
      const { error } = compileAny(err.bad);
      expect(error).not.toBeNull();
    });
    it(`${err.code}: good example actually compiles`, () => {
      const { error } = compileAny(err.good);
      expect(error, error ?? undefined).toBeNull();
    });
  }
});
