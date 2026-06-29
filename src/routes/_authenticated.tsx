import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { ScopeProvider } from "@/lib/scope";
import { ScopeSwitcher } from "@/components/scope-switcher";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
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