import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Factory, ShoppingCart, Boxes, ClipboardCheck, Trash2, BarChart3,
  Building2, Layers, Truck, Ruler, Package, Wrench, LogOut, History, Users,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import logo from "@/assets/pg-logo.png.asset.json";

const baseGroups: { label: string; items: { to: string; icon: any; label: string }[] }[] = [
  { label: "Overview", items: [{ to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }] },
  { label: "Operations", items: [
    { to: "/production", icon: Factory, label: "Production" },
    { to: "/purchase", icon: ShoppingCart, label: "Purchase" },
    { to: "/inventory", icon: Boxes, label: "Inventory" },
    { to: "/gap-verification", icon: ClipboardCheck, label: "Gap Verification" },
    { to: "/scrap", icon: Trash2, label: "Scrap" },
  ]},
  { label: "Master Data", items: [
    { to: "/masters/products", icon: Package, label: "Products" },
    { to: "/masters/materials", icon: Wrench, label: "Materials" },
    { to: "/masters/pipe-sizes", icon: Ruler, label: "Pipe Sizes" },
    { to: "/masters/suppliers", icon: Truck, label: "Suppliers" },
    { to: "/masters/departments", icon: Layers, label: "Departments" },
    { to: "/masters/plants", icon: Building2, label: "Plants" },
  ]},
  { label: "Insights", items: [
    { to: "/reports", icon: BarChart3, label: "Reports" },
    { to: "/audit", icon: History, label: "Audit Log" },
  ]},
];

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut, roles, hasAny } = useAuth();
  const groups = hasAny(["super_admin"])
    ? [...baseGroups, { label: "Administration", items: [{ to: "/admin/users", icon: Users, label: "User Management" }] }]
    : baseGroups;

  return (
    <aside
      className={cn(
        "shrink-0 bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0 border-r border-sidebar-border transition-[width] duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className={cn("flex items-center border-b border-sidebar-border bg-gradient-to-r from-primary/5 to-transparent relative", collapsed ? "flex-col gap-2 px-2 py-3" : "gap-3 px-4 py-3")}>
        <div className={cn("rounded-lg bg-white grid place-items-center shrink-0 p-1.5 ring-1 ring-primary/20 shadow-sm", collapsed ? "size-11" : "size-14")}>
          <img src={logo.url} alt="PG" className="size-full object-contain" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="font-bold tracking-tight text-base truncate text-foreground">SPRMS</div>
            <div className="text-[10px] uppercase tracking-wider text-primary/80 font-medium">SS Pipe Ricco · v1.0</div>
          </div>
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
          className={cn(
            "size-7 grid place-items-center rounded-md border bg-background hover:bg-accent text-muted-foreground shrink-0",
            collapsed ? "" : "ml-auto",
          )}
        >
          {collapsed ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
        </button>
      </div>
      <nav className={cn("flex-1 overflow-y-auto py-4 space-y-5", collapsed ? "px-2" : "px-3")}>
        {groups.map((g) => (
          <div key={g.label}>
            {!collapsed && (
              <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/50">{g.label}</div>
            )}
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const active = path === it.to || (it.to !== "/dashboard" && path.startsWith(it.to));
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    title={collapsed ? it.label : undefined}
                    className={cn(
                      "flex items-center rounded-md text-sm transition-colors",
                      collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <it.icon className="size-4 shrink-0" />
                    {!collapsed && <span className="truncate">{it.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className={cn("border-t border-sidebar-border space-y-1", collapsed ? "p-2" : "p-3")}>
        {!collapsed && (
          <div className="px-3 py-2 text-xs">
            <div className="font-medium truncate">{user?.email}</div>
            <div className="text-sidebar-foreground/60 truncate">{roles.join(", ") || "no role"}</div>
          </div>
        )}
        <button
          onClick={signOut}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "w-full flex items-center rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent",
            collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
          )}
        >
          <LogOut className="size-4" />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </aside>
  );
}