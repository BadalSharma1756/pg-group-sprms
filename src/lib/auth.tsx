import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "super_admin" | "plant_admin" | "production_manager" | "production_operator"
  | "purchase_manager" | "purchase_executive" | "store_manager"
  | "quality_manager" | "auditor" | "viewer";

/** First route a user with the given roles should land on after sign-in. */
export function landingPathFor(roles: AppRole[]): string {
  const has = (r: AppRole) => roles.includes(r);
  if (has("super_admin") || has("plant_admin")) return "/dashboard";
  if (has("production_manager") || has("production_operator")) return "/production";
  if (has("purchase_manager") || has("purchase_executive")) return "/purchase";
  if (has("store_manager")) return "/inventory";
  if (has("quality_manager")) return "/gap-verification";
  if (has("auditor")) return "/audit";
  return "/dashboard";
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  hasAny: (roles: AppRole[]) => boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadRoles(s.user.id), 0);
      } else {
        setRoles([]);
      }
      setLoading(false);
    });
    supabase.auth.getSession()
      .then(({ data }) => {
        setSession(data.session);
        if (data.session?.user) loadRoles(data.session.user.id).finally(() => setLoading(false));
        else setLoading(false);
      })
      .catch((err) => {
        console.error("[auth] getSession failed", err);
        setLoading(false);
      });
    // Safety net — never leave the app stuck in loading
    const safety = setTimeout(() => setLoading(false), 3000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(safety); };
  }, []);

  async function loadRoles(uid: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r) => r.role as AppRole));
  }

  const hasAny = (rs: AppRole[]) => rs.some((r) => roles.includes(r));
  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    hasAny,
    isAdmin: hasAny(["super_admin", "plant_admin"]),
    signOut: async () => {
      await supabase.auth.signOut();
      window.location.href = "/auth";
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}