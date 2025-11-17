"use client";

import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';


const AuthContext = createContext({
  user: null,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ 
  children,
  initialUser
}) {
  const [user, setUser] = useState(initialUser);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setUser(initialUser);
    setIsLoading(false);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, [initialUser]);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

