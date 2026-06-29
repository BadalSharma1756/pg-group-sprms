import { useEffect, useState } from "react";
import logo from "@/assets/pg-logo.png.asset.json";

export function SplashScreen() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("sprms-splash-shown")) return;
    setShow(true);
    const t = setTimeout(() => {
      sessionStorage.setItem("sprms-splash-shown", "1");
      setShow(false);
    }, 2400);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-gradient-to-br from-background via-background to-primary/10 animate-fade-in">
      <div className="flex flex-col items-center gap-6 text-center px-6">
        <div className="relative">
          <div className="absolute inset-0 -m-8 rounded-full bg-primary/20 blur-3xl animate-pulse" />
          <img src={logo.url} alt="PG" className="relative h-28 md:h-36 w-auto animate-scale-in" />
        </div>
        <div className="space-y-2 animate-fade-in" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            SS Pipe Ricco <span className="text-primary">Management System</span>
          </h1>
          <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">SPRMS · MES v1.0</div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-2 rounded-full bg-primary animate-pulse" />
          Loading workspace…
        </div>
      </div>
    </div>
  );
}