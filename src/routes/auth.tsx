import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Factory, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — SS Pipe ERP" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`OTP sent to ${email}`);
    setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email, token: otp.trim(), type: "email",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
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
            <CardDescription>
              {step === "email"
                ? "Enter your registered email — we'll send you a one-time code (OTP)."
                : `Enter the 6-digit code sent to ${email}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "email" ? (
              <form onSubmit={sendOtp} className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="e">Email</Label>
                  <Input id="e" type="email" required autoFocus value={email}
                    onChange={(e)=>setEmail(e.target.value)} placeholder="you@company.com" />
                </div>
                <Button type="submit" className="w-full" disabled={busy || !email}>{busy?"Sending…":"Send OTP"}</Button>
                <p className="text-xs text-muted-foreground text-center">
                  Accounts are created by your Super Admin. No password required.
                </p>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="otp">One-time code</Label>
                  <Input id="otp" inputMode="numeric" pattern="[0-9]*" required autoFocus
                    value={otp} onChange={(e)=>setOtp(e.target.value)}
                    placeholder="6-digit code" maxLength={6}
                    className="tracking-[0.4em] text-center text-lg" />
                </div>
                <Button type="submit" className="w-full" disabled={busy || otp.length < 6}>
                  {busy ? "Verifying…" : "Verify & sign in"}
                </Button>
                <div className="flex items-center justify-between text-xs">
                  <button type="button"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    onClick={()=>{ setStep("email"); setOtp(""); }}>
                    <ArrowLeft className="size-3"/> Change email
                  </button>
                  <button type="button" className="text-primary hover:underline" disabled={busy}
                    onClick={async ()=>{
                      setBusy(true);
                      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
                      setBusy(false);
                      if (error) toast.error(error.message); else toast.success("New OTP sent");
                    }}>
                    Resend code
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}