import { headers } from 'next/headers';
import { DEFAULT_LOCALE, type Locale } from './locale';

const APP_DOMAIN = (process.env.APP_DOMAIN ?? '').trim().toLowerCase();
const PROTOCOL = (process.env.APP_PROTOCOL ?? '').trim() === 'http' ? 'http' : 'https';

export const hasLocaleOrigins = Boolean(APP_DOMAIN);

export function originForLocale(locale: Locale = DEFAULT_LOCALE): string {
  if (APP_DOMAIN) return `${PROTOCOL}://${locale}.${APP_DOMAIN}`;
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

export async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return originForLocale();
  return `${h.get('x-forwarded-proto') ?? PROTOCOL}://${host}`;
}
