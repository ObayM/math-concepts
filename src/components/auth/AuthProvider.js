"use client";

import { createContext, useContext } from "react";
import { useSession } from "@/lib/auth-client";

const AuthContext = createContext({
  user: null,
  profile: null,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children, initialUser }) {
  const { data: session, isPending } = useSession();

  const user = session?.user ?? initialUser?.user ?? null;
  const isLoading = isPending && !initialUser;

  const profile =
    user?.username
      ? { username: user.username, id: user.id }
      : (initialUser?.profile ?? null);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
