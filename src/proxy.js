import { NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/api/auth',
  '/api/check-username',
  '/api/cron/',
  '/error',
  '/u/',
];

export function proxy(request) {
  const { pathname } = request.nextUrl;

  const atMatch = pathname.match(/^\/@([a-z0-9][a-z0-9-]*)$/);
  if (atMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/u/${atMatch[1]}`;
    return NextResponse.rewrite(url);
  }

  const isPublic = pathname === '/' || PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!isPublic) {
    const sessionToken =
      request.cookies.get('better-auth.session_token') ??
      request.cookies.get('__Secure-better-auth.session_token');
    if (!sessionToken) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
