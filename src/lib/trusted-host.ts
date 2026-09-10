import { hostsForDomain } from './locale';

const APP_DOMAIN = (process.env.APP_DOMAIN ?? '').trim().toLowerCase();
const ALLOWED = new Set(hostsForDomain(APP_DOMAIN).map((h) => h.toLowerCase()));

const clean = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();

export function isTrustedHost(host: string | null | undefined): boolean {
  if (!ALLOWED.size) return Boolean(clean(host));
  return ALLOWED.has(clean(host));
}

export function trustedHost(
  forwarded: string | null | undefined,
  host: string | null | undefined
): string {
  const proxied = clean(forwarded);
  if (proxied && isTrustedHost(proxied)) return proxied;
  return clean(host) || proxied || '';
}

export function trustedProto(
  forwarded: string | null | undefined,
  fallback: string
): 'http' | 'https' {
  const value = clean(forwarded).split(',')[0].replace(/:$/, '');
  if (value === 'http' || value === 'https') return value;
  return fallback.replace(/:$/, '') === 'http' ? 'http' : 'https';
}
