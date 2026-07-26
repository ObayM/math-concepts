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
  '/u/',
];

const CROSS_ORIGIN_EXEMPT = ['/api/auth', '/api/cron/'];

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
};

function harden(response) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (!CROSS_ORIGIN_EXEMPT.some((p) => pathname.startsWith(p)) && !isSameOriginRequest(request)) {
    return harden(NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 }));
  }

  const atMatch = pathname.match(/^\/@([a-z0-9][a-z0-9-]*)$/);
  if (atMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/u/${atMatch[1]}`;
    return harden(NextResponse.rewrite(url));
  }

  const isPublic = pathname === '/' || PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!isPublic) {
    const sessionToken =
      request.cookies.get('better-auth.session_token') ??
      request.cookies.get('__Secure-better-auth.session_token');
    if (!sessionToken) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return harden(NextResponse.redirect(url));
    }
  }

  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);
  return harden(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
