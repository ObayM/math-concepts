import { cache } from 'react';
import { headers } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, type Locale } from '../locale';
import { makeT, type Translate } from './index';

export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await headers()).get('x-locale');
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

export const getT = cache(async (): Promise<Translate> => makeT(await getLocale()));
