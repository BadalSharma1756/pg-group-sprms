import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportMenu } from "@/components/export-menu";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({ component: Page });

const TOOLTIP_STYLE = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--card-foreground)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
} as const;
const AXIS_STYLE = { fill: "var(--muted-foreground)" } as const;
const LEGEND_STYLE = { fontSize: 12, color: "var(--muted-foreground)" } as const;

function Page() {
  const today = new Date().toISOString().slice(0,10);
  const monthAgo = new Date(Date.now()-30*86400000).toISOString().slice(0,10);
  const [from,setFrom] = useState(monthAgo);
  const [to,setTo] = useState(today);
  const [plantId,setPlantId] = useState("all");

  const { data: plants } = useQuery({ queryKey:["plants-lite-rpt"], queryFn: async () => (await supabase.from("plants").select("id,code,name").eq("status","active")).data });

  const { data: prod } = useQuery({ queryKey:["rpt-prod",from,to,plantId], queryFn: async () => {
    let q = supabase.from("production_entries").select("entry_date,quantity,total_meter_consumed,plant_id,department_id,product_id,plants(code),departments(code,name),products(code,name)").gte("entry_date",from).lte("entry_date",to).order("entry_date").limit(5000);
    if (plantId!=="all") q = q.eq("plant_id", plantId);
    return (await q).data ?? [];
  }});
  const { data: pur } = useQuery({ queryKey:["rpt-pur",from,to,plantId], queryFn: async () => {
    let q = supabase.from("purchase_orders").select("po_date,total_amount,quantity,plant_id,material_id,plants(code),materials(code,name)").gte("po_date",from).lte("po_date",to).order("po_date").limit(5000);
    if (plantId!=="all") q = q.eq("plant_id", plantId);
    return (await q).data ?? [];
  }});
  const { data: cons } = useQuery({ queryKey:["rpt-cons",from,to,plantId], queryFn: async () => {
    let q = supabase.from("inventory_transactions").select("txn_date,qty_out,material_id,plant_id,materials(code,name),plants(code)").eq("txn_type","production_out").gte("txn_date",from).lte("txn_date",to+"T23:59:59").limit(10000);
    if (plantId!=="all") q = q.eq("plant_id", plantId);
    return (await q).data ?? [];
  }});

  const prodSeries = aggregate((prod ?? []) as any[], "entry_date", ["quantity","total_meter_consumed"]);
  const purSeries  = aggregate((pur  ?? []) as any[], "po_date",   ["quantity","total_amount"]);
  const topProducts = rank((prod ?? []) as any[], (r:any)=> r.products ? `${r.products.code} — ${r.products.name}` : "—", "quantity").slice(0,10);
  const topMaterials = rank((cons ?? []) as any[], (r:any)=> r.materials ? `${r.materials.code} — ${r.materials.name}` : "—", "qty_out").slice(0,10);
  const byPlant = rank((prod ?? []) as any[], (r:any)=> r.plants?.code ?? "—", "total_meter_consumed");
  const byDept  = rank((prod ?? []) as any[], (r:any)=> r.departments ? `${r.departments.code}` : "—", "total_meter_consumed");
  const PIE_COLORS = ["var(--chart-1)","var(--chart-2)","var(--chart-3)","var(--chart-4)","var(--chart-5)","var(--primary)"];

  return (
    <>
      <PageHeader title="Reports & Analytics" subtitle="Production, purchase and consumption trends" />
      <PageBody>
        <div className="rounded-md border bg-card p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div><Label>From</Label><Input type="date" value={from} onChange={(e)=>setFrom(e.target.value)}/></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e)=>setTo(e.target.value)}/></div>
          <div><Label>Plant</Label>
            <Select value={plantId} onValueChange={setPlantId}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plants</SelectItem>
                {(plants ?? []).map((p:any)=>(<SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <ExportMenu filename={`production_${from}_${to}`} title="Production"
              rows={prodSeries}
              meta={{ From: from, To: to, Plant: plantId==="all"?"All":(plants?.find((p:any)=>p.id===plantId)?.code ?? "") }}
              columns={[
                { header:"Date", accessor:(r:any)=>r.date },
                { header:"Units", accessor:(r:any)=>r.quantity },
                { header:"Meters consumed", accessor:(r:any)=>r.total_meter_consumed },
              ]} />
            <ExportMenu filename={`purchase_${from}_${to}`} title="Purchase"
              rows={purSeries}
              meta={{ From: from, To: to, Plant: plantId==="all"?"All":(plants?.find((p:any)=>p.id===plantId)?.code ?? "") }}
              columns={[
                { header:"Date", accessor:(r:any)=>r.date },
                { header:"Qty", accessor:(r:any)=>r.quantity },
                { header:"Amount", accessor:(r:any)=>r.total_amount },
              ]} />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Daily production (units & meters consumed)</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prodSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30"/>
                  <XAxis dataKey="date" fontSize={11} tick={AXIS_STYLE} stroke="var(--border)"/>
                  <YAxis fontSize={11} tick={AXIS_STYLE} stroke="var(--border)"/>
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.4 }}/>
                  <Legend wrapperStyle={LEGEND_STYLE}/>
                  <Bar dataKey="quantity" name="Units" fill="var(--chart-1)" radius={[4,4,0,0]} />
                  <Bar dataKey="total_meter_consumed" name="Meters" fill="var(--chart-2)" radius={[4,4,0,0]} />
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
                  <XAxis dataKey="date" fontSize={11} tick={AXIS_STYLE} stroke="var(--border)"/>
                  <YAxis fontSize={11} tick={AXIS_STYLE} stroke="var(--border)"/>
                  <Tooltip contentStyle={TOOLTIP_STYLE}/>
                  <Legend wrapperStyle={LEGEND_STYLE}/>
                  <Line type="monotone" name="Qty" dataKey="quantity" stroke="var(--chart-1)" strokeWidth={2} dot={false}/>
                  <Line type="monotone" name="Amount" dataKey="total_amount" stroke="var(--chart-3)" strokeWidth={2} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Plant-wise consumption (meters)</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byPlant} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30"/>
                  <XAxis type="number" fontSize={11} tick={AXIS_STYLE} stroke="var(--border)"/>
                  <YAxis type="category" dataKey="key" width={80} fontSize={11} tick={AXIS_STYLE} stroke="var(--border)"/>
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.4 }}/>
                  <Bar dataKey="value" name="Meters" fill="var(--chart-1)" radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Department-wise consumption</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byDept} dataKey="value" nameKey="key" outerRadius={90} label={(e:any)=>e.key} stroke="var(--card)" strokeWidth={2}>
                    {byDept.map((_,i)=> <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE}/>
                  <Legend wrapperStyle={LEGEND_STYLE}/>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Top 10 products (by units produced)</CardTitle>
              <ExportMenu filename={`top_products_${from}_${to}`} title="Top Products" rows={topProducts}
                columns={[{header:"Product", accessor:(r:any)=>r.key},{header:"Units", accessor:(r:any)=>r.value}]} />
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b"><tr><th className="text-left py-2">#</th><th className="text-left py-2">Product</th><th className="text-right py-2">Units</th></tr></thead>
                <tbody>{topProducts.map((r,i)=>(<tr key={i} className="border-b last:border-b-0"><td className="py-2 text-muted-foreground">{i+1}</td><td className="py-2 font-medium">{r.key}</td><td className="py-2 text-right tabular-nums">{fmtNum(r.value,2)}</td></tr>))}
                {topProducts.length===0 && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No production data</td></tr>}</tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Top 10 materials consumed</CardTitle>
              <ExportMenu filename={`top_materials_${from}_${to}`} title="Top Materials" rows={topMaterials}
                columns={[{header:"Material", accessor:(r:any)=>r.key},{header:"Qty out", accessor:(r:any)=>r.value}]} />
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b"><tr><th className="text-left py-2">#</th><th className="text-left py-2">Material</th><th className="text-right py-2">Qty out</th></tr></thead>
                <tbody>{topMaterials.map((r,i)=>(<tr key={i} className="border-b last:border-b-0"><td className="py-2 text-muted-foreground">{i+1}</td><td className="py-2 font-medium">{r.key}</td><td className="py-2 text-right tabular-nums">{fmtNum(r.value,3)}</td></tr>))}
                {topMaterials.length===0 && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No consumption data</td></tr>}</tbody>
              </table>
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

function rank(rows: any[], keyFn: (r:any)=>string, valField: string) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = keyFn(r); if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + Number(r[valField] ?? 0));
  }
  return Array.from(map.entries()).map(([key,value])=>({key,value})).sort((a,b)=> b.value - a.value);
}