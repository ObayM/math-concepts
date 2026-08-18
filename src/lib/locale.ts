export const LOCALES = ['en', 'ar'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

const RTL_LOCALES: ReadonlySet<string> = new Set(['ar']);

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.has(locale);
}

export function dirFor(locale: Locale): 'ltr' | 'rtl' {
  return isRtl(locale) ? 'rtl' : 'ltr';
}

function hostname(host: string | null | undefined): string {
  return (host ?? '').trim().toLowerCase().split(':')[0];
}

export function localeFromHost(host: string | null | undefined): Locale | null {
  const labels = hostname(host).split('.');
  if (labels.length < 2) return null;
  return isLocale(labels[0]) ? labels[0] : null;
}

export function hostsForDomain(domain: string): string[] {
  const base = hostname(domain);
  const port = (domain ?? '').includes(':') ? `:${domain.split(':')[1]}` : '';
  if (!base) return [];
  return [`${base}${port}`, ...LOCALES.map((l) => `${l}.${base}${port}`)];
}
