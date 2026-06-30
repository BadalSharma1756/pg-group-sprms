import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { ScopeProvider } from "@/lib/scope";
import { ScopeSwitcher } from "@/components/scope-switcher";
import { Loader2, Menu } from "lucide-react";
import logo from "@/assets/pg-logo.png.asset.json";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";

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
    const t = setTimeout(() => setTimedOut(true), 4000);
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggle = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setMobileOpen((v) => !v);
      return;
    }
    setCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ss-erp-sidebar-collapsed", next ? "1" : "0");
      }
      return next;
    });
  };
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" style={{ ["--app-header-h" as any]: "64px" }}>
      <header className="h-16 shrink-0 z-50 header-gradient text-foreground border-b border-border flex items-center gap-3 px-3 md:px-5 shadow-sm transition-shadow duration-200 hover:shadow-md backdrop-saturate-150">
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="size-9 grid place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-14 grid place-items-center shrink-0 shrink-0">
            <img src={logo.url} alt="PG" className="size-full object-contain drop-shadow" />
          </div>
          <div className="min-w-0 hidden sm:block">
            <div className="font-bold tracking-tight text-base leading-tight truncate text-foreground">SPRMS</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">SS Pipe Ricco Management System</div>
          </div>
        </div>
        <div className="flex-1" />
        <ScopeSwitcher />
        <ThemeToggle />
        <UserMenu />
      </header>
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="hidden md:block h-full overflow-hidden">
          <AppSidebar collapsed={collapsed} />
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-[18rem] md:hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left duration-300">
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <div onClick={() => setMobileOpen(false)}>
              <AppSidebar collapsed={false} />
            </div>
          </SheetContent>
        </Sheet>
        <main className="flex-1 min-w-0 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}