import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { ScopeProvider } from "@/lib/scope";
import { ScopeSwitcher } from "@/components/scope-switcher";
import { PanelLeftClose, PanelLeftOpen, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <div className="text-center max-w-sm">
          <Loader2 className="size-8 text-primary animate-spin mx-auto" />
          <div className="mt-4 text-sm text-muted-foreground">Loading your workspace…</div>
          {timedOut && (
            <div className="mt-6 rounded-lg border bg-card p-4 text-left">
              <div className="text-sm font-semibold text-foreground">Still loading?</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Session restore is taking longer than expected. Check your network or try signing in again.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => window.location.reload()} className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Retry</button>
                <button onClick={() => navigate({ to: "/auth", replace: true })} className="inline-flex items-center justify-center rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">Go to sign in</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  if (!session) return null;

  return (
    <ScopeProvider>
      <LayoutInner />
    </ScopeProvider>
  );
}

function LayoutInner() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("ss-erp-sidebar-collapsed") === "1";
  });
  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ss-erp-sidebar-collapsed", next ? "1" : "0");
      }
      return next;
    });
  };
  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar collapsed={collapsed} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 sticky top-0 z-30 bg-card/95 backdrop-blur border-b flex items-center gap-3 px-4 md:px-6">
          <button
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="size-9 grid place-items-center rounded-md border bg-background hover:bg-accent text-muted-foreground"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
          <div className="flex-1" />
          <ScopeSwitcher />
        </header>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}