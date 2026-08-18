import { describe, it, expect } from 'vitest';
import { LOCALES, type Locale } from '@/lib/locale';
import { DICTIONARIES, translate } from '@/lib/i18n';
import en from '@/lib/i18n/en';

const KEYS = Object.keys(en) as (keyof typeof en)[];

describe('dictionary parity', () => {
  it('every locale defines every key', () => {
    for (const lang of LOCALES) {
      const missing = KEYS.filter((k) => DICTIONARIES[lang][k] === undefined);
      expect(missing, `${lang} is missing keys`).toEqual([]);
    }
  });

  it('no locale defines keys english does not have', () => {
    for (const lang of LOCALES) {
      const extra = Object.keys(DICTIONARIES[lang]).filter((k) => !(k in en));
      expect(extra, `${lang} has stray keys`).toEqual([]);
    }
  });

  it('a plural entry covers every category that locale actually uses', () => {
    for (const lang of LOCALES) {
      const categories = new Intl.PluralRules(lang).resolvedOptions().pluralCategories;
      for (const key of KEYS) {
        const message = DICTIONARIES[lang][key];
        if (typeof message === 'string') continue;
        const missing = categories.filter((c) => !(c in message));
        expect(missing, `${lang} "${key}" is missing plural categories`).toEqual([]);
      }
    }
  });

  it('a key is plural in every locale or none, so callers can trust it', () => {
    for (const key of KEYS) {
      const shapes = LOCALES.map((l) => typeof DICTIONARIES[l][key]);
      expect(new Set(shapes).size, `"${key}" changes shape between locales`).toBe(1);
    }
  });
});

describe('translate', () => {
  it('interpolates named vars', () => {
    expect(translate('en', 'dashboard.greeting', { name: 'Sam' })).toBe('Hey, Sam.');
    expect(translate('ar', 'dashboard.greeting', { name: 'سام' })).toContain('سام');
  });

  it('leaves an unknown placeholder alone rather than printing undefined', () => {
    expect(translate('en', 'dashboard.greeting', {})).toBe('Hey, {name}.');
  });

  it('picks the english plural category', () => {
    expect(translate('en', 'courses.lessonCount', { count: 1 })).toBe('1 lesson');
    expect(translate('en', 'courses.lessonCount', { count: 7 })).toBe('7 lessons');
  });

  it('picks all six arabic categories, which english cannot express', () => {
    const at = (count: number) => translate('ar', 'courses.lessonCount', { count });
    expect(at(0)).toBe('لا دروس');
    expect(at(1)).toBe('درس واحد');
    expect(at(2)).toBe('درسان');
    expect(at(3)).toBe('3 دروس');
    expect(at(11)).toBe('11 درسًا');
    expect(at(100)).toBe('100 درس');
  });

  it('falls back to english for a locale that has not been added yet', () => {
    expect(translate('fr' as Locale, 'nav.courses')).toBe('Courses');
  });

  it('returns the key rather than throwing on a bad key', () => {
    expect(translate('en', 'nope.missing' as never)).toBe('nope.missing');
  });
});
