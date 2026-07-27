import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

const BASE = 'http://localhost:3000';

function request(
  path: string,
  {
    method = 'GET',
    cookie,
    headers = {},
  }: { method?: string; cookie?: string; headers?: Record<string, string> } = {}
) {
  const all: Record<string, string> = { host: 'localhost:3000', ...headers };
  if (cookie) all.cookie = cookie;
  if (method !== 'GET' && !all['sec-fetch-site'] && !all.origin)
    all['sec-fetch-site'] = 'same-origin';
  return new NextRequest(`${BASE}${path}`, { method, headers: all });
}

const SESSION = 'better-auth.session_token=abc';

describe('the page gate', () => {
  it('bounces an anonymous visitor to login', () => {
    const res = proxy(request('/dashboard'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(`${BASE}/login`);
  });

  it('lets a session cookie through, under either cookie name', () => {
    for (const cookie of [SESSION, '__Secure-better-auth.session_token=abc']) {
      const res = proxy(request('/dashboard', { cookie }));
      expect(res.status, cookie).toBe(200);
      expect(res.headers.get('x-pathname')).toBe('/dashboard');
    }
  });

  it('leaves the public surface alone', () => {
    for (const path of [
      '/',
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/api/auth/callback/x',
      '/api/check-username',
      '/api/cron/reminders',
      '/api/health',
      '/privacy',
      '/terms',
      '/prism',
      '/prism/cookbook',
      '/robots.txt',
      '/sitemap.xml',
      '/u/obay',
    ]) {
      expect(proxy(request(path)).status, path).toBe(200);
    }
  });

  it('rewrites /@username to the profile route', () => {
    const res = proxy(request('/@obay'));
    expect(res.headers.get('x-middleware-rewrite')).toContain('/u/obay');
  });

  it('only rewrites lowercase handles', () => {
    for (const path of ['/@Obay', '/@-x', '/@obay/extra']) {
      expect(proxy(request(path)).headers.get('x-middleware-rewrite'), path).toBeNull();
    }
  });

  it('treats PUBLIC_PATHS as prefixes, which is worth knowing', () => {
    expect(proxy(request('/loginsomething')).status).toBe(200);
  });
});

describe('the cross origin gate', () => {
  it('blocks a cross-site write even with a session cookie', () => {
    const res = proxy(
      request('/api/progress', {
        method: 'POST',
        cookie: SESSION,
        headers: { origin: 'https://evil.test' },
      })
    );
    expect(res.status).toBe(403);
  });

  it('blocks a write with no origin information at all', () => {
    const res = proxy(
      new NextRequest(`${BASE}/api/progress`, {
        method: 'POST',
        headers: { host: 'localhost:3000', cookie: SESSION },
      })
    );
    expect(res.status).toBe(403);
  });

  it('allows the app talking to itself', () => {
    const res = proxy(
      request('/api/progress', {
        method: 'POST',
        cookie: SESSION,
        headers: { origin: BASE },
      })
    );
    expect(res.status).toBe(200);
  });

  it('covers DELETE, which is a real mutation here', () => {
    const res = proxy(
      request('/api/progress', {
        method: 'DELETE',
        cookie: SESSION,
        headers: { origin: 'https://evil.test' },
      })
    );
    expect(res.status).toBe(403);
  });

  it('exempts better-auth, which runs its own origin check', () => {
    const res = proxy(
      request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { origin: 'https://evil.test' },
      })
    );
    expect(res.status).not.toBe(403);
  });

  it('exempts the cron route, which authenticates with a bearer secret', () => {
    const res = proxy(
      new NextRequest(`${BASE}/api/cron/reminders`, {
        method: 'POST',
        headers: { host: 'localhost:3000', authorization: 'Bearer x' },
      })
    );
    expect(res.status).not.toBe(403);
  });

  it('never blocks a read', () => {
    const res = proxy(
      request('/dashboard', { cookie: SESSION, headers: { origin: 'https://evil.test' } })
    );
    expect(res.status).toBe(200);
  });
});

describe('security headers', () => {
  it('are on every response the proxy builds', () => {
    for (const res of [
      proxy(request('/dashboard', { cookie: SESSION })),
      proxy(request('/login')),
      proxy(request('/@obay')),
      proxy(request('/dashboard')),
      proxy(request('/api/progress', { method: 'POST', headers: { origin: 'https://evil.test' } })),
    ]) {
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
      expect(res.headers.get('x-frame-options')).toBe('DENY');
    }
  });
});
