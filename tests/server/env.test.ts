import { describe, it, expect } from 'vitest';
import { envProblems, assertProductionEnv } from '@/lib/env';

const GOOD = {
  DATABASE_URL: 'postgresql://user:pass@db:5432/mathly',
  BETTER_AUTH_SECRET: 'x'.repeat(44),
  NEXT_PUBLIC_APP_URL: 'https://en.mathly.com',
  APP_DOMAIN: 'mathly.com',
  COOKIE_DOMAIN: '.mathly.com',
  SMTP_HOST: 'smtp.example.com',
  CRON_SECRET: 'a-cron-secret',
  NODE_ENV: 'production',
};

describe('production env validation', () => {
  it('passes a complete environment', () => {
    expect(envProblems(GOOD)).toEqual([]);
  });

  it('names every missing variable rather than the first one', () => {
    const problems = envProblems({});
    expect(problems.join('\n')).toContain('SMTP_HOST');
    expect(problems.join('\n')).toContain('DATABASE_URL');
    expect(problems.join('\n')).toContain('BETTER_AUTH_SECRET');
  });

  it('only asks for a cookie domain once there are locale subdomains to share across', () => {
    expect(envProblems({}).join()).not.toContain('COOKIE_DOMAIN');
    expect(envProblems({ APP_DOMAIN: 'mathly.com' }).join()).toContain('COOKIE_DOMAIN');
  });

  it('downgrades to a warning for a test harness that opts in explicitly', () => {
    const env = { ...GOOD, SMTP_HOST: '', ALLOW_INCOMPLETE_ENV: '1' };
    expect(() => assertProductionEnv(env)).not.toThrow();
  });

  it('rejects a cookie domain with no leading dot, which silently breaks the language switch', () => {
    expect(envProblems({ ...GOOD, COOKIE_DOMAIN: 'mathly.com' }).join()).toContain('leading dot');
  });

  it('rejects an app domain that carries a scheme', () => {
    expect(envProblems({ ...GOOD, APP_DOMAIN: 'https://mathly.com' }).join()).toContain(
      'no scheme'
    );
  });

  it('rejects a short auth secret', () => {
    expect(envProblems({ ...GOOD, BETTER_AUTH_SECRET: 'short' }).join()).toContain('32 characters');
  });

  it('stays out of the way outside production', () => {
    expect(() => assertProductionEnv({ NODE_ENV: 'development' })).not.toThrow();
  });

  it('refuses to start a production server that cannot send email', () => {
    expect(() => assertProductionEnv({ ...GOOD, SMTP_HOST: '' })).toThrow(/SMTP_HOST/);
  });
});
