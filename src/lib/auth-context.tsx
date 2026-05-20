import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  isSuperAdmin: boolean;
  loading: boolean;
  refreshRole: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkRole = async (userId: string | undefined) => {
    if (!userId) {
      setIsSuperAdmin(false);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .maybeSingle();
    setIsSuperAdmin(!!data);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Defer role fetch to avoid deadlocks
      setTimeout(() => {
        checkRole(s?.user?.id).finally(() => setLoading(false));
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      checkRole(s?.user?.id).finally(() => setLoading(false));
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshRole = async () => {
    await checkRole(session?.user?.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsSuperAdmin(false);
  };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, isSuperAdmin, loading, refreshRole, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
