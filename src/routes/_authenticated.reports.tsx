import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";

export const Route = createFileRoute("/_authenticated/reports")({ component: Page });

function Page() {
  const { data: prod } = useQuery({ queryKey:["rpt-prod"], queryFn: async () =>
    (await supabase.from("production_entries").select("entry_date,quantity,total_meter_consumed").order("entry_date").limit(500)).data });
  const { data: pur } = useQuery({ queryKey:["rpt-pur"], queryFn: async () =>
    (await supabase.from("purchase_orders").select("po_date,total_amount,quantity").order("po_date").limit(500)).data });

  const prodSeries = aggregate((prod ?? []) as any[], "entry_date", ["quantity","total_meter_consumed"]);
  const purSeries  = aggregate((pur  ?? []) as any[], "po_date",   ["quantity","total_amount"]);

  return (
    <>
      <PageHeader title="Reports & Analytics" subtitle="Production, purchase and consumption trends" />
      <PageBody>
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Daily production (units & meters consumed)</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prodSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30"/>
                  <XAxis dataKey="date" fontSize={11}/><YAxis fontSize={11}/><Tooltip/>
                  <Bar dataKey="quantity" fill="hsl(var(--primary))" />
                  <Bar dataKey="total_meter_consumed" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Purchase trend (qty & value)</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={purSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30"/>
                  <XAxis dataKey="date" fontSize={11}/><YAxis fontSize={11}/><Tooltip/>
                  <Line type="monotone" dataKey="quantity" stroke="hsl(var(--primary))" strokeWidth={2}/>
                  <Line type="monotone" dataKey="total_amount" stroke="hsl(var(--chart-3))" strokeWidth={2}/>
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}

function aggregate(rows: any[], dateKey: string, fields: string[]) {
  const map = new Map<string, any>();
  for (const r of rows) {
    const k = String(r[dateKey] ?? "").slice(0,10);
    if (!k) continue;
    const cur = map.get(k) ?? { date: k, ...Object.fromEntries(fields.map(f=>[f,0])) };
    for (const f of fields) cur[f] += Number(r[f] ?? 0);
    map.set(k, cur);
  }
  return Array.from(map.values()).sort((a,b)=> a.date.localeCompare(b.date));
}