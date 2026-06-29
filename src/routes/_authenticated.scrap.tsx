import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable } from "@/components/data-table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { fmtNum, fmtDate, fmtCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/scrap")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey:["scrap"], queryFn: async () =>
    (await supabase.from("scrap_entries").select("*, materials(code,name), plants(code), departments(code)").order("scrap_date",{ascending:false}).limit(200)).data });
  const { data: materials } = useQuery({ queryKey:["mat-lite-sc"], queryFn: async () => (await supabase.from("materials").select("id,code,name")).data });
  const { data: plants } = useQuery({ queryKey:["plants-lite-sc"], queryFn: async () => (await supabase.from("plants").select("id,code")).data });
  const { data: depts } = useQuery({ queryKey:["dept-lite-sc"], queryFn: async () => (await supabase.from("departments").select("id,code,name,plant_id")).data });

  const [open,setOpen]=useState(false);
  const [f,setF]=useState({ scrap_date:new Date().toISOString().slice(0,10), material_id:"", plant_id:"", department_id:"", quantity:0, reason:"", recovery_value:0 });
  const filteredDepts = (depts ?? []).filter((d:any)=> !f.plant_id || d.plant_id===f.plant_id);

  const create = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("scrap_entries").insert(f); if (error) throw error; },
    onSuccess: () => { toast.success("Scrap booked — inventory OUT posted"); setOpen(false);
      setF({ scrap_date:new Date().toISOString().slice(0,10), material_id:"", plant_id:"", department_id:"", quantity:0, reason:"", recovery_value:0 });
      qc.invalidateQueries({queryKey:["scrap"]});
    },
    onError:(e:any)=>toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Scrap" subtitle="Track scrap, reason and recovery value"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1"/>New scrap</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Scrap entry</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date</Label><Input type="date" value={f.scrap_date} onChange={(e)=>setF({...f, scrap_date:e.target.value})}/></div>
                  <div><Label>Plant</Label>
                    <Select value={f.plant_id} onValueChange={(v)=>setF({...f, plant_id:v, department_id:""})}>
                      <SelectTrigger><SelectValue placeholder="Plant"/></SelectTrigger>
                      <SelectContent>{(plants ?? []).map((p:any)=> <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Department</Label>
                    <Select value={f.department_id} onValueChange={(v)=>setF({...f, department_id:v})}>
                      <SelectTrigger><SelectValue placeholder="Dept"/></SelectTrigger>
                      <SelectContent>{filteredDepts.map((d:any)=> <SelectItem key={d.id} value={d.id}>{d.code} — {d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Material</Label>
                    <Select value={f.material_id} onValueChange={(v)=>setF({...f, material_id:v})}>
                      <SelectTrigger><SelectValue placeholder="Material"/></SelectTrigger>
                      <SelectContent>{(materials ?? []).map((m:any)=> <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Quantity</Label><Input type="number" step="0.001" value={f.quantity} onChange={(e)=>setF({...f, quantity:Number(e.target.value)})}/></div>
                  <div><Label>Recovery value</Label><Input type="number" step="0.01" value={f.recovery_value} onChange={(e)=>setF({...f, recovery_value:Number(e.target.value)})}/></div>
                </div>
                <div><Label>Reason</Label><Input value={f.reason} onChange={(e)=>setF({...f, reason:e.target.value})}/></div>
              </div>
              <DialogFooter><Button onClick={()=>create.mutate()} disabled={!f.material_id || !f.plant_id || !f.department_id || f.quantity<=0 || create.isPending}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        } />
      <PageBody>
        <DataTable rows={data ?? undefined} columns={[
          { header:"Scrap #", cell:(r:any)=> <span className="font-mono text-xs">{r.scrap_no}</span> },
          { header:"Date", cell:(r:any)=> fmtDate(r.scrap_date) },
          { header:"Material", cell:(r:any)=> r.materials ? `${r.materials.code} — ${r.materials.name}` : "—" },
          { header:"Plant / Dept", cell:(r:any)=> `${r.plants?.code ?? "—"} / ${r.departments?.code ?? "—"}` },
          { header:"Qty", cell:(r:any)=> fmtNum(r.quantity,3) },
          { header:"Recovery", cell:(r:any)=> fmtCurrency(r.recovery_value) },
          { header:"Reason", cell:(r:any)=> r.reason ?? "—" },
        ]} />
      </PageBody>
    </>
  );
}