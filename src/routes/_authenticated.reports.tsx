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
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";

export const Route = createFileRoute("/_authenticated/reports")({ component: Page });

function Page() {
  const today = new Date().toISOString().slice(0,10);
  const monthAgo = new Date(Date.now()-30*86400000).toISOString().slice(0,10);
  const [from,setFrom] = useState(monthAgo);
  const [to,setTo] = useState(today);
  const [plantId,setPlantId] = useState("all");

  const { data: plants } = useQuery({ queryKey:["plants-lite-rpt"], queryFn: async () => (await supabase.from("plants").select("id,code,name").eq("status","active")).data });

  const { data: prod } = useQuery({ queryKey:["rpt-prod",from,to,plantId], queryFn: async () => {
    let q = supabase.from("production_entries").select("entry_date,quantity,total_meter_consumed,plant_id,plants(code)").gte("entry_date",from).lte("entry_date",to).order("entry_date").limit(2000);
    if (plantId!=="all") q = q.eq("plant_id", plantId);
    return (await q).data ?? [];
  }});
  const { data: pur } = useQuery({ queryKey:["rpt-pur",from,to,plantId], queryFn: async () => {
    let q = supabase.from("purchase_orders").select("po_date,total_amount,quantity,plant_id,plants(code)").gte("po_date",from).lte("po_date",to).order("po_date").limit(2000);
    if (plantId!=="all") q = q.eq("plant_id", plantId);
    return (await q).data ?? [];
  }});

  const prodSeries = aggregate((prod ?? []) as any[], "entry_date", ["quantity","total_meter_consumed"]);
  const purSeries  = aggregate((pur  ?? []) as any[], "po_date",   ["quantity","total_amount"]);

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