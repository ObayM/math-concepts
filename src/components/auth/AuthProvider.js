'use client';

import { createContext, useContext } from 'react';
import { useSession } from '@/lib/auth-client';

const AuthContext = createContext({
  user: null,
  profile: null,
  isLoading: true,
  isImpersonating: false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children, initialUser }) {
  const { data: session, isPending } = useSession();

  const user = session?.user ?? initialUser?.user ?? null;
  const isLoading = isPending && !initialUser;

  const profile = user?.username
    ? { username: user.username, id: user.id }
    : (initialUser?.profile ?? null);

  const isImpersonating = session
    ? !!session.session?.impersonatedBy
    : (initialUser?.isImpersonating ?? false);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, isImpersonating }}>
      {children}
    </AuthContext.Provider>
  );
}
