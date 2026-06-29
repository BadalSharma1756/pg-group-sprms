// Lightweight runtime diagnostics: captures console + network + session events
// Safe to import anywhere; installs interceptors once.

type Entry = {
  ts: string;
  kind: "console" | "network" | "session" | "navigation" | "error";
  level?: string;
  message: string;
  detail?: any;
};

const MAX = 500;
const buffer: Entry[] = [];
const listeners = new Set<() => void>();

function push(e: Entry) {
  buffer.push(e);
  if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX);
  listeners.forEach((l) => { try { l(); } catch {} });
}

export const diagnostics = {
  log(kind: Entry["kind"], message: string, detail?: any, level?: string) {
    push({ ts: new Date().toISOString(), kind, level, message, detail });
  },
  all(): Entry[] { return [...buffer]; },
  subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); },
  clear() { buffer.length = 0; listeners.forEach((l) => l()); },
};

let installed = false;
export function installDiagnostics() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  (["log", "warn", "error", "info"] as const).forEach((level) => {
    const orig = (console as any)[level].bind(console);
    (console as any)[level] = (...args: any[]) => {
      try {
        diagnostics.log("console", args.map((a) => {
          if (a instanceof Error) return a.message;
          if (typeof a === "string") return a;
          try { return JSON.stringify(a); } catch { return String(a); }
        }).join(" "), undefined, level);
      } catch {}
      orig(...args);
    };
  });

  const origFetch = window.fetch.bind(window);
  window.fetch = async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input?.url ?? String(input);
    const method = (init?.method || (typeof input !== "string" && input?.method) || "GET").toUpperCase();
    const started = performance.now();
    try {
      const res = await origFetch(input, init);
      diagnostics.log("network", `${method} ${url} → ${res.status}`, { ms: Math.round(performance.now() - started), status: res.status });
      return res;
    } catch (err: any) {
      diagnostics.log("network", `${method} ${url} → ERROR`, { ms: Math.round(performance.now() - started), error: err?.message }, "error");
      throw err;
    }
  };

  window.addEventListener("error", (e) => {
    diagnostics.log("error", e.message || "window.error", { filename: e.filename, lineno: e.lineno, colno: e.colno }, "error");
  });
  window.addEventListener("unhandledrejection", (e: any) => {
    diagnostics.log("error", `Unhandled rejection: ${e.reason?.message ?? String(e.reason)}`, undefined, "error");
  });
}

export function downloadDiagnostics() {
  const blob = new Blob([JSON.stringify({
    capturedAt: new Date().toISOString(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    url: typeof window !== "undefined" ? window.location.href : "",
    entries: diagnostics.all(),
  }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sprms-diagnostics-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}