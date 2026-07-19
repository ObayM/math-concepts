import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { username, admin } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { prisma } from './prisma';
import { sendEmail } from './email';
import { ac, roles, ROLES, ADMIN_ROLES } from './permissions';

const adminUserIds = (process.env.ADMIN_USER_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

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
