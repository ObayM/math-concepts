import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ENV_KEYS = ['APP_DOMAIN', 'COOKIE_DOMAIN', 'TRUSTED_ORIGINS', 'APP_PROTOCOL'] as const;

async function loadAuth(env: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  vi.resetModules();
  for (const key of ENV_KEYS) delete (process.env as Record<string, unknown>)[key];
  Object.assign(process.env, env);
  const mod = await import('@/lib/auth');
  return (mod.auth as unknown as { options: Record<string, any> }).options;
}

describe('auth config', () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete (process.env as Record<string, unknown>)[k];
      else process.env[k] = v;
    }
  });

  it('accepts both locale subdomains plus the apex', async () => {
    const options = await loadAuth({ APP_DOMAIN: 'mathly.com' });
    expect(options.baseURL.allowedHosts).toEqual(['mathly.com', 'en.mathly.com', 'ar.mathly.com']);
  });

  it('reads x-forwarded-host, without which every request resolves to the container host', async () => {
    const options = await loadAuth({ APP_DOMAIN: 'mathly.com' });
    expect(options.trustedProxyHeaders).toBe(true);
  });

  it('defaults to auto, letting x-forwarded-proto decide behind a tls proxy', async () => {
    const options = await loadAuth({ APP_DOMAIN: 'mathly.com' });
    expect(options.baseURL.protocol).toBe('auto');
    expect(options.baseURL.fallback).toBe('https://mathly.com');
  });

  it('honours an explicit http, which is what keeps the cookie settable over plain http', async () => {
    const options = await loadAuth({ APP_DOMAIN: 'mathly.local:3100', APP_PROTOCOL: 'http' });
    expect(options.baseURL.protocol).toBe('http');
    expect(options.baseURL.fallback).toBe('http://mathly.local:3100');
  });

  it('honours an explicit https', async () => {
    const options = await loadAuth({ APP_DOMAIN: 'mathly.com', APP_PROTOCOL: 'https' });
    expect(options.baseURL.protocol).toBe('https');
  });

  it('leaves baseURL alone when APP_DOMAIN is unset', async () => {
    const options = await loadAuth({});
    expect(options.baseURL).toBeUndefined();
    expect(options.trustedProxyHeaders).toBeUndefined();
  });

  it('shares the session cookie across subdomains when COOKIE_DOMAIN is set', async () => {
    const options = await loadAuth({ APP_DOMAIN: 'mathly.com', COOKIE_DOMAIN: '.mathly.com' });
    expect(options.advanced.crossSubDomainCookies).toEqual({
      enabled: true,
      domain: '.mathly.com',
    });
  });

  it('stays disabled with no domain key when COOKIE_DOMAIN is unset', async () => {
    const options = await loadAuth({ APP_DOMAIN: 'mathly.local:3000' });
    expect(options.advanced.crossSubDomainCookies).toEqual({ enabled: false });
  });

  it('never sets cookiePrefix, which src/proxy.js reads by literal name', async () => {
    const options = await loadAuth({ APP_DOMAIN: 'mathly.com', COOKIE_DOMAIN: '.mathly.com' });
    expect(options.advanced.cookiePrefix).toBeUndefined();
  });
});
