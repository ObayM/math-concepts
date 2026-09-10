type Env = Record<string, string | undefined>;

interface Requirement {
  name: string;
  why: string;
  when?: (env: Env) => boolean;
  ok?: (value: string) => boolean;
  hint?: string;
}

const hasDomain = (env: Env) => Boolean(env.APP_DOMAIN?.trim());

const REQUIRED: Requirement[] = [
  { name: 'DATABASE_URL', why: 'nothing can read or write without it' },
  {
    name: 'BETTER_AUTH_SECRET',
    why: 'sessions are signed with it',
    ok: (v) => v.length >= 32,
    hint: 'needs at least 32 characters, generate with `openssl rand -base64 32`',
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    why: 'email links and the auth client origin are built from it',
  },
  {
    name: 'APP_DOMAIN',
    why: 'without it the apex never redirects and auth trusts no locale subdomain',
    ok: (v) => !v.includes('://'),
    hint: 'bare domain, no scheme, e.g. mathly.com',
  },
  {
    name: 'COOKIE_DOMAIN',
    why: 'with locale subdomains, a session made on en. is invisible on ar. without it',
    when: hasDomain,
    ok: (v) => v.startsWith('.'),
    hint: 'needs a leading dot, e.g. .mathly.com',
  },
  {
    name: 'SMTP_HOST',
    why: 'signup requires email verification, so nobody can register without it',
  },
  { name: 'CRON_SECRET', why: 'the reminder endpoint refuses to run without it' },
];

export function envProblems(env: Env = process.env): string[] {
  const problems: string[] = [];
  for (const { name, why, when, ok, hint } of REQUIRED) {
    if (when && !when(env)) continue;
    const value = env[name]?.trim();
    if (!value) {
      problems.push(`${name} is not set: ${why}`);
      continue;
    }
    if (ok && !ok(value)) problems.push(`${name} is set but ${hint}`);
  }
  return problems;
}

export function assertProductionEnv(env: Env = process.env): void {
  if (env.NODE_ENV !== 'production') return;

  const problems = envProblems(env);
  if (!problems.length) return;

  const list = problems.map((p) => `  - ${p}`).join('\n');

  if (env.ALLOW_INCOMPLETE_ENV === '1') {
    console.warn(
      `[env] running a production build with an incomplete environment:\n${list}\n` +
        'ALLOW_INCOMPLETE_ENV=1 is set, so this is a warning. never set it on a real deploy.'
    );
    return;
  }

  throw new Error(
    `refusing to start: the production environment is incomplete.\n${list}\n\n` +
      'see .env.example. every one of these fails silently or confusingly at runtime,\n' +
      'and two of them make signup impossible, so this is a hard stop.\n' +
      'set ALLOW_INCOMPLETE_ENV=1 only for a test harness running a production build.'
  );
}
