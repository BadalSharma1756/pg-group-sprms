import { useAuth } from "@/lib/auth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Mail } from "lucide-react";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const email = user?.email ?? "Signed in";
  const initials = (email.split("@")[0] || "U").slice(0, 2).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full p-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
        aria-label="Open user menu"
      >
        <div className="size-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-semibold ring-2 ring-primary/20">
          {initials}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        alignOffset={0}
        collisionPadding={12}
        avoidCollisions={false}
        className="w-56"
      >
        <div className="flex items-center gap-2 px-2 py-2">
          <Mail className="size-4 text-primary shrink-0" />
          <span className="text-xs font-medium truncate text-foreground">{email}</span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}