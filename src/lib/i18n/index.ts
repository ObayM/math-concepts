import { DEFAULT_LOCALE, isLocale, type Locale } from '../locale';
import en from './en';
import ar from './ar';
import type { Dictionary, MessageKey, Vars } from './types';

export type { MessageKey, Vars } from './types';

const DICTIONARIES: Record<Locale, Dictionary> = { en: en as Dictionary, ar };

const pluralRules = new Map<Locale, Intl.PluralRules>();

function rulesFor(lang: Locale): Intl.PluralRules {
  let rules = pluralRules.get(lang);
  if (!rules) {
    rules = new Intl.PluralRules(lang);
    pluralRules.set(lang, rules);
  }
  return rules;
}

function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name) =>
    name in vars ? String(vars[name]) : whole
  );
}

export function translate(lang: Locale, key: MessageKey, vars?: Vars): string {
  const dict = DICTIONARIES[isLocale(lang) ? lang : DEFAULT_LOCALE];
  const message = dict[key] ?? (DICTIONARIES[DEFAULT_LOCALE][key] as string) ?? key;

  if (typeof message === 'string') return fill(message, vars);

  const count = vars?.count;
  if (typeof count !== 'number') return fill(message.other ?? key, vars);

  const category = count === 0 && message.zero ? 'zero' : rulesFor(lang).select(count);
  const chosen = message[category] ?? message.other ?? key;
  return fill(chosen, vars);
}

export function makeT(lang: Locale) {
  return (key: MessageKey, vars?: Vars) => translate(lang, key, vars);
}

export type Translate = ReturnType<typeof makeT>;

export { DICTIONARIES };
