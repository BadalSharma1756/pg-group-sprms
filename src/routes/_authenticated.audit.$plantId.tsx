import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExportMenu } from "@/components/export-menu";
import { ArrowLeft, Factory, ShoppingCart, Trash2, ClipboardCheck, Boxes, Edit, Plus, X, Check } from "lucide-react";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/audit/$plantId")({ component: Page });

const tableIcon: Record<string, any> = {
  production_entries: Factory,
  purchase_orders: ShoppingCart,
  scrap_entries: Trash2,
  gap_verifications: ClipboardCheck,
  inventory_transactions: Boxes,
};
const tableLabel: Record<string, string> = {
  production_entries: "Production",
  purchase_orders: "Purchase",
  scrap_entries: "Scrap",
  gap_verifications: "Gap Verify",
  inventory_transactions: "Inventory",
};

function Page() {
  const { plantId } = Route.useParams();
  const today = new Date().toISOString().slice(0,10);
  const weekAgo = new Date(Date.now() - 7*86400000).toISOString().slice(0,10);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");

  const { data: plant } = useQuery({
    queryKey:["plant", plantId],
    queryFn: async () => (await supabase.from("plants").select("*").eq("id", plantId).single()).data,
  });
  const { data: depts } = useQuery({
    queryKey:["plant-depts", plantId],
    queryFn: async () => (await supabase.from("departments").select("id,code,name").eq("plant_id", plantId)).data,
  });

  const { data: logs } = useQuery({
    queryKey:["audit", plantId, from, to, deptFilter, tableFilter],
    queryFn: async () => {
      let q = supabase.from("audit_logs").select("*, profiles:user_id(email,full_name), departments:department_id(code,name)")
        .eq("plant_id", plantId)
        .gte("created_at", from + "T00:00:00")
        .lte("created_at", to + "T23:59:59")
        .order("created_at", { ascending: false })
        .limit(500);
      if (deptFilter !== "all") q = q.eq("department_id", deptFilter);
      if (tableFilter !== "all") q = q.eq("table_name", tableFilter);
      const { data } = await q;
      return data ?? [];
    },
  });

  const actionBadge = (a: string) => {
    if (a === "approved") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"><Check className="size-3 mr-1"/>Approved</Badge>;
    if (a === "rejected") return <Badge variant="destructive"><X className="size-3 mr-1"/>Rejected</Badge>;
    if (a === "create") return <Badge variant="secondary"><Plus className="size-3 mr-1"/>Created</Badge>;
    if (a === "delete") return <Badge variant="destructive">Deleted</Badge>;
    return <Badge variant="outline"><Edit className="size-3 mr-1"/>{a}</Badge>;
  };

  const exportRows = useMemo(() => (logs ?? []).map((l:any) => ({
    when: fmtDateTime(l.created_at),
    action: l.action,
    module: tableLabel[l.table_name] ?? l.table_name,
    entity: l.entity_label ?? l.record_id,
    department: l.departments?.code ?? "",
    status_change: l.old_status && l.new_status ? `${l.old_status} → ${l.new_status}` : l.new_status ?? "",
    user: l.profiles?.email ?? l.user_id ?? "system",
  })), [logs]);

  return (
    <>
      <PageHeader
        title={plant ? `Audit — ${plant.code} ${plant.name}` : "Audit"}
        subtitle={plant?.location ?? "Activity timeline for this plant"}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/audit"><Button variant="ghost" size="sm"><ArrowLeft className="size-4 mr-1"/>All plants</Button></Link>
            <ExportMenu
              filename={`audit_${plant?.code ?? plantId}_${from}_${to}`}
              title={`Audit log — ${plant?.code ?? ""}`}
              rows={exportRows}
              meta={{ Plant: plant?.code ?? "", From: from, To: to }}
              columns={[
                { header:"When", accessor:(r:any)=>r.when },
                { header:"Action", accessor:(r:any)=>r.action },
                { header:"Module", accessor:(r:any)=>r.module },
                { header:"Entity", accessor:(r:any)=>r.entity },
                { header:"Department", accessor:(r:any)=>r.department },
                { header:"Status change", accessor:(r:any)=>r.status_change },
                { header:"User", accessor:(r:any)=>r.user },
              ]} />
          </div>
        } />
      <PageBody>
        <div className="rounded-md border bg-card p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div><Label>From</Label><Input type="date" value={from} onChange={(e)=>setFrom(e.target.value)}/></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e)=>setTo(e.target.value)}/></div>
          <div><Label>Department / Location</Label>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {(depts ?? []).map((d:any)=>(<SelectItem key={d.id} value={d.id}>{d.code} — {d.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Module</Label>
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {Object.entries(tableLabel).map(([k,v])=>(<SelectItem key={k} value={k}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border bg-card divide-y">
          {(logs ?? []).length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No activity for the selected filters.</div>
          )}
          {(logs ?? []).map((l:any) => {
            const Icon = tableIcon[l.table_name] ?? Edit;
            return (
              <div key={l.id} className="flex items-start gap-4 p-4">
                <div className="size-9 rounded-md bg-muted grid place-items-center shrink-0"><Icon className="size-4 text-muted-foreground" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {actionBadge(l.action)}
                    <span className="text-sm font-medium">{tableLabel[l.table_name] ?? l.table_name}</span>
                    {l.entity_label && <span className="text-xs font-mono text-muted-foreground">{l.entity_label}</span>}
                    {l.old_status && l.new_status && l.old_status !== l.new_status && (
                      <span className="text-xs text-muted-foreground">{l.old_status} → <b>{l.new_status}</b></span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {fmtDateTime(l.created_at)}
                    {l.departments && <> · {l.departments.code}</>}
                    {" · "}{l.profiles?.full_name || l.profiles?.email || "system"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PageBody>
    </>
  );
}