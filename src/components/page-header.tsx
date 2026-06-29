import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-card px-6 py-3">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="px-6 pb-6 pt-0 space-y-4">{children}</div>;
}