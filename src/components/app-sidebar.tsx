import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Boxes, ShoppingCart, PackageCheck, Wrench, Users, History, Package, Truck, Layers, UserCog, Factory } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const baseGroups = [
  { label: "Overview", items: [{ to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }] },
  { label: "Purchase", items: [
    { to: "/purchase", icon: ShoppingCart, label: "Purchase Orders" },
    { to: "/receipts", icon: PackageCheck, label: "Material Receipts" },
  ]},
  { label: "Store", items: [
    { to: "/inventory", icon: Boxes, label: "Inventory" },
  ]},
  { label: "Master Data", items: [
    { to: "/masters/materials", icon: Wrench, label: "Materials" },
    { to: "/masters/suppliers", icon: Truck, label: "Suppliers" },
    { to: "/masters/departments", icon: Layers, label: "Departments" },
    { to: "/masters/supervisors", icon: UserCog, label: "Supervisors" },
  ]},
  { label: "Insights", items: [
    { to: "/audit", icon: History, label: "Audit Log" },
  ]},
] as const;

export function AppSidebar({ collapsed }: { collapsed: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { hasAny } = useAuth();
  const groups = hasAny(["super_admin"])
    ? [...baseGroups, { label: "Administration", items: [
        { to: "/admin/users", icon: Users, label: "User Management" },
        { to: "/admin/auth-audit", icon: History, label: "Auth Audit" },
      ] as any }]
    : baseGroups;

  return (
    <aside className={cn("shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-[width] duration-200 h-full", collapsed ? "w-16" : "w-64")}>
      <nav className={cn("flex-1 overflow-y-auto py-4 space-y-5", collapsed ? "px-2" : "px-3")}>
        {groups.map((g) => (
          <div key={g.label}>
            {!collapsed && <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/50">{g.label}</div>}
            <div className="space-y-0.5">
              {g.items.map((it: any) => {
                const active = path === it.to || (it.to !== "/dashboard" && path.startsWith(it.to));
                return (
                  <Link key={it.to} to={it.to} title={collapsed ? it.label : undefined}
                    className={cn("relative flex items-center rounded-md text-sm transition-all",
                      collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                      active ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold" : "text-sidebar-foreground/80 hover:bg-sidebar-accent")}>
                    <it.icon className="size-4 shrink-0" />
                    {!collapsed && <span className="truncate">{it.label}</span>}
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
