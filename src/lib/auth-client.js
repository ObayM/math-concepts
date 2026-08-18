'use client';

import { createAuthClient } from 'better-auth/react';
import { usernameClient, adminClient } from 'better-auth/client/plugins';
import { ac, roles } from './permissions';

const baseURL =
  typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
    : window.location.origin;

export const authClient = createAuthClient({
  baseURL,
  plugins: [usernameClient(), adminClient({ ac, roles })],
});

export const { useSession, signIn, signOut, signUp, admin, changePassword } = authClient;
