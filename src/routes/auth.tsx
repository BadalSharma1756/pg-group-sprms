import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Factory, ArrowLeft, ShieldAlert, Timer } from "lucide-react";
import { logAuthEvent, checkLockout, recordOtpFailure } from "@/lib/auth-events.functions";

const OTP_EXPIRY_SEC = 10 * 60;
const RESEND_COOLDOWN_SEC = 60;

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — SS Pipe ERP" }] }),
  component: AuthPage,
});

function fmt(sec: number) {
  const m = Math.floor(sec / 60); const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function AuthPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [expiresIn, setExpiresIn] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const logEvent = useServerFn(logAuthEvent);
  const check = useServerFn(checkLockout);
  const recordFail = useServerFn(recordOtpFailure);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setExpiresIn((s) => (s > 0 ? s - 1 : 0));
      setCooldown((s) => (s > 0 ? s - 1 : 0));
      setLockedUntil((t) => (t && t <= Date.now() ? null : t));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  async function dispatchOtp(isResend: boolean) {
    setBusy(true);
    try {
      const lock: any = await check({ data: { email } });
      if (lock?.locked) {
        const unlockAt = new Date(lock.unlock_at).getTime();
        setLockedUntil(unlockAt);
        toast.error(`Account temporarily locked. Try again at ${new Date(unlockAt).toLocaleTimeString()}`);
        return false;
      }
      const { error } = await supabase.auth.signInWithOtp({
        email, options: { shouldCreateUser: false },
      });
      if (error) {
        await logEvent({ data: { email, event_type: "otp_sent", success: false, message: error.message } });
        toast.error(error.message);
        return false;
      }
      await logEvent({ data: { email, event_type: isResend ? "resend_otp" : "otp_sent", success: true } });
      toast.success(isResend ? "New OTP sent" : `OTP sent to ${email}`);
      setExpiresIn(OTP_EXPIRY_SEC);
      setCooldown(RESEND_COOLDOWN_SEC);
      return true;
    } finally { setBusy(false); }
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    const ok = await dispatchOtp(false);
    if (ok) setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (expiresIn === 0) { toast.error("OTP expired — please request a new one"); return; }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email, token: otp.trim(), type: "email",
    });
    setBusy(false);
    if (error) {
      const res: any = await recordFail({ data: { email, message: error.message } });
      if (res?.locked) {
        setLockedUntil(Date.now() + res.lockout_minutes * 60_000);
        toast.error(`Too many failed attempts. Locked for ${res.lockout_minutes} minutes.`);
      } else {
        const remaining = Math.max(0, (res?.threshold ?? 5) - (res?.failed_count ?? 0));
        toast.error(`${error.message} — ${remaining} attempt(s) left`);
      }
      return;
    }
    await logEvent({ data: { email, event_type: "otp_verified", success: true } });
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  }

  const locked = !!(lockedUntil && lockedUntil > Date.now());

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
            {locked && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <ShieldAlert className="size-4 mt-0.5 text-destructive" />
                <div>
                  <div className="font-medium text-destructive">Account temporarily locked</div>
                  <div className="text-muted-foreground">
                    Unlocks in {fmt(Math.max(0, Math.ceil((lockedUntil! - Date.now()) / 1000)))}
                  </div>
                </div>
              </div>
            )}
            {step === "email" ? (
              <form onSubmit={sendOtp} className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="e">Email</Label>
                  <Input id="e" type="email" required autoFocus value={email}
                    onChange={(e)=>setEmail(e.target.value)} placeholder="you@company.com" />
                </div>
                <Button type="submit" className="w-full" disabled={busy || !email || locked}>
                  {busy?"Sending…":"Send OTP"}
                </Button>
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
                  <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Timer className="size-3" />
                    {expiresIn > 0
                      ? <>Code expires in <span className="font-medium text-foreground">{fmt(expiresIn)}</span></>
                      : <span className="text-destructive">Code expired — request a new one</span>}
                  </div>
                </div>
                <Button type="submit" className="w-full"
                  disabled={busy || otp.length < 6 || expiresIn === 0 || locked}>
                  {busy ? "Verifying…" : "Verify & sign in"}
                </Button>
                <div className="flex items-center justify-between text-xs">
                  <button type="button"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    onClick={()=>{ setStep("email"); setOtp(""); setExpiresIn(0); }}>
                    <ArrowLeft className="size-3"/> Change email
                  </button>
                  <button type="button"
                    className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
                    disabled={busy || cooldown > 0 || locked}
                    onClick={() => dispatchOtp(true)}>
                    {cooldown > 0 ? `Resend in ${fmt(cooldown)}` : "Resend code"}
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
