import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtNum } from "@/lib/format";
import { Boxes, AlertTriangle, Package, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SPRMS" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: k } = useQuery({
    queryKey: ["dashboard-kpi"],
    queryFn: async () => {
      const [mat, po, stock, rcpt] = await Promise.all([
        supabase.from("materials").select("id", { count: "exact", head: true }),
        supabase.from("purchase_orders").select("id,total_amount,status"),
        supabase.from("v_current_stock").select("current_stock,reorder_level,min_stock,name,code"),
        supabase.from("material_receipts").select("id", { count: "exact", head: true }),
      ]);
      const rows = (stock.data ?? []) as any[];
      const totalValue = rows.reduce((a, r) => a + Number(r.current_stock || 0), 0);
      const low = rows.filter((r) => Number(r.current_stock) <= Number(r.reorder_level) && Number(r.reorder_level) > 0);
      const pos = (po.data ?? []) as any[];
      return {
        materials: mat.count ?? 0,
        totalPOs: pos.length,
        pendingPOs: pos.filter((p) => p.status !== "completed" && p.status !== "cancelled").length,
        receipts: rcpt.count ?? 0,
        totalStock: totalValue,
        lowStock: low,
      };
    },
  });

  return (
    <>
      <PageHeader title="Operations Dashboard" subtitle="Innovation Inventory & Fabrication overview" />
      <PageBody>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Kpi icon={Package} label="Materials" value={fmtNum(k?.materials, 0)} />
          <Kpi icon={ShoppingCart} label="Total POs" value={fmtNum(k?.totalPOs, 0)} hint={`${fmtNum(k?.pendingPOs ?? 0, 0)} pending`} />
          <Kpi icon={Boxes} label="Current stock (units)" value={fmtNum(k?.totalStock, 3)} />
          <Kpi icon={AlertTriangle} label="Low stock items" value={fmtNum(k?.lowStock?.length ?? 0, 0)} tone={(k?.lowStock?.length ?? 0) > 0 ? "warn" : "ok"} />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="size-4 text-destructive"/>Low stock alerts</CardTitle></CardHeader>
          <CardContent>
            {(!k?.lowStock || k.lowStock.length === 0) ? (
              <div className="text-sm text-muted-foreground py-4 text-center">All materials are above reorder level.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr><th className="text-left py-2 px-2">Material</th><th className="text-right py-2 px-2">Current</th><th className="text-right py-2 px-2">Reorder</th></tr>
                  </thead>
                  <tbody>
                    {k.lowStock.map((r: any, i: number) => (
                      <tr key={i} className="border-b last:border-b-0">
                        <td className="py-2 px-2 font-medium">{r.code} — {r.name}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-destructive font-semibold">{fmtNum(r.current_stock, 3)}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{fmtNum(r.reorder_level, 3)}</td>
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

function Kpi({ icon: Icon, label, value, hint, tone }: { icon: any; label: string; value: string; hint?: string; tone?: "warn" | "ok" }) {
  const bg = tone === "warn" ? "border-rose-200/60" : tone === "ok" ? "border-emerald-200/60" : "";
  return (
    <Card className={`border ${bg}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
          <div className="size-7 grid place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></div>
        </div>
        <div className="mt-2 text-xl font-bold tabular-nums">{value}</div>
        {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
