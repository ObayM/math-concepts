import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/same-origin';

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
  '/u/',
  // a logged-out browser fetches these before it can install the app, and the
  // matcher's extension list does not cover .js or .webmanifest
  '/manifest.webmanifest',
  '/sw.js',
  '/offline',
];

const CROSS_ORIGIN_EXEMPT = ['/api/auth', '/api/cron/'];

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
};

const DEV = process.env.NODE_ENV !== 'production';

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
  if (nonce) response.headers.set('Content-Security-Policy', csp(nonce));
  return response;
}

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const nonce = newNonce();

  if (!CROSS_ORIGIN_EXEMPT.some((p) => pathname.startsWith(p)) && !isSameOriginRequest(request)) {
    return harden(
      NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 }),
      nonce
    );
  }

  // next reads the nonce back out of this request header and stamps it onto
  // its own hydration scripts, which is what keeps script-src free of
  // 'unsafe-inline'
  const headers = new Headers(request.headers);
  headers.set('Content-Security-Policy', csp(nonce));

  const atMatch = pathname.match(/^\/@([a-z0-9][a-z0-9-]*)$/);
  if (atMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/u/${atMatch[1]}`;
    return harden(NextResponse.rewrite(url, { request: { headers } }), nonce);
  }

  const isPublic = pathname === '/' || PUBLIC_PATHS.some((p) => pathname.startsWith(p));

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

  headers.set('x-pathname', pathname);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('x-pathname', pathname);
  return harden(response, nonce);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
