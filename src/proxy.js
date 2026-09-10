import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/same-origin';
import { DEFAULT_LOCALE, isLocale, localeFromHost } from '@/lib/locale';
import { trustedHost, trustedProto } from '@/lib/trusted-host';

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/api/auth',
  '/api/check-username',
  '/api/cron/',
  '/api/health',
  '/error',
  '/privacy',
  '/terms',
  '/prism',
  '/dsl-preview',
  '/api/dsl-preview',
  '/robots.txt',
  '/sitemap.xml',
  '/opengraph-image',
  '/u/',
  // a logged-out browser fetches these before it can install the app, and the
  // matcher's extension list does not cover .js or .webmanifest
  '/manifest.webmanifest',
  '/sw.js',
  '/offline',
];

const CROSS_ORIGIN_EXEMPT = ['/api/auth', '/api/cron/'];

// internal tooling and the language reference stay english whichever host they
// are reached from
const FORCED_EN = ['/admin', '/prism', '/dsl-preview'];

// these live at the app root and have no locale segment to rewrite into
const ROOT_ROUTES = [
  '/manifest.webmanifest',
  '/robots.txt',
  '/sitemap.xml',
  '/sw.js',
  '/opengraph-image',
];

const LANG_COOKIE = 'mathly-lang';

const APP_DOMAIN = (process.env.APP_DOMAIN ?? '').trim().toLowerCase();
const APEX_HOST = APP_DOMAIN.split(':')[0];

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

const DEV = process.env.NODE_ENV !== 'production';

const VARY_ON = 'Host, Accept-Language, Cookie';

function underPrefix(pathname, prefix) {
  if (prefix.endsWith('/')) return pathname.startsWith(prefix);
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function hostOf(request) {
  return trustedHost(request.headers.get('x-forwarded-host'), request.headers.get('host'));
}

function acceptedLocale(request) {
  const cookie = request.cookies.get(LANG_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  const header = request.headers.get('accept-language') ?? '';
  const primary = header.split(',')[0]?.trim().split('-')[0]?.toLowerCase();
  return isLocale(primary) ? primary : DEFAULT_LOCALE;
}

// the host is the only locale source that can be trusted in production. the
// query/cookie fallbacks exist so localhost and preview urls, which carry no
// locale subdomain, can still reach both languages.
function resolveLocale(request) {
  const fromHost = localeFromHost(hostOf(request));
  if (fromHost) return fromHost;

  const override = request.nextUrl.searchParams.get('lang');
  if (isLocale(override)) return override;

  const cookie = request.cookies.get(LANG_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;

  return DEFAULT_LOCALE;
}

function isApexRequest(request) {
  if (!APEX_HOST) return false;
  return hostOf(request).split(':')[0] === APEX_HOST;
}

function newNonce() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
}

// the engine compiles to data and never evaluates a string, which is what lets
// script-src stay free of 'unsafe-eval' in production. the dev-only exception
// is the bundler's hot reload, not our code.
function csp(nonce) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${DEV ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self'${DEV ? ' ws: http://localhost:*' : ''}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

function harden(response, nonce) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  if (nonce) {
    response.headers.set('Content-Security-Policy', csp(nonce));
    if (!response.headers.has('Cache-Control')) {
      response.headers.set('Cache-Control', 'private, no-store');
    }
  }
  const vary = response.headers.get('Vary');
  response.headers.set('Vary', vary ? `${vary}, ${VARY_ON}` : VARY_ON);
  return response;
}

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const nonce = newNonce();

  if (!CROSS_ORIGIN_EXEMPT.some((p) => underPrefix(pathname, p)) && !isSameOriginRequest(request)) {
    return harden(
      NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 }),
      nonce
    );
  }

  // the apex picks a language once and hands the visitor to that subdomain.
  // a redirect defaults to 307, which replays the body, so a POST bounced here
  // would arrive cross-subdomain and trip the gate above.
  if (isApexRequest(request) && !pathname.startsWith('/api/')) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return harden(NextResponse.json({ error: 'Method not allowed' }, { status: 405 }), nonce);
    }
    const locale = acceptedLocale(request);
    const url = request.nextUrl.clone();
    // nextUrl carries the internal host, not the one the visitor typed. set
    // hostname and port apart: the host setter keeps the old port when the new
    // value has none
    const [targetHost, targetPort = ''] = hostOf(request).split(':');
    url.hostname = `${locale}.${targetHost}`;
    url.port = targetPort;
    url.protocol = trustedProto(request.headers.get('x-forwarded-proto'), url.protocol);
    const redirect = harden(NextResponse.redirect(url), nonce);
    redirect.cookies.set(LANG_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    return redirect;
  }

  const locale = FORCED_EN.some((p) => underPrefix(pathname, p))
    ? DEFAULT_LOCALE
    : resolveLocale(request);
  const localized = (to) => `/${locale}${to}`;

  // next reads the nonce back out of this request header and stamps it onto
  // its own hydration scripts, which is what keeps script-src free of
  // 'unsafe-inline'
  const headers = new Headers(request.headers);
  headers.set('Content-Security-Policy', csp(nonce));

  const atMatch = pathname.match(/^\/@([a-z0-9][a-z0-9-]*)$/);
  if (atMatch) {
    const url = request.nextUrl.clone();
    url.pathname = localized(`/u/${atMatch[1]}`);
    headers.set('x-pathname', `/u/${atMatch[1]}`);
    headers.set('x-locale', locale);
    const response = NextResponse.rewrite(url, { request: { headers } });
    response.headers.set('x-pathname', `/u/${atMatch[1]}`);
    return harden(response, nonce);
  }

  const isPublic = pathname === '/' || PUBLIC_PATHS.some((p) => underPrefix(pathname, p));

  if (!isPublic) {
    const sessionToken =
      request.cookies.get('better-auth.session_token') ??
      request.cookies.get('__Secure-better-auth.session_token');
    if (!sessionToken) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return harden(NextResponse.redirect(url), nonce);
    }
  }

  // every check above runs on the unprefixed path, so PUBLIC_PATHS and the
  // layout's own startsWith checks never learn about the locale segment
  headers.set('x-pathname', pathname);
  // server components that sit below the [lang] segment read the locale from
  // here rather than threading params through every level
  headers.set('x-locale', locale);

  if (pathname.startsWith('/api/') || ROOT_ROUTES.includes(pathname)) {
    const response = NextResponse.next({ request: { headers } });
    response.headers.set('x-pathname', pathname);
    return harden(response, nonce);
  }

  const url = request.nextUrl.clone();
  url.pathname = localized(pathname);
  const response = NextResponse.rewrite(url, { request: { headers } });
  response.headers.set('x-pathname', pathname);
  return harden(response, nonce);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
