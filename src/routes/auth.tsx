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
import { ArrowLeft, ShieldAlert, Timer, Mail, KeyRound, ShieldCheck, Sparkles, Factory, Boxes, LineChart } from "lucide-react";
import { logAuthEvent, checkLockout } from "@/lib/auth-events.functions";
import { requestOtpEmail, verifyOtpEmail } from "@/lib/smtp-otp.functions";
import logo from "@/assets/pg-logo.png.asset.json";

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
  const sendOtpSmtp = useServerFn(requestOtpEmail);
  const verifyOtp = useServerFn(verifyOtpEmail);

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
      try {
        const res: any = await sendOtpSmtp({ data: { email } });
        if (res?.locked) {
          setLockedUntil(new Date(res.unlock_at).getTime());
          toast.error("Account temporarily locked. Try again later.");
          return false;
        }
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to send OTP");
        return false;
      }
      if (isResend) {
        await logEvent({ data: { email, event_type: "resend_otp", success: true } });
      }
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
    const res: any = await verifyOtp({ data: { email, token: otp.trim() } });
    if (!res?.ok) {
      setBusy(false);
      if (res?.locked) {
        const mins = res.lockout_minutes ?? 15;
        setLockedUntil(Date.now() + mins * 60_000);
        toast.error(`Too many failed attempts. Locked for ${mins} minutes.`);
      } else {
        const remaining = Math.max(0, (res?.threshold ?? 5) - (res?.failed_count ?? 0));
        toast.error(`${res?.message ?? "Invalid OTP"} — ${remaining} attempt(s) left`);
      }
      return;
    }
    const { error: sErr } = await supabase.auth.setSession({
      access_token: res.access_token, refresh_token: res.refresh_token,
    });
    setBusy(false);
    if (sErr) { toast.error(sErr.message); return; }
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  }

  const locked = !!(lockedUntil && lockedUntil > Date.now());

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-indigo-50 to-rose-50">
      {/* decorative blobs */}
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-32 size-[28rem] rounded-full bg-gradient-to-br from-sky-300/40 to-indigo-300/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-32 size-[32rem] rounded-full bg-gradient-to-br from-rose-300/40 to-amber-200/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-1/3 left-1/2 size-[20rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-200/30 to-cyan-200/30 blur-3xl" />

      <div className="relative grid min-h-screen lg:grid-cols-2">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-blue-600 to-sky-500" />
          <div aria-hidden className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
          <div aria-hidden className="absolute -top-20 -right-20 size-80 rounded-full bg-white/10 blur-2xl" />

          <div className="relative flex items-center gap-3">
            <div className="size-12 rounded-xl bg-white/95 grid place-items-center shadow-lg ring-1 ring-white/40">
              <img src={logo.url} alt="SPRMS" className="size-9 object-contain" />
            </div>
            <div>
              <div className="font-bold tracking-tight text-lg leading-none">SPRMS</div>
              <div className="text-xs text-white/80 mt-1">SS Pipe Ricco Management System</div>
            </div>
          </div>

          <div className="relative space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-medium ring-1 ring-white/25">
              <Sparkles className="size-3.5" /> Enterprise MES • v1.0
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight">
              Material Planning &amp;<br /> Inventory, reimagined.
            </h1>
            <p className="text-white/80 max-w-md leading-relaxed">
              Replace Excel with an end-to-end MES — automatic BOM consumption,
              transactional inventory, and real-time gap verification for the shop floor.
            </p>
            <div className="grid grid-cols-3 gap-3 max-w-md pt-2">
              {[
                { icon: Factory, label: "Production" },
                { icon: Boxes, label: "Inventory" },
                { icon: LineChart, label: "Analytics" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/20 p-3 text-center">
                  <Icon className="size-5 mx-auto mb-1.5 text-white" />
                  <div className="text-xs font-medium">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative text-xs text-white/70 flex items-center gap-2">
            <ShieldCheck className="size-3.5" /> Secured by OTP • © SS Pipe Manufacturing
          </div>
        </div>

        {/* Form panel */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            {/* mobile brand */}
            <div className="lg:hidden flex flex-col items-center gap-2 mb-6">
              <div className="size-14 rounded-2xl bg-white grid place-items-center shadow-md ring-1 ring-slate-200">
                <img src={logo.url} alt="SPRMS" className="size-10 object-contain" />
              </div>
              <div className="text-center">
                <div className="font-bold tracking-tight text-slate-900">SPRMS</div>
                <div className="text-[11px] text-slate-500">SS Pipe Ricco Management System</div>
              </div>
            </div>

            <Card className="border-white/60 bg-white/80 backdrop-blur-xl shadow-2xl shadow-indigo-500/10 rounded-2xl">
              <CardHeader className="space-y-2">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-1 text-[11px] font-semibold ring-1 ring-indigo-100">
                  {step === "email" ? <><Mail className="size-3" /> Step 1 of 2</> : <><KeyRound className="size-3" /> Step 2 of 2</>}
                </div>
                <CardTitle className="text-2xl tracking-tight">
                  {step === "email" ? "Welcome back" : "Verify it's you"}
                </CardTitle>
                <CardDescription>
                  {step === "email"
                    ? "Enter your registered email — we'll send a one-time code."
                    : <>We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.</>}
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
              <form onSubmit={sendOtp} className="space-y-5 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="e">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input id="e" type="email" required autoFocus value={email}
                      onChange={(e)=>setEmail(e.target.value)} placeholder="you@company.com"
                      className="pl-10 h-11" />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/25" disabled={busy || !email || locked}>
                  {busy ? "Sending…" : "Send one-time code"}
                </Button>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 justify-center">
                  <ShieldCheck className="size-3.5 text-emerald-600" />
                  Accounts are provisioned by your Super Admin. No password required.
                </div>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="space-y-5 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="otp">One-time code</Label>
                  <Input id="otp" inputMode="numeric" pattern="[0-9]*" required autoFocus
                    value={otp} onChange={(e)=>setOtp(e.target.value)}
                    placeholder="••••••" maxLength={6}
                    className="tracking-[0.6em] text-center text-2xl font-semibold h-14" />
                  <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Timer className="size-3" />
                    {expiresIn > 0
                      ? <>Code expires in <span className="font-medium text-foreground">{fmt(expiresIn)}</span></>
                      : <span className="text-destructive">Code expired — request a new one</span>}
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/25"
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
                    className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
                    disabled={busy || cooldown > 0 || locked}
                    onClick={() => dispatchOtp(true)}>
                    {cooldown > 0 ? `Resend in ${fmt(cooldown)}` : "Resend code"}
                  </button>
                </div>
              </form>
            )}
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs text-slate-500">
              Need access? Contact your Super Admin to provision an account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
