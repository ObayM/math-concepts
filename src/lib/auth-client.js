'use client';

import { createAuthClient } from 'better-auth/react';
import { usernameClient, adminClient } from 'better-auth/client/plugins';
import { ac, roles } from './permissions';

export const authClient = createAuthClient({
  plugins: [usernameClient(), adminClient({ ac, roles })],
});

export const { useSession, signIn, signOut, signUp, admin, changePassword } = authClient;
