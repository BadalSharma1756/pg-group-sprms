import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bug, Download, RefreshCw, Trash2 } from "lucide-react";
import { diagnostics, downloadDiagnostics } from "@/lib/diagnostics";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function DiagnosticsPanel() {
  const { session, loading, roles, hasAny } = useAuth();
  if (!hasAny(["super_admin"])) return null;
  const [, force] = useState(0);
  const [lastGet, setLastGet] = useState<{ ok: boolean; ms: number; at: string; err?: string } | null>(null);

  useEffect(() => {
    const unsub = diagnostics.subscribe(() => force((x) => x + 1));
    return () => { unsub; };
  }, []);

  const refresh = async () => {
    const t0 = performance.now();
    try {
      const { data, error } = await supabase.auth.getSession();
      const ms = Math.round(performance.now() - t0);
      const at = new Date().toISOString();
      if (error) setLastGet({ ok: false, ms, at, err: error.message });
      else setLastGet({ ok: !!data.session, ms, at });
      diagnostics.log("session", `getSession ${data.session ? "ok" : "no-session"} (${ms}ms)`);
    } catch (e: any) {
      setLastGet({ ok: false, ms: 0, at: new Date().toISOString(), err: e?.message });
    }
  };
  useEffect(() => { refresh(); }, []);

  const exp = session?.expires_at ? new Date(session.expires_at * 1000) : null;
  const expIn = exp ? Math.round((exp.getTime() - Date.now()) / 1000) : null;
  const entries = diagnostics.all().slice(-200).reverse();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          aria-label="Diagnostics"
          className="fixed bottom-4 right-4 z-40 size-11 grid place-items-center rounded-full bg-card border shadow-md hover:bg-accent text-muted-foreground"
        >
          <Bug className="size-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>Session Diagnostics</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4 text-sm">
          <div className="rounded-lg border bg-card p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Auth loading</span>
              <Badge variant={loading ? "secondary" : "default"}>{loading ? "loading" : "ready"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Session</span>
              <Badge variant={session ? "default" : "secondary"}>{session ? "active" : "none"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">User</span>
              <span className="font-mono text-xs">{session?.user?.email ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Roles</span>
              <span className="font-mono text-xs">{roles.join(", ") || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">JWT expires</span>
              <span className="font-mono text-xs">{exp ? `${exp.toLocaleTimeString()} (${expIn}s)` : "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last getSession</span>
              <span className="font-mono text-xs">
                {lastGet ? `${lastGet.ok ? "ok" : "fail"} · ${lastGet.ms}ms` : "—"}
              </span>
            </div>
            {lastGet?.err && <div className="text-xs text-destructive">{lastGet.err}</div>}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={refresh}><RefreshCw className="size-3 mr-1" />Refresh</Button>
            <Button size="sm" variant="outline" onClick={downloadDiagnostics}><Download className="size-3 mr-1" />Download logs</Button>
            <Button size="sm" variant="ghost" onClick={() => diagnostics.clear()}><Trash2 className="size-3 mr-1" />Clear</Button>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recent events ({entries.length})</div>
            <div className="rounded-lg border bg-card max-h-[50vh] overflow-y-auto divide-y">
              {entries.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">No events captured yet.</div>
              ) : entries.map((e, i) => (
                <div key={i} className="p-2 text-xs flex gap-2">
                  <Badge variant={e.level === "error" ? "destructive" : e.kind === "network" ? "default" : "secondary"} className="shrink-0 text-[10px] uppercase">{e.kind}</Badge>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono">{e.message}</div>
                    <div className="text-[10px] text-muted-foreground">{e.ts}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}