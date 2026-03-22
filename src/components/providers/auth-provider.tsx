"use client";

import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null, session);
      setInitialized(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null, session);
      setInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setInitialized]);

  return <>{children}</>;
}
