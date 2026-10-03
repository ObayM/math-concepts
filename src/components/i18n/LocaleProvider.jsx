'use client';

import { createContext, useContext } from 'react';
import { DEFAULT_LOCALE } from '@/lib/locale';
import { makeT } from '@/lib/i18n';
import { MathNotationProvider } from '@/engine/artex/context';

const LocaleContext = createContext(DEFAULT_LOCALE);

export function LocaleProvider({ lang, children }) {
  return (
    <LocaleContext.Provider value={lang}>
      <MathNotationProvider notation={lang === 'ar' ? 'ar' : 'latin'}>
        {children}
      </MathNotationProvider>
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT() {
  return makeT(useContext(LocaleContext));
}
