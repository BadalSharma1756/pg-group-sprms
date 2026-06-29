import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, LayoutGrid, List, Search, FileText, Activity, Paperclip, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDateTime } from "@/lib/format";

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
  tableName,
  searchPlaceholder = "Search…",
  extraFilters,
}: {
  rows: T[] | undefined;
  columns: ListColumn<T>[];
  details: DetailField<T>[];
  detailTitle?: string;
  empty?: string;
  storageKey?: string;
  tableName?: string;
  searchPlaceholder?: string;
  extraFilters?: ReactNode;
}) {
  const initial = (): "table" | "grid" => {
    if (typeof window === "undefined" || !storageKey) return "table";
    return (window.localStorage.getItem(storageKey) as any) === "grid" ? "grid" : "table";
  };
  const [view, setView] = useState<"table" | "grid">(initial);
  const [active, setActive] = useState<T | null>(null);
  const [query, setQuery] = useState("");

  const setMode = (m: "table" | "grid") => {
    setView(m);
    if (typeof window !== "undefined" && storageKey) window.localStorage.setItem(storageKey, m);
  };

  const filtered = useMemo(() => {
    if (!rows) return rows;
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      columns.some((c) => {
        try {
          const v = c.cell(r);
          return String(typeof v === "object" ? JSON.stringify(v) : v ?? "").toLowerCase().includes(q);
        } catch { return false; }
      })
    );
  }, [rows, query, columns]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-8 text-xs"
          />
        </div>
        {extraFilters}
        <div className="flex-1" />
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
              {!filtered ? (
                <TableRow><TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-10">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-10">{empty}</TableCell></TableRow>
              ) : filtered.map((r) => (
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
          {!filtered ? (
            <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">{empty}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((r) => (
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
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{detailTitle}</DialogTitle></DialogHeader>
          {active && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details"><FileText className="size-3.5 mr-1.5" />Entry details</TabsTrigger>
                <TabsTrigger value="activity"><Activity className="size-3.5 mr-1.5" />Activity</TabsTrigger>
                <TabsTrigger value="attachments"><Paperclip className="size-3.5 mr-1.5" />Attachments</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {details.map((d, i) => (
                    <div key={i} className={cn(d.full && "sm:col-span-2")}>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">{d.label}</div>
                      <div className="mt-0.5 font-medium text-foreground tabular-nums break-words">{d.value(active)}</div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="activity" className="mt-4">
                <ActivityTimeline tableName={tableName} recordId={String(active.id)} />
              </TabsContent>
              <TabsContent value="attachments" className="mt-4">
                <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                  <Paperclip className="size-6 mx-auto mb-2 opacity-50" />
                  No attachments for this entry.
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActivityTimeline({ tableName, recordId }: { tableName?: string; recordId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["entry-activity", tableName, recordId],
    enabled: !!tableName,
    queryFn: async () => (await supabase
      .from("audit_logs")
      .select("id, action, created_at, entity_label, old_status, new_status, detail, profiles(full_name, email)")
      .eq("table_name", tableName!)
      .eq("record_id", recordId)
      .order("created_at", { ascending: false })
      .limit(50)).data,
  });
  if (!tableName) return <div className="text-sm text-muted-foreground p-4 text-center">Activity not configured.</div>;
  if (isLoading) return <div className="flex items-center justify-center p-8 text-muted-foreground"><Loader2 className="size-4 animate-spin mr-2" />Loading activity…</div>;
  if (!data || data.length === 0) return <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">No activity recorded yet.</div>;
  return (
    <div className="relative pl-5 space-y-3 max-h-80 overflow-y-auto">
      <div className="absolute left-1.5 top-1 bottom-1 w-px bg-border" />
      {data.map((e: any) => (
        <div key={e.id} className="relative">
          <div className="absolute -left-[14px] top-1.5 size-2.5 rounded-full bg-primary ring-2 ring-background" />
          <div className="text-xs">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-semibold capitalize text-foreground">{e.action}</span>
              {e.new_status && <span className="text-muted-foreground">→ {e.new_status}</span>}
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{fmtDateTime(e.created_at)}</span>
            </div>
            <div className="mt-0.5 text-muted-foreground">
              by {e.profiles?.full_name || e.profiles?.email || "system"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}