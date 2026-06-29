import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtNum } from "@/lib/format";
import { Factory, ShoppingCart, Boxes, AlertTriangle, Package, Wrench, Truck, Building2, ClipboardList, Clock } from "lucide-react";
import { Activity, Check, X, Plus, Edit, Trash2, ClipboardCheck } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from "recharts";
import { ExportMenu } from "@/components/export-menu";
import { useScopedPlantIds, useScope } from "@/lib/scope";
import { Link } from "@tanstack/react-router";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SS Pipe ERP" }] }),
  component: Dashboard,
});

function useKpi(plantIds: string[]) {
  return useQuery({
    queryKey: ["dashboard-kpi", plantIds.join(",")],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const inPlants = <T extends { in: (col: string, vals: any[]) => any }>(q: T) =>
        plantIds.length ? q.in("plant_id", plantIds) : q;
      const [prod, pur, mat, prods, sup, plants, stock, low] = await Promise.all([
        inPlants(supabase.from("production_entries").select("total_meter_consumed,plant_id").eq("entry_date", today)),
        inPlants(supabase.from("purchase_orders").select("total_amount,received_qty,plant_id").eq("po_date", today)),
        supabase.from("materials").select("id", { count: "exact", head: true }),
        plantIds.length
          ? supabase.from("products").select("id", { count: "exact", head: true }).in("plant_id", plantIds)
          : supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("suppliers").select("id", { count: "exact", head: true }),
        supabase.from("plants").select("id", { count: "exact", head: true }),
        supabase.from("v_current_stock").select("current_stock"),
        supabase.from("v_current_stock").select("material_id", { count: "exact", head: true }).eq("is_low", true),
      ]);
      const [pendProd, pendPur] = await Promise.all([
        inPlants(supabase.from("production_entries").select("id", { count: "exact", head: true }).eq("status", "pending")),
        inPlants(supabase.from("purchase_orders").select("id,pending_qty", { count: "exact" }).eq("status", "pending")),
      ]);
      const pendingPurchaseQty = ((pendPur.data ?? []) as any[]).reduce((a, r) => a + Number(r.pending_qty || 0), 0);
      const todaysConsumption = ((prod.data ?? []) as any[]).reduce((a, r) => a + Number(r.total_meter_consumed || 0), 0);
      const todaysPurchaseAmt = ((pur.data ?? []) as any[]).reduce((a, r) => a + Number(r.total_amount || 0), 0);
      const currentStock = ((stock.data ?? []) as any[]).reduce((a, r) => a + Number(r.current_stock || 0), 0);
      return {
        todaysProduction: (prod.data ?? []).length,
        todaysConsumption,
        todaysPurchaseAmt,
        currentStock,
        lowStock: low.count ?? 0,
        pendingApprovals: (pendProd.count ?? 0) + (pendPur.count ?? 0),
        pendingPurchaseOrders: pendPur.count ?? 0,
        pendingPurchaseQty,
        materials: mat.count ?? 0,
        products: prods.count ?? 0,
        suppliers: sup.count ?? 0,
        plants: plants.count ?? 0,
      };
    },
  });
}

function useCharts(plantIds: string[]) {
  return useQuery({
    queryKey: ["dashboard-charts", plantIds.join(",")],
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
      const prodQ = supabase.from("production_entries").select("entry_date,total_meter_consumed,plant_id").gte("entry_date", since);
      const purQ = supabase.from("purchase_orders").select("po_date,total_amount,plant_id").gte("po_date", since);
      const [{ data: prod }, { data: pur }] = await Promise.all([
        plantIds.length ? prodQ.in("plant_id", plantIds) : prodQ,
        plantIds.length ? purQ.in("plant_id", plantIds) : purQ,
      ]);
      const map = new Map<string, { date: string; production: number; purchase: number }>();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        map.set(d, { date: d.slice(5), production: 0, purchase: 0 });
      }
      (prod ?? []).forEach((r) => {
        const k = r.entry_date as string;
        const row = map.get(k); if (row) row.production += Number(r.total_meter_consumed || 0);
      });
      (pur ?? []).forEach((r) => {
        const k = r.po_date as string;
        const row = map.get(k); if (row) row.purchase += Number(r.total_amount || 0);
      });
      return Array.from(map.values());
    },
  });
}

