import { describe, it, expect, afterEach, vi } from 'vitest';
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
      '/dsl-preview',
      '/api/dsl-preview',
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

  it('does not let a public prefix leak onto a longer path', () => {
    for (const path of ['/loginsomething', '/prismatic', '/termsandmore', '/authorise']) {
      expect(proxy(request(path)).status, path).toBe(307);
    }
  });

  it('still lets real paths under a public prefix through', () => {
    for (const path of ['/login', '/auth/email-confirm', '/prism/play', '/u/someone']) {
      expect(proxy(request(path)).status, path).toBe(200);
    }
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

describe('locale routing', () => {
  const rewritten = (res: Response) => res.headers.get('x-middleware-rewrite');

  it('rewrites into the locale segment the host names', () => {
    const res = proxy(
      request('/dashboard', { cookie: SESSION, headers: { host: 'ar.mathly.com' } })
    );
    expect(rewritten(res)).toContain('/ar/dashboard');
  });

  it('keeps x-pathname free of the locale, so layout checks still match', () => {
    const res = proxy(
      request('/dashboard', { cookie: SESSION, headers: { host: 'ar.mathly.com' } })
    );
    expect(res.headers.get('x-pathname')).toBe('/dashboard');
  });

  it('falls back to english on a host with no locale', () => {
    const res = proxy(request('/dashboard', { cookie: SESSION }));
    expect(rewritten(res)).toContain('/en/dashboard');
  });

  it('honours ?lang only where the host carries no locale', () => {
    const local = proxy(request('/dashboard?lang=ar', { cookie: SESSION }));
    expect(rewritten(local)).toContain('/ar/dashboard');

    const real = proxy(
      request('/dashboard?lang=en', { cookie: SESSION, headers: { host: 'ar.mathly.com' } })
    );
    expect(rewritten(real)).toContain('/ar/dashboard');
  });

  it('reads x-forwarded-host ahead of host, since a proxy sits in front', () => {
    const res = proxy(
      request('/dashboard', {
        cookie: SESSION,
        headers: { host: 'internal:3000', 'x-forwarded-host': 'ar.mathly.com' },
      })
    );
    expect(rewritten(res)).toContain('/ar/dashboard');
  });

  it('pins admin and the language reference to english from any host', () => {
    for (const path of ['/admin', '/prism', '/dsl-preview']) {
      const res = proxy(request(path, { cookie: SESSION, headers: { host: 'ar.mathly.com' } }));
      expect(rewritten(res), path).toContain(`/en${path}`);
    }
  });

  it('carries the locale through the @handle rewrite', () => {
    const res = proxy(request('/@someone', { headers: { host: 'ar.mathly.com' } }));
    expect(rewritten(res)).toContain('/ar/u/someone');
    expect(res.headers.get('x-pathname')).toBe('/u/someone');
  });

  it('never prefixes api or the root metadata routes', () => {
    for (const path of ['/api/health', '/robots.txt', '/sitemap.xml', '/manifest.webmanifest']) {
      const res = proxy(request(path, { headers: { host: 'ar.mathly.com' } }));
      expect(rewritten(res), path).toBeNull();
    }
  });
});

describe('the apex', () => {
  async function apexProxy() {
    vi.resetModules();
    process.env.APP_DOMAIN = 'mathly.com';
    const mod = await import('@/proxy');
    return mod.proxy;
  }

  afterEach(() => {
    delete process.env.APP_DOMAIN;
    vi.resetModules();
  });

  function apexRequest(path: string, method = 'GET', headers: Record<string, string> = {}) {
    const all: Record<string, string> = { host: 'mathly.com', ...headers };
    if (method !== 'GET') all['sec-fetch-site'] = 'same-origin';
    return new NextRequest(`https://mathly.com${path}`, { method, headers: all });
  }

  it('sends an arabic browser to the arabic subdomain', async () => {
    const proxyAt = await apexProxy();
    const res = proxyAt(apexRequest('/', 'GET', { 'accept-language': 'ar-EG,ar;q=0.9' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://ar.mathly.com/');
  });

  it('sends everyone else to english', async () => {
    const proxyAt = await apexProxy();
    const res = proxyAt(apexRequest('/', 'GET', { 'accept-language': 'fr-FR,fr;q=0.9' }));
    expect(res.headers.get('location')).toBe('https://en.mathly.com/');
  });

  it('remembers the choice so it never re-guesses', async () => {
    const proxyAt = await apexProxy();
    const res = proxyAt(apexRequest('/', 'GET', { 'accept-language': 'ar-EG' }));
    expect(res.headers.get('set-cookie')).toContain('mathly-lang=ar');
  });

  it('lets an explicit cookie beat the browser header', async () => {
    const proxyAt = await apexProxy();
    const res = proxyAt(
      apexRequest('/', 'GET', { 'accept-language': 'ar-EG', cookie: 'mathly-lang=en' })
    );
    expect(res.headers.get('location')).toBe('https://en.mathly.com/');
  });

  it('keeps the path across the hop', async () => {
    const proxyAt = await apexProxy();
    const res = proxyAt(apexRequest('/courses', 'GET', { 'accept-language': 'ar' }));
    expect(res.headers.get('location')).toBe('https://ar.mathly.com/courses');
  });

  it('refuses a POST rather than 307ing the body into a cross-subdomain 403', async () => {
    const proxyAt = await apexProxy();
    const res = proxyAt(apexRequest('/login', 'POST'));
    expect(res.status).toBe(405);
  });

  it('redirects to the host the visitor typed, not the internal one', async () => {
    const proxyAt = await apexProxy();
    const res = proxyAt(
      new NextRequest('http://internal:3000/', {
        headers: {
          host: 'internal:3000',
          'x-forwarded-host': 'mathly.com',
          'x-forwarded-proto': 'https',
          'accept-language': 'ar',
        },
      })
    );
    expect(res.headers.get('location')).toBe('https://ar.mathly.com/');
  });

  it('never redirects a real locale host', async () => {
    const proxyAt = await apexProxy();
    const res = proxyAt(
      new NextRequest('https://ar.mathly.com/dashboard', {
        headers: { host: 'ar.mathly.com', cookie: SESSION },
      })
    );
    expect(res.status).toBe(200);
  });
});
