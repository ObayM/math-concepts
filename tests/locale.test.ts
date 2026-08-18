import { describe, it, expect } from 'vitest';
import {
  LOCALES,
  DEFAULT_LOCALE,
  isLocale,
  isRtl,
  dirFor,
  localeFromHost,
  hostsForDomain,
} from '@/lib/locale';

describe('locale constants', () => {
  it('ships english and arabic, defaulting to english', () => {
    expect(LOCALES).toEqual(['en', 'ar']);
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('knows which way each one runs', () => {
    expect(isRtl('ar')).toBe(true);
    expect(isRtl('en')).toBe(false);
    expect(dirFor('ar')).toBe('rtl');
    expect(dirFor('en')).toBe('ltr');
  });

  it('rejects anything that is not a locale', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale('')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});

describe('localeFromHost', () => {
  it('reads the subdomain', () => {
    expect(localeFromHost('ar.mathly.com')).toBe('ar');
    expect(localeFromHost('en.mathly.com')).toBe('en');
  });

  it('ignores the port and casing', () => {
    expect(localeFromHost('AR.Mathly.local:3100')).toBe('ar');
  });

  it('returns null for the apex, so the caller can decide', () => {
    expect(localeFromHost('mathly.com')).toBeNull();
  });

  it('returns null on localhost, which is what gates the dev override', () => {
    expect(localeFromHost('localhost:3000')).toBeNull();
    expect(localeFromHost('127.0.0.1:3000')).toBeNull();
  });

  it('returns null for an unknown subdomain rather than guessing', () => {
    expect(localeFromHost('www.mathly.com')).toBeNull();
    expect(localeFromHost('fr.mathly.com')).toBeNull();
  });

  it('survives missing input', () => {
    expect(localeFromHost(null)).toBeNull();
    expect(localeFromHost(undefined)).toBeNull();
    expect(localeFromHost('')).toBeNull();
  });
});

describe('hostsForDomain', () => {
  it('lists the apex first, then one host per locale', () => {
    expect(hostsForDomain('mathly.com')).toEqual(['mathly.com', 'en.mathly.com', 'ar.mathly.com']);
  });

  it('keeps the port, so local dev matches production shape', () => {
    expect(hostsForDomain('mathly.local:3000')).toEqual([
      'mathly.local:3000',
      'en.mathly.local:3000',
      'ar.mathly.local:3000',
    ]);
  });

  it('is empty when unset, which leaves the auth config untouched', () => {
    expect(hostsForDomain('')).toEqual([]);
  });
});
