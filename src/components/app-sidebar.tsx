import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Factory, ShoppingCart, Boxes, ClipboardCheck, Trash2, BarChart3,
  Building2, Layers, Truck, Ruler, Package, Wrench, Users, ScrollText, LogOut, Settings,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const groups: { label: string; items: { to: string; icon: any; label: string }[] }[] = [
  { label: "Overview", items: [{ to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }] },
  { label: "Operations", items: [
    { to: "/production", icon: Factory, label: "Production" },
    { to: "/purchase", icon: ShoppingCart, label: "Purchase" },
    { to: "/inventory", icon: Boxes, label: "Inventory" },
    { to: "/gap", icon: ClipboardCheck, label: "Gap Verification" },
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
    { to: "/audit", icon: ScrollText, label: "Audit Logs" },
    { to: "/users", icon: Users, label: "Users & Roles" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ]},
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut, roles } = useAuth();

  return (
    <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0 border-r border-sidebar-border">
      <div className="px-5 py-4 flex items-center gap-3 border-b border-sidebar-border">
        <div className="size-9 rounded-md bg-primary grid place-items-center"><Factory className="size-5" /></div>
        <div>
          <div className="font-semibold tracking-tight text-sm">SS Pipe ERP</div>
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">MES · v1.0</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/50">{g.label}</div>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const active = path === it.to || (it.to !== "/dashboard" && path.startsWith(it.to));
                return (
                  <Link key={it.to} to={it.to}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}>
                    <it.icon className="size-4" />{it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <div className="px-3 py-2 text-xs">
          <div className="font-medium truncate">{user?.email}</div>
          <div className="text-sidebar-foreground/60 truncate">{roles.join(", ") || "no role"}</div>
        </div>
        <button onClick={signOut} className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent">
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}