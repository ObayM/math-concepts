"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

const AuthContext = createContext({
  user: null,
  profile: null,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children, initialUser }) {
  const supabase = createClient();

  const [user, setUser] = useState(initialUser?.user || null);
  const [profile, setProfile] = useState(initialUser?.profile || null);
  const [isLoading, setIsLoading] = useState(!initialUser);

  const fetchProfile = async (uid) => {
    if (!uid) return setProfile(null);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();

    if (!error) setProfile(data);
  };

  useEffect(() => {
    if (initialUser?.user) {
      setUser(initialUser.user);
      setProfile(initialUser.profile);
      setIsLoading(false);
    }
  }, [initialUser]);


  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const authUser = session?.user || null;
      setUser(authUser);

      if (authUser) {
        await fetchProfile(authUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