function Kpi({ icon: Icon, label, value, hint, tone }: { icon: any; label: string; value: string; hint?: string; tone?: "default" | "warn" | "ok" }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight">{label}</div>
          <div className={`size-6 grid place-items-center rounded-md shrink-0 ${tone === "warn" ? "bg-destructive/10 text-destructive" : tone === "ok" ? "bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]" : "bg-primary/10 text-primary"}`}><Icon className="size-3.5" /></div>
        </div>
        <div className="mt-1.5 text-lg font-semibold tabular-nums whitespace-nowrap truncate">{value}</div>
        {hint && <div className="mt-1 text-[10px] text-muted-foreground truncate">{hint}</div>}
      </CardContent>
    </Card>
  );
}

const auditTableLabel: Record<string,string> = {
  production_entries: "Production",
  purchase_orders: "Purchase",
  scrap_entries: "Scrap",
  gap_verifications: "Gap Verify",
  inventory_transactions: "Inventory",
};
const auditTableIcon: Record<string, any> = {
  production_entries: Factory,
  purchase_orders: ShoppingCart,
  scrap_entries: Trash2,
  gap_verifications: ClipboardCheck,
  inventory_transactions: Boxes,
};
function actionBadge(a: string) {
  if (a === "approved") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"><Check className="size-3 mr-1"/>Approved</Badge>;
  if (a === "rejected") return <Badge variant="destructive"><X className="size-3 mr-1"/>Rejected</Badge>;
  if (a === "create") return <Badge variant="secondary"><Plus className="size-3 mr-1"/>Created</Badge>;
  if (a === "delete") return <Badge variant="destructive">Deleted</Badge>;
  return <Badge variant="outline"><Edit className="size-3 mr-1"/>{a}</Badge>;
}

