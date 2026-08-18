import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { username, admin } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { prisma } from './prisma';
import { sendEmail } from './email';
import { ac, roles, ROLES, ADMIN_ROLES } from './permissions';
import { hostsForDomain } from './locale';

const adminUserIds = (process.env.ADMIN_USER_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const appDomain = (process.env.APP_DOMAIN ?? '').trim();
const cookieDomain = (process.env.COOKIE_DOMAIN ?? '').trim();

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? '')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

const allowedHosts = hostsForDomain(appDomain);

// this decides both which origins are trusted and whether the session cookie
// gets the __Secure- prefix, so it follows the scheme the app is actually
// served over rather than NODE_ENV
const protocol = (process.env.APP_PROTOCOL ?? 'auto').trim();

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  ...(allowedHosts.length && {
    baseURL: {
      allowedHosts,
      fallback: `${protocol === 'http' ? 'http' : 'https'}://${allowedHosts[0]}`,
      protocol,
    },
    trustedProxyHeaders: true,
  }),

  ...(trustedOrigins.length && { trustedOrigins }),

  advanced: {
    crossSubDomainCookies: {
      enabled: Boolean(cookieDomain),
      ...(cookieDomain && { domain: cookieDomain }),
    },
  },

  // better-auth rate limits by default in production only, and its defaults are
  // strict (3 per 10s on sign-in/sign-up). pin them here so the behaviour is a
  // decision rather than an inherited surprise. the store is per-process, same
  // caveat as src/lib/rate-limit.ts.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 10, max: 5 },
      '/sign-up/email': { window: 60, max: 5 },
      '/forget-password': { window: 60, max: 3 },
      '/request-password-reset': { window: 60, max: 3 },
      '/send-verification-email': { window: 60, max: 3 },
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 6,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Reset your Mathly password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2>Reset your password</h2>
            <p>Click the button below to choose a new password for your Mathly account.</p>
            <a href="${url}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">
              Reset Password
            </a>
            <p style="margin-top:16px;color:#6b7280;font-size:13px">
              If you didn't request this, you can safely ignore this email. Your password won't change.
            </p>
          </div>
        `,
      });
    },
  },

  emailVerification: {
    autoSignInAfterVerification: true,
    callbackURL: '/onboarding',
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Verify your Mathly account',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2>Welcome to Mathly!</h2>
            <p>Click the button below to verify your email address and get started.</p>
            <a href="${url}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">
              Verify Email
            </a>
            <p style="margin-top:16px;color:#6b7280;font-size:13px">
              If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    },
  },

  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 39,
    }),
    admin({
      ac,
      roles,
      defaultRole: ROLES.STUDENT,
      adminRoles: ADMIN_ROLES,
      adminUserIds,
    }),
    nextCookies(),
  ],
});
