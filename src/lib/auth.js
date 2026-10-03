import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { username, admin, haveIBeenPwned } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { prisma } from './prisma';
import { sendEmail } from './email';
import { localeOf, resetEmail, verificationEmail } from './email-templates';
import { ac, roles, ROLES, ADMIN_ROLES } from './permissions';
import { hostsForDomain } from './locale';
import { PASSWORD_MIN, PASSWORD_MAX } from './password';

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

  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        if (adminUserIds.includes(user.id)) {
          throw new APIError('BAD_REQUEST', {
            message: 'This account is pinned as an administrator and cannot delete itself.',
          });
        }
      },
      afterDelete: async (user) => {
        console.info('[account] deleted %s', user.id);
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({ data: { ...user, termsAcceptedAt: new Date() } }),
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    freshAge: 60 * 15,
    cookieCache: { enabled: true, maxAge: 60 },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: PASSWORD_MIN,
    maxPasswordLength: PASSWORD_MAX,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const { subject, html } = resetEmail(localeOf(user.locale), url);
      await sendEmail({ to: user.email, subject, html });
    },
  },

  emailVerification: {
    autoSignInAfterVerification: true,
    callbackURL: '/onboarding',
    sendVerificationEmail: async ({ user, url }) => {
      const { subject, html } = verificationEmail(localeOf(user.locale), url);
      await sendEmail({ to: user.email, subject, html });
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
    haveIBeenPwned({
      enabled: process.env.DISABLE_HIBP !== '1',
      customPasswordCompromisedMessage:
        'That password has turned up in a known data breach. Pick a different one.',
    }),
    nextCookies(),
  ],
});