function RecentActivity({ plantIds }: { plantIds: string[] }) {
  const { data: logs } = useQuery({
    queryKey: ["dashboard-activity", plantIds.join(",")],
    queryFn: async () => {
      let q = supabase.from("audit_logs")
        .select("*, profiles:user_id(email,full_name), plants:plant_id(code), departments:department_id(code)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (plantIds.length) q = q.in("plant_id", plantIds);
      return (await q).data ?? [];
    },
    refetchInterval: 30000,
  });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2"><Activity className="size-4 text-primary"/>Recent activity — approvals, scrap & inventory adjustments</CardTitle>
        <Link to="/audit" className="text-xs text-primary hover:underline">View full audit →</Link>
      </CardHeader>
      <CardContent>
        {(!logs || logs.length === 0) ? (
          <div className="text-sm text-muted-foreground py-4 text-center">No recent activity.</div>
        ) : (
          <div className="divide-y -mx-2 max-h-[360px] overflow-y-auto">
            {logs.map((l: any) => {
              const Icon = auditTableIcon[l.table_name] ?? Edit;
              return (
                <div key={l.id} className="flex items-start gap-3 px-2 py-2.5">
                  <div className="size-8 rounded-md bg-muted grid place-items-center shrink-0"><Icon className="size-4 text-muted-foreground"/></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {actionBadge(l.action)}
                      <span className="text-sm font-medium">{auditTableLabel[l.table_name] ?? l.table_name}</span>
                      {l.entity_label && <span className="text-xs font-mono text-muted-foreground">{l.entity_label}</span>}
                      {l.old_status && l.new_status && l.old_status !== l.new_status && (
                        <span className="text-xs text-muted-foreground">{l.old_status} → <b>{l.new_status}</b></span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {fmtDateTime(l.created_at)}
                      {l.plants?.code && <> · {l.plants.code}</>}
                      {l.departments?.code && <> · {l.departments.code}</>}
                      {" · "}{l.profiles?.full_name || l.profiles?.email || "system"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  // dashboard
  const plantIds = useScopedPlantIds();
  const { data: k } = useKpi(plantIds);
  const { data: chart } = useCharts(plantIds);
  const { data: lowList } = useQuery({
    queryKey: ["low-stock-list", plantIds.join(",")],
    queryFn: async () => {
      let q = supabase.from("v_current_stock").select("*").eq("is_low", true).order("current_stock").limit(10);
      if (plantIds.length) q = q.in("plant_id", plantIds);
      return (await q).data ?? [];
    },
  });
  const { data: pendingProd } = useQuery({
    queryKey: ["pending-prod-list", plantIds.join(",")],
    queryFn: async () => {
      let q = supabase.from("production_entries")
        .select("id,entry_no,entry_date,quantity,plants(code),products(code,name)")
        .eq("status","pending").order("entry_date",{ascending:false}).limit(8);
      if (plantIds.length) q = q.in("plant_id", plantIds);
      return (await q).data ?? [];
    },
  });
  const { data: pendingPur } = useQuery({
    queryKey: ["pending-pur-list", plantIds.join(",")],
    queryFn: async () => {
      let q = supabase.from("purchase_orders")
        .select("id,po_no,po_date,quantity,total_amount,plants(code),materials(code,name),suppliers(name)")
        .eq("status","pending").order("po_date",{ascending:false}).limit(8);
      if (plantIds.length) q = q.in("plant_id", plantIds);
      return (await q).data ?? [];
    },
  });
  const { locations, filteredPlants, locationId, plantId } = useScope();
  const locName = locations.find((l) => l.id === locationId)?.name ?? "All Locations";
  const plantName = filteredPlants.find((p) => p.id === plantId)?.name ?? "All Plants";
  return (
    <>
      <PageHeader title="Operations Dashboard" subtitle={`Scope · ${locName} → ${plantName}`}
        actions={
          <ExportMenu filename="dashboard_kpis" title="Dashboard KPIs"
            rows={k ? [
              { label:"Today's Production Entries", value: k.todaysProduction },
              { label:"Today's Consumption (m)", value: k.todaysConsumption },
              { label:"Today's Purchase Value (₹)", value: k.todaysPurchaseAmt },
              { label:"Current Stock", value: k.currentStock },
              { label:"Low Stock Items", value: k.lowStock },
              { label:"Pending Approvals", value: k.pendingApprovals },
              { label:"Pending Purchase Orders", value: k.pendingPurchaseOrders },
              { label:"Pending Purchase Qty", value: k.pendingPurchaseQty },
              { label:"Products", value: k.products },
              { label:"Materials", value: k.materials },
              { label:"Suppliers", value: k.suppliers },
              { label:"Plants", value: k.plants },
            ] : []}
            columns={[
              { header:"Metric", accessor:(r:any)=>r.label },
              { header:"Value", accessor:(r:any)=>r.value },
            ]} />
        } />
      <PageBody>
        <div
          className="lg:sticky z-40 -mx-4 md:-mx-6 px-4 md:px-6 pt-3 pb-3 bg-background border-b shadow-md"
          style={{ top: "var(--app-header-h, 64px)" }}
        >
          <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <Kpi icon={Factory} label="Today's Production Entries" value={fmtNum(k?.todaysProduction, 0)} />
            <Kpi icon={Boxes} label="Today's Consumption (m)" value={fmtNum(k?.todaysConsumption)} />
            <Kpi icon={ShoppingCart} label="Today's Purchase Value" value={"₹ " + fmtNum(k?.todaysPurchaseAmt)} />
            <Kpi icon={AlertTriangle} label="Low Stock Items" value={fmtNum(k?.lowStock, 0)} tone={k && k.lowStock > 0 ? "warn" : "ok"} />
            <Kpi icon={ClipboardList} label="Pending Approvals" value={fmtNum(k?.pendingApprovals, 0)} tone={k && k.pendingApprovals > 0 ? "warn" : "ok"} />
            <Kpi icon={Clock} label="Pending Purchase Qty" value={fmtNum(k?.pendingPurchaseQty)} hint={`${k?.pendingPurchaseOrders ?? 0} open PO(s)`} />
            <Kpi icon={Package} label="Products" value={fmtNum(k?.products, 0)} />
            <Kpi icon={Wrench} label="Materials" value={fmtNum(k?.materials, 0)} />
            <Kpi icon={Truck} label="Suppliers" value={fmtNum(k?.suppliers, 0)} />
            <Kpi icon={Building2} label="Plants" value={fmtNum(k?.plants, 0)} />
          </div>
        </div>

        <RecentActivity plantIds={plantIds} />

        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Daily consumption (last 14 days, meters)</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30"/>
                  <XAxis dataKey="date" fontSize={11} tick={{ fill: "var(--muted-foreground)" }} stroke="var(--border)"/>
                  <YAxis fontSize={11} tick={{ fill: "var(--muted-foreground)" }} stroke="var(--border)"/>
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "var(--muted)", opacity: 0.4 }}/>
                  <Bar dataKey="production" name="Meters" fill="var(--chart-1)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Purchase value trend (₹)</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30"/>
                  <XAxis dataKey="date" fontSize={11} tick={{ fill: "var(--muted-foreground)" }} stroke="var(--border)"/>
                  <YAxis fontSize={11} tick={{ fill: "var(--muted-foreground)" }} stroke="var(--border)"/>
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}/>
                  <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}/>
                  <Line type="monotone" name="Purchase ₹" dataKey="purchase" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="size-4 text-destructive"/>Low stock alerts (top 10)</CardTitle></CardHeader>
          <CardContent>
            {(!lowList || lowList.length === 0) ? (
              <div className="text-sm text-muted-foreground py-4 text-center">All materials are above reorder level.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr><th className="text-left py-2 px-2">Material</th><th className="text-left py-2 px-2">Plant</th><th className="text-right py-2 px-2">Current</th><th className="text-right py-2 px-2">Reorder</th><th className="text-right py-2 px-2">Shortage</th></tr>
                  </thead>
                  <tbody>
                    {lowList.map((r:any, i:number) => (
                      <tr key={i} className="border-b last:border-b-0">
                        <td className="py-2 px-2 font-medium">{r.material_code} — {r.material_name}</td>
                        <td className="py-2 px-2">{r.plant_code}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-destructive font-semibold">{fmtNum(r.current_stock, 3)}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{fmtNum(r.reorder_level, 3)}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{fmtNum(Number(r.reorder_level) - Number(r.current_stock), 3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><ClipboardList className="size-4 text-primary"/>Production approvals pending</CardTitle>
              <Link to="/production" className="text-xs text-primary hover:underline">Review →</Link>
            </CardHeader>
            <CardContent>
              {(!pendingProd || pendingProd.length === 0) ? (
                <div className="text-sm text-muted-foreground py-4 text-center">No pending production entries.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b"><tr><th className="text-left py-2">Entry</th><th className="text-left py-2">Date</th><th className="text-left py-2">Plant</th><th className="text-left py-2">Product</th><th className="text-right py-2">Qty</th></tr></thead>
                  <tbody>{pendingProd.map((r:any)=>(
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="py-2 font-mono text-xs">{r.entry_no}</td>
                      <td className="py-2">{fmtDate(r.entry_date)}</td>
                      <td className="py-2">{r.plants?.code ?? "—"}</td>
                      <td className="py-2">{r.products ? `${r.products.code}` : "—"}</td>
                      <td className="py-2 text-right tabular-nums">{fmtNum(r.quantity, 0)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Clock className="size-4 text-primary"/>Purchase orders pending</CardTitle>
              <Link to="/purchase" className="text-xs text-primary hover:underline">Review →</Link>
            </CardHeader>
            <CardContent>
              {(!pendingPur || pendingPur.length === 0) ? (
                <div className="text-sm text-muted-foreground py-4 text-center">No pending purchase orders.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b"><tr><th className="text-left py-2">PO</th><th className="text-left py-2">Date</th><th className="text-left py-2">Supplier</th><th className="text-left py-2">Material</th><th className="text-right py-2">Amount</th></tr></thead>
                  <tbody>{pendingPur.map((r:any)=>(
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="py-2 font-mono text-xs">{r.po_no}</td>
                      <td className="py-2">{fmtDate(r.po_date)}</td>
                      <td className="py-2">{r.suppliers?.name ?? "—"}</td>
                      <td className="py-2">{r.materials?.code ?? "—"}</td>
                      <td className="py-2 text-right tabular-nums">₹ {fmtNum(r.total_amount, 2)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}