import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtNum } from "@/lib/format";
import { Factory, ShoppingCart, Boxes, AlertTriangle, Package, Wrench, Truck, Building2, ClipboardList, Clock } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from "recharts";
import { ExportMenu } from "@/components/export-menu";
import { useScopedPlantIds, useScope } from "@/lib/scope";

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
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className={`size-8 grid place-items-center rounded-md ${tone === "warn" ? "bg-destructive/10 text-destructive" : tone === "ok" ? "bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]" : "bg-primary/10 text-primary"}`}><Icon className="size-4" /></div>
        </div>
        <div className="mt-3 text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Daily consumption (last 14 days, meters)</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Bar dataKey="production" fill="var(--primary)" radius={[4,4,0,0]} /></BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Purchase value trend (₹)</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart ?? []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="purchase" stroke="var(--primary)" strokeWidth={2} dot={false} /></LineChart>
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
      </PageBody>
    </>
  );
}