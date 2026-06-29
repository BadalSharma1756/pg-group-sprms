import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, LayoutDashboard, Factory, ShoppingCart, Boxes, BarChart3, UserCircle2, ShieldCheck } from "lucide-react";

export function UserMenu() {
  const { user, roles, signOut } = useAuth();
  const email = user?.email ?? "Signed in";
  const initials = (email.split("@")[0] || "U").slice(0, 2).toUpperCase();
  const role = roles[0] || "viewer";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
        aria-label="Open user menu"
      >
        <div className="size-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-semibold ring-2 ring-primary/20">
          {initials}
        </div>
        <div className="hidden md:flex flex-col items-start leading-tight min-w-0 max-w-[160px]">
          <span className="text-xs font-medium truncate text-foreground">{email}</span>
          <span className="text-[10px] uppercase tracking-wider text-primary/80 font-semibold flex items-center gap-1">
            <ShieldCheck className="size-3" /> {role.replace("_", " ")}
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-2">
          <UserCircle2 className="size-4 text-primary" />
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{email}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {roles.join(", ") || "no role"}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/dashboard"><LayoutDashboard className="size-4" /> Dashboard</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/production"><Factory className="size-4" /> Production</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/purchase"><ShoppingCart className="size-4" /> Purchase</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/inventory"><Boxes className="size-4" /> Inventory</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/reports"><BarChart3 className="size-4" /> Reports</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}