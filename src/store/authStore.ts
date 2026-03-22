import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  initialized: boolean;
  setUser: (user: User | null, session: Session | null) => void;
  setInitialized: (v: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  initialized: false,
  setUser: (user, session) => set({ user, session }),
  setInitialized: (initialized) => set({ initialized }),
  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));
