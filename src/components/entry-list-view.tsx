import { useState, type ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListColumn<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  primary?: boolean;
}

export interface DetailField<T> {
  label: string;
  value: (row: T) => ReactNode;
  full?: boolean;
}

export function EntryListView<T extends { id: string | number }>({
  rows,
  columns,
  details,
  detailTitle = "Details",
  empty = "No records yet",
  storageKey,
}: {
  rows: T[] | undefined;
  columns: ListColumn<T>[];
  details: DetailField<T>[];
  detailTitle?: string;
  empty?: string;
  storageKey?: string;
}) {
  const initial = (): "table" | "grid" => {
    if (typeof window === "undefined" || !storageKey) return "table";
    return (window.localStorage.getItem(storageKey) as any) === "grid" ? "grid" : "table";
  };
  const [view, setView] = useState<"table" | "grid">(initial);
  const [active, setActive] = useState<T | null>(null);

  const setMode = (m: "table" | "grid") => {
    setView(m);
    if (typeof window !== "undefined" && storageKey) window.localStorage.setItem(storageKey, m);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <div className="inline-flex rounded-md border bg-card p-0.5 shadow-sm">
          <button
            onClick={() => setMode("table")}
            className={cn("inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded",
              view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <List className="size-3.5" /> Table
          </button>
          <button
            onClick={() => setMode("grid")}
            className={cn("inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded",
              view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <LayoutGrid className="size-3.5" /> Cards
          </button>
        </div>
      </div>

      {view === "table" ? (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c, i) => <TableHead key={i} className={c.className}>{c.header}</TableHead>)}
                <TableHead className="w-20 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!rows ? (
                <TableRow><TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-10">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-10">{empty}</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  {columns.map((c, i) => <TableCell key={i} className={cn("tabular-nums", c.className)}>{c.cell(r)}</TableCell>)}
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setActive(r)} className="h-7 px-2 text-primary hover:text-primary">
                      <Eye className="size-3.5 mr-1" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div>
          {!rows ? (
            <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">{empty}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {rows.map((r) => (
                <div key={r.id} className="rounded-lg border bg-card p-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
                  <div className="space-y-1.5">
                    {columns.slice(0, 5).map((c, i) => (
                      <div key={i} className={cn("flex items-start justify-between gap-2 text-xs", i === 0 && "pb-1.5 mb-1 border-b border-border/60")}>
                        <span className="text-muted-foreground shrink-0">{c.header}</span>
                        <span className={cn("text-right tabular-nums truncate", i === 0 ? "font-semibold text-sm text-foreground" : "text-foreground")}>{c.cell(r)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-2 border-t border-border/60 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => setActive(r)} className="h-7 text-xs">
                      <Eye className="size-3.5 mr-1" /> View details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{detailTitle}</DialogTitle></DialogHeader>
          {active && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {details.map((d, i) => (
                <div key={i} className={cn(d.full && "sm:col-span-2")}>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{d.label}</div>
                  <div className="mt-0.5 font-medium text-foreground tabular-nums break-words">{d.value(active)}</div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}