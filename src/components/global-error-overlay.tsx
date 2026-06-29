import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";

type ErrInfo = { message: string; source: string; stack?: string };

export function GlobalErrorOverlay() {
  const [err, setErr] = useState<ErrInfo | null>(null);

  useEffect(() => {
    const onErr = (e: ErrorEvent) => {
      setErr({ message: e.message || "Unknown error", source: e.filename || "window", stack: e.error?.stack });
    };
    const onRej = (e: PromiseRejectionEvent) => {
      const r: any = e.reason;
      setErr({ message: r?.message || String(r) || "Unhandled rejection", source: "promise", stack: r?.stack });
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  if (!err) return null;
  return (
    <div className="fixed bottom-4 left-4 z-[90] max-w-md rounded-lg border border-destructive/40 bg-card shadow-lg">
      <div className="flex items-start gap-3 p-4">
        <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">Something failed</div>
          <div className="mt-1 text-xs text-muted-foreground break-words">{err.message}</div>
          <div className="text-[10px] text-muted-foreground mt-1 font-mono truncate">{err.source}</div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => window.location.reload()} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              <RefreshCw className="size-3" />Retry
            </button>
            <button onClick={() => setErr(null)} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-accent">Dismiss</button>
          </div>
        </div>
        <button onClick={() => setErr(null)} aria-label="Close" className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
      </div>
    </div>
  );
}