import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-card/60 px-4 md:px-6 py-2 border-b">
      <div className="min-w-0">
        <h1 className="text-[15px] font-semibold tracking-tight leading-tight truncate text-foreground">{title}</h1>
        {subtitle && <p className="text-[11px] text-muted-foreground leading-tight truncate">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="px-4 md:px-6 pb-6 pt-0 space-y-4">{children}</div>;
}