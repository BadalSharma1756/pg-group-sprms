import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Factory, ShoppingCart, Boxes, ClipboardCheck, Trash2, BarChart3,
  Building2, Layers, Truck, Ruler, Package, Wrench, History, Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

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

export function AppSidebar({ collapsed }: { collapsed: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { hasAny } = useAuth();
  const groups = hasAny(["super_admin"])
    ? [...baseGroups, { label: "Administration", items: [
        { to: "/admin/users", icon: Users, label: "User Management" },
        { to: "/admin/auth-audit", icon: History, label: "Auth Audit" },
      ] }]
    : baseGroups;

  return (
    <aside
      className={cn(
        "shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-[width] duration-200 sticky top-16 h-full",
        collapsed ? "w-16" : "w-64",
      )}
    >
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
                      "relative flex items-center rounded-md text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                      collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r before:bg-sidebar-primary-foreground/80"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <it.icon className="size-4 shrink-0" />
                    {!collapsed && (
                      <span className={cn("truncate", active && "underline underline-offset-4 decoration-2 decoration-sidebar-primary-foreground/70")}>{it.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}