# Deploying Mathly

`DEVELOPMENT.md` covers running it on your machine. This covers getting it online and
keeping it there.

## The shape of it

One VPS. Docker Compose runs Postgres and the app; Caddy terminates TLS and proxies to the
app on loopback. One long-lived container, deliberately:

- the rate limiter and Better Auth's limiter are **in-memory per process**, so a second
  replica silently halves every limit, including sign-in throttling
- `src/proxy.js` mints a **per-request CSP nonce** with no `Cache-Control`, and
  `e2e/csp.spec.ts` asserts every nonce is fresh. A CDN caching HTML would freeze one
  nonce into the body and block every script
- there is no `Vary` on locale-rewritten responses, so a shared cache could serve an
  Arabic page to an English visitor
- Prisma has no pooler and no `directUrl`

Fly.io or Railway work the same way if you would rather not own Postgres backups. Vercel
would need `output: 'standalone'` removed, a connection pooler, Redis-backed rate
limiting and a fix for the nonce/caching interaction before the first deploy.

## DNS

Three A records, all to the same host:

| Host            | Why                                                              |
| --------------- | ---------------------------------------------------------------- |
| `mathly.com`    | required. The apex picks a language and redirects to a subdomain |
| `en.mathly.com` | English                                                          |
| `ar.mathly.com` | Arabic                                                           |

The apex redirect is GET/HEAD only by design: a 307 would replay a POST body
cross-subdomain into the origin gate.

## TLS

`deploy/Caddyfile` covers all three names and provisions certificates itself. It also
sets HSTS, which the app does not, and **overwrites** `X-Forwarded-For`, `-Host` and
`-Proto` rather than appending, so a client cannot spoof any of them. That pairing is
what makes `TRUSTED_PROXY_HOPS=1` correct.

```
ACME_EMAIL=you@example.com APP_DOMAIN=mathly.com caddy run --config deploy/Caddyfile
```

## Environment

Copy `.env.example` and fill it in. The server **refuses to boot** in production if any of
these is missing or malformed, naming all of them at once (`src/lib/env.ts`):

| Variable              | Note                                                       |
| --------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`        |                                                            |
| `BETTER_AUTH_SECRET`  | 32+ chars, `openssl rand -base64 32`, fresh for production |
| `NEXT_PUBLIC_APP_URL` | **baked at build time**, not read at runtime               |
| `APP_DOMAIN`          | bare domain, no scheme                                     |
| `COOKIE_DOMAIN`       | leading dot, or the session dies when you switch language  |
| `SMTP_HOST`           | without it nobody can sign up at all                       |
| `CRON_SECRET`         |                                                            |

Also set `POSTGRES_PASSWORD` (generate one), `GEMINI_API_KEY`, `TRUSTED_PROXY_HOPS=1`,
`SUPPORT_EMAIL` (the privacy policy tells people to write to it, so it must be a real
mailbox), and optionally `AI_DAILY_CALL_BUDGET`. Leave `APP_PROTOCOL` unset behind Caddy. Clear
`TRUSTED_ORIGINS` of any dev tunnel value.

`ALLOW_INCOMPLETE_ENV=1` downgrades the boot check to a warning. It exists for test
harnesses running a production build. Never set it on a real deploy.

## Deploy

```
docker compose build app
docker compose up -d
```

`entrypoint.sh` runs `prisma migrate deploy` and then seeds. The seed is a pure upsert
that never prunes, so it is safe on every boot and it is what stops a fresh database
coming up with an empty catalog. `SKIP_SEED=1` turns it off.

CI builds the image on every push and asserts it carries more than 50 compiled lessons,
because a deploy that ships without them is a blank product.

`.github/workflows/deploy.yml` does this over SSH once CI is green, then polls
`/api/health` until it answers. Rollback is redeploying the previous commit; keep
migrations additive so that stays true.

## First admin

There is no admin until you make one:

```
make promote EMAIL=you@example.com ROLE=super_admin
```

Or set `ADMIN_USER_IDS` to a comma-separated list of user ids, which wins regardless of
the database role.

## Backups

Nothing is backed up unless you set this up. It matters more than usual here: deleting a
course cascades to its lessons and to every student's progress, attempts and notes, and
there is a super-admin force path for exactly that.

```
BACKUP_REMOTE=b2:mathly-backups scripts/backup-db.sh
```

Put it on a nightly cron. It keeps 30 days locally, refuses to keep a suspiciously small
dump, and copies off-host if `BACKUP_REMOTE` is set.

**Rehearse the restore before you need it.** An untested backup is not a backup:

```
scripts/restore-db.sh /var/backups/mathly/mathly-20260910T030000Z.sql.gz
```

That restores into a scratch database and prints row counts. It refuses to touch the live
one without `I_MEAN_IT=1`.

`scripts/export-content.mjs` is a second, independent net: it dumps every lesson's Prism
source, and in this codebase the source is the record.

## Error tracking

`@sentry/nextjs` is wired into `src/instrumentation.ts` (server, plus `onRequestError`),
`src/instrumentation-client.ts` (browser) and both error boundaries. With
`NEXT_PUBLIC_SENTRY_DSN` unset it is completely inert, so the app runs fine without an
account. Set the DSN and both sides start reporting; `SENTRY_TRACES_SAMPLE_RATE` and its
`NEXT_PUBLIC_` twin default to 0, so you pay for errors and not for traces.

Point an uptime monitor at `/api/health`. It does a real `SELECT 1`, so it fails when the
database does, not just when the process dies.

**Analytics is deliberately not installed.** Picking a provider changes what the privacy
policy has to say, so it is a decision rather than a default. Whatever you choose, the CSP
in `src/proxy.js` is `script-src 'self' 'nonce-...' 'strict-dynamic'`, so a third-party
snippet has to be loaded from a nonced script rather than pasted into the head.

## Scheduled work

`POST /api/cron/reminders` must be called **hourly** with `Authorization: Bearer
$CRON_SECRET`. It only mails users whose local hour is 19, so an hourly call is what lets
any timezone ever match. `.github/workflows/reminders.yml` does this; a host cron works
just as well.

## Before you open signups

- send a real verification email to a real inbox and check where it lands. With
  `requireEmailVerification: true`, broken SMTP means nobody can register
- confirm SPF, DKIM and DMARC on the domain
- set a hard quota and a billing budget on the Gemini key in Google Cloud. The app's own
  caps cannot save you from a bug in the app
- sign in on `en.`, switch to `ar.`, confirm you are still signed in
- paste a lesson URL into Slack and check the card renders
- send a message to `SUPPORT_EMAIL` and confirm somebody receives it. The privacy policy
  promises deletion through that address, and there is no self-serve delete yet
