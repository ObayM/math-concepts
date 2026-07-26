import { describe, it, expect } from 'vitest';
import { isSameOriginRequest } from '@/lib/same-origin';

function req(method: string, headers: Record<string, string> = {}) {
  return { method, headers: new Headers(headers) } as unknown as Request;
}

describe('isSameOriginRequest', () => {
  it('always allows safe methods', () => {
    expect(isSameOriginRequest(req('GET'))).toBe(true);
    expect(isSameOriginRequest(req('HEAD'))).toBe(true);
    expect(isSameOriginRequest(req('OPTIONS'))).toBe(true);
  });

  it('does not exempt DELETE, which is a real mutation here', () => {
    expect(isSameOriginRequest(req('DELETE'))).toBe(false);
  });

  it('trusts sec-fetch-site when the browser sends it', () => {
    expect(isSameOriginRequest(req('POST', { 'sec-fetch-site': 'same-origin' }))).toBe(true);
    expect(isSameOriginRequest(req('POST', { 'sec-fetch-site': 'none' }))).toBe(true);
    expect(isSameOriginRequest(req('POST', { 'sec-fetch-site': 'same-site' }))).toBe(false);
    expect(isSameOriginRequest(req('POST', { 'sec-fetch-site': 'cross-site' }))).toBe(false);
  });

  it('sec-fetch-site wins over a forged origin', () => {
    const forged = req('POST', {
      'sec-fetch-site': 'cross-site',
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
    });
    expect(isSameOriginRequest(forged)).toBe(false);
  });

  it('compares origin host against host', () => {
    expect(
      isSameOriginRequest(req('POST', { origin: 'http://localhost:3000', host: 'localhost:3000' }))
    ).toBe(true);
    expect(
      isSameOriginRequest(req('POST', { origin: 'https://evil.test', host: 'localhost:3000' }))
    ).toBe(false);
  });

  it('is port sensitive', () => {
    expect(
      isSameOriginRequest(req('POST', { origin: 'http://localhost:4000', host: 'localhost:3000' }))
    ).toBe(false);
  });

  it('prefers x-forwarded-host when behind a proxy', () => {
    expect(
      isSameOriginRequest(
        req('POST', {
          origin: 'https://mathly.app',
          host: 'internal-3000.local',
          'x-forwarded-host': 'mathly.app',
        })
      )
    ).toBe(true);
  });

  it('denies an opaque origin', () => {
    expect(isSameOriginRequest(req('POST', { origin: 'null', host: 'localhost:3000' }))).toBe(
      false
    );
  });

  it('falls back to referer only when origin is absent', () => {
    expect(
      isSameOriginRequest(
        req('POST', { referer: 'http://localhost:3000/dashboard', host: 'localhost:3000' })
      )
    ).toBe(true);
    expect(
      isSameOriginRequest(
        req('POST', { referer: 'https://evil.test/attack', host: 'localhost:3000' })
      )
    ).toBe(false);
  });

  it('ignores referer when origin is present and wrong', () => {
    expect(
      isSameOriginRequest(
        req('POST', {
          origin: 'https://evil.test',
          referer: 'http://localhost:3000/dashboard',
          host: 'localhost:3000',
        })
      )
    ).toBe(false);
  });

  it('denies when nothing is comparable', () => {
    expect(isSameOriginRequest(req('POST', { host: 'localhost:3000' }))).toBe(false);
    expect(isSameOriginRequest(req('POST', { origin: 'http://localhost:3000' }))).toBe(false);
    expect(isSameOriginRequest(req('POST', { origin: 'not a url', host: 'localhost:3000' }))).toBe(
      false
    );
  });
});
