import { trustedHost } from '@/lib/trusted-host';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function hostOf(value) {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export function isSameOriginRequest(request) {
  if (SAFE_METHODS.has(request.method)) return true;

  const site = request.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin' || site === 'none';

  const target = trustedHost(request.headers.get('x-forwarded-host'), request.headers.get('host'));
  if (!target) return false;

  const origin = request.headers.get('origin');
  if (origin) return hostOf(origin) === target;

  const referer = request.headers.get('referer');
  if (referer) return hostOf(referer) === target;

  return false;
}
