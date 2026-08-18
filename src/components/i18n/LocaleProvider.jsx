'use client';

import { createContext, useContext } from 'react';
import { DEFAULT_LOCALE } from '@/lib/locale';
import { makeT } from '@/lib/i18n';

const LocaleContext = createContext(DEFAULT_LOCALE);

export function LocaleProvider({ lang, children }) {
  return <LocaleContext.Provider value={lang}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT() {
  return makeT(useContext(LocaleContext));
}
