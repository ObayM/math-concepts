interface Requirement {
  name: string;
  why: string;
  ok?: (value: string) => boolean;
  hint?: string;
}

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
    why: 'without it a session made on en. is invisible on ar.',
    ok: (v) => v.startsWith('.'),
    hint: 'needs a leading dot, e.g. .mathly.com',
  },
  {
    name: 'SMTP_HOST',
    why: 'signup requires email verification, so nobody can register without it',
  },
  { name: 'CRON_SECRET', why: 'the reminder endpoint refuses to run without it' },
];

type Env = Record<string, string | undefined>;

export function envProblems(env: Env = process.env): string[] {
  const problems: string[] = [];
  for (const { name, why, ok, hint } of REQUIRED) {
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
  throw new Error(
    `refusing to start: the production environment is incomplete.\n${list}\n\n` +
      'see .env.example. every one of these fails silently or confusingly at runtime,\n' +
      'and two of them make signup impossible, so this is a hard stop.'
  );
}
