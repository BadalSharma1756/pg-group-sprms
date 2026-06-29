import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, ShieldAlert, Mail, CheckCircle2, XCircle, Lock, Send, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/auth-audit")({ component: Page });

const TYPES = [
  { v: "all", label: "All events" },
  { v: "otp_sent", label: "OTP sent" },
  { v: "resend_otp", label: "OTP resent" },
  { v: "admin_otp_sent", label: "Admin OTP sent" },
  { v: "otp_verified", label: "Verified" },
  { v: "otp_failed", label: "Failed verification" },
  { v: "lockout", label: "Lockout" },
];

function iconFor(t: string) {
  switch (t) {
    case "otp_sent": return <Mail className="size-4 text-blue-600" />;
    case "resend_otp": return <RefreshCw className="size-4 text-blue-600" />;
    case "admin_otp_sent": return <Send className="size-4 text-violet-600" />;
    case "otp_verified": return <CheckCircle2 className="size-4 text-emerald-600" />;
    case "otp_failed": return <XCircle className="size-4 text-amber-600" />;
    case "lockout": return <Lock className="size-4 text-red-600" />;
    default: return <ShieldAlert className="size-4" />;
  }
}

function Page() {
  const { hasAny } = useAuth();
  if (!hasAny(["super_admin"])) {
    return (
      <PageBody>
        <div className="rounded-md border bg-card p-8 text-center">
          <Shield className="size-10 mx-auto text-muted-foreground mb-3" />
          <div className="font-semibold">Super-admin only</div>
          <div className="text-sm text-muted-foreground">You need super_admin role to view the auth audit log.</div>
        </div>
      </PageBody>
    );
  }

  const [emailQ, setEmailQ] = useState("");
  const [type, setType] = useState("all");
  const [days, setDays] = useState("7");

  const { data, isLoading } = useQuery({
    queryKey: ["auth-events", type, days],
    queryFn: async () => {
      const since = new Date(Date.now() - parseInt(days, 10) * 86_400_000).toISOString();
      let q = supabase.from("auth_events").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(500);
      if (type !== "all") q = q.eq("event_type", type);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15_000,
  });

  const rows = useMemo(() => {
    const q = emailQ.trim().toLowerCase();
    return (data ?? []).filter((r: any) => !q || r.email?.toLowerCase().includes(q));
  }, [data, emailQ]);

  return (
    <>
      <PageHeader title="Authentication Audit" subtitle="OTP send/verify activity, failures and lockout events" />
      <PageBody>
        <div className="flex flex-wrap gap-3 mb-4">
          <Input placeholder="Search by email…" value={emailQ} onChange={(e)=>setEmailQ(e.target.value)} className="max-w-xs" />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-56"><SelectValue/></SelectTrigger>
            <SelectContent>{TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-40"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border bg-card divide-y">
          {isLoading && <div className="p-6 text-sm text-muted-foreground">Loading events…</div>}
          {!isLoading && rows.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No events match these filters.</div>
          )}
          {rows.map((r: any) => (
            <div key={r.id} className="flex items-start gap-3 p-3">
              <div className="mt-0.5">{iconFor(r.event_type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{r.email}</span>
                  <Badge variant={r.success ? "secondary" : "destructive"} className="text-[10px]">
                    {r.event_type.replace(/_/g, " ")}
                  </Badge>
                  {!r.success && <Badge variant="destructive" className="text-[10px]">failure</Badge>}
                </div>
                {r.message && <div className="text-xs text-muted-foreground mt-0.5 truncate">{r.message}</div>}
              </div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </PageBody>
    </>
  );
}
