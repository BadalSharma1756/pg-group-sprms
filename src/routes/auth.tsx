import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Factory } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — SS Pipe ERP" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Welcome back"); navigate({ to: "/dashboard" }); }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Account created — you can sign in now.");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-md bg-primary grid place-items-center"><Factory className="size-5" /></div>
          <div className="font-semibold tracking-tight">SS Pipe ERP</div>
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-bold leading-tight">Material Planning &amp; Inventory Management</h1>
          <p className="text-sidebar-foreground/70 max-w-md">
            Replace Excel with an end-to-end MES: automatic consumption, transactional inventory, and gap verification —
            built for the shop floor.
          </p>
        </div>
        <div className="text-xs text-sidebar-foreground/50">© SS Pipe Manufacturing</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in to your workspace</CardTitle>
            <CardDescription>The first account becomes Super Admin automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="signin">Sign in</TabsTrigger><TabsTrigger value="signup">Create account</TabsTrigger></TabsList>
              <TabsContent value="signin">
                <form onSubmit={signIn} className="space-y-4 pt-4">
                  <div><Label htmlFor="e">Email</Label><Input id="e" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} /></div>
                  <div><Label htmlFor="p">Password</Label><Input id="p" type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} /></div>
                  <Button type="submit" className="w-full" disabled={busy}>{busy?"Signing in…":"Sign in"}</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signUp} className="space-y-4 pt-4">
                  <div><Label htmlFor="n">Full name</Label><Input id="n" required value={fullName} onChange={(e)=>setFullName(e.target.value)} /></div>
                  <div><Label htmlFor="e2">Email</Label><Input id="e2" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} /></div>
                  <div><Label htmlFor="p2">Password</Label><Input id="p2" type="password" required minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} /></div>
                  <Button type="submit" className="w-full" disabled={busy}>{busy?"Creating…":"Create account"}</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}