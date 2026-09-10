import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

async function load(appDomain: string) {
  vi.resetModules();
  vi.stubEnv('APP_DOMAIN', appDomain);
  return import('@/lib/trusted-host');
}

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllEnvs());

describe('with APP_DOMAIN set', () => {
  it('accepts the apex and both locale subdomains', async () => {
    const { trustedHost } = await load('mathly.com');
    expect(trustedHost('mathly.com', null)).toBe('mathly.com');
    expect(trustedHost('en.mathly.com', null)).toBe('en.mathly.com');
    expect(trustedHost('ar.mathly.com', null)).toBe('ar.mathly.com');
  });

  it('refuses an attacker-supplied forwarded host, which is the open redirect', async () => {
    const { trustedHost } = await load('mathly.com');
    expect(trustedHost('evil.com', 'en.mathly.com')).toBe('en.mathly.com');
  });

  it('ignores an untrusted forwarded host and uses the real one', async () => {
    const { trustedHost } = await load('mathly.com');
    expect(trustedHost('evil.com', 'also-evil.com')).toBe('also-evil.com');
  });

  it('is not fooled by a lookalike suffix', async () => {
    const { trustedHost } = await load('mathly.com');
    expect(trustedHost('en.mathly.com.evil.com', 'en.mathly.com')).toBe('en.mathly.com');
  });

  it('leaves loopback alone, so a health check is never mistaken for the apex', async () => {
    const { trustedHost } = await load('mathly.com');
    expect(trustedHost(null, 'localhost:3000')).toBe('localhost:3000');
    expect(trustedHost(null, '127.0.0.1:3000')).toBe('127.0.0.1:3000');
  });

  it('normalises case', async () => {
    const { trustedHost } = await load('mathly.com');
    expect(trustedHost('EN.Mathly.COM', null)).toBe('en.mathly.com');
  });

  it('keeps the port when the domain carries one', async () => {
    const { trustedHost } = await load('mathly.local:3100');
    expect(trustedHost('ar.mathly.local:3100', null)).toBe('ar.mathly.local:3100');
    expect(trustedHost('evil.local:3100', 'ar.mathly.local:3100')).toBe('ar.mathly.local:3100');
  });
});

describe('with no APP_DOMAIN, which is dev and preview hosts', () => {
  it('passes the forwarded host through so tunnels keep working', async () => {
    const { trustedHost } = await load('');
    expect(trustedHost('something.ngrok.app', null)).toBe('something.ngrok.app');
  });

  it('falls back to the host header', async () => {
    const { trustedHost } = await load('');
    expect(trustedHost(null, 'localhost:3000')).toBe('localhost:3000');
  });
});

describe('trustedProto', () => {
  it('accepts only http and https', async () => {
    const { trustedProto } = await load('mathly.com');
    expect(trustedProto('http', 'https')).toBe('http');
    expect(trustedProto('https', 'http')).toBe('https');
    expect(trustedProto('javascript', 'https')).toBe('https');
    expect(trustedProto('', 'https')).toBe('https');
  });

  it('takes the first value of a chained header', async () => {
    const { trustedProto } = await load('mathly.com');
    expect(trustedProto('https,http', 'http')).toBe('https');
  });

  it('tolerates the trailing colon a url protocol carries', async () => {
    const { trustedProto } = await load('mathly.com');
    expect(trustedProto(null, 'http:')).toBe('http');
  });
});
