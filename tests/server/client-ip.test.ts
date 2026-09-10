import { describe, it, expect } from 'vitest';
import { clientIp } from '@/lib/request-ip';

const req = (headers: Record<string, string>) => ({
  headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
});

describe('clientIp', () => {
  it('takes the rightmost hop behind one proxy, which is the only value that proxy wrote', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.9' }), 1)).toBe('203.0.113.9');
  });

  it('ignores a client-supplied prefix, which is the whole point', () => {
    const spoofed = req({ 'x-forwarded-for': '1.2.3.4, 203.0.113.9' });
    expect(clientIp(spoofed, 1)).toBe('203.0.113.9');
  });

  it('ignores a long spoofed chain', () => {
    const spoofed = req({ 'x-forwarded-for': '9.9.9.9, 8.8.8.8, 7.7.7.7, 203.0.113.9' });
    expect(clientIp(spoofed, 1)).toBe('203.0.113.9');
  });

  it('steps back one more hop behind a cdn plus a proxy', () => {
    const chain = req({ 'x-forwarded-for': '1.2.3.4, 203.0.113.9, 198.51.100.2' });
    expect(clientIp(chain, 2)).toBe('203.0.113.9');
  });

  it('refuses to read x-forwarded-for at all when nothing is in front of the app', () => {
    const spoofed = req({ 'x-forwarded-for': '1.2.3.4', 'x-real-ip': '203.0.113.9' });
    expect(clientIp(spoofed, 0)).toBe('203.0.113.9');
  });

  it('falls back to x-real-ip when there is no chain', () => {
    expect(clientIp(req({ 'x-real-ip': '203.0.113.9' }), 1)).toBe('203.0.113.9');
  });

  it('says unknown rather than inventing an address', () => {
    expect(clientIp(req({}), 1)).toBe('unknown');
  });

  it('does not fall off the front of a chain shorter than the configured hops', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.9' }), 3)).toBe('203.0.113.9');
  });

  it('tolerates whitespace and empty entries', () => {
    expect(clientIp(req({ 'x-forwarded-for': ' , 1.2.3.4 ,  203.0.113.9 , ' }), 1)).toBe(
      '203.0.113.9'
    );
  });
});
