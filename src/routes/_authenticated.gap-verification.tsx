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
import { fmtNum, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/gap-verification")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey:["gaps"], queryFn: async () =>
    (await supabase.from("gap_verifications").select("*, materials(code,name), plants(code)").order("verify_date",{ascending:false}).limit(200)).data });
  const { data: materials } = useQuery({ queryKey:["mat-lite-g"], queryFn: async () => (await supabase.from("materials").select("id,code,name")).data });
  const { data: plants } = useQuery({ queryKey:["plants-lite-g"], queryFn: async () => (await supabase.from("plants").select("id,code")).data });

  const [open,setOpen]=useState(false);
  const [f,setF]=useState({ verify_date:new Date().toISOString().slice(0,10), material_id:"", plant_id:"", physical_stock:0, remarks:"" });

  const create = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("gap_verifications").insert(f); if (error) throw error; },
    onSuccess: () => { toast.success("Gap computed by database"); setOpen(false);
      setF({ verify_date:new Date().toISOString().slice(0,10), material_id:"", plant_id:"", physical_stock:0, remarks:"" });
      qc.invalidateQueries({queryKey:["gaps"]});
    },
    onError:(e:any)=>toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Gap Verification" subtitle="Physical stock vs system stock — gap auto-calculated"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-1"/>New verification</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Physical verification</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Date</Label><Input type="date" value={f.verify_date} onChange={(e)=>setF({...f, verify_date:e.target.value})}/></div>
                <div><Label>Plant</Label>
                  <Select value={f.plant_id} onValueChange={(v)=>setF({...f, plant_id:v})}>
                    <SelectTrigger><SelectValue placeholder="Plant"/></SelectTrigger>
                    <SelectContent>{(plants ?? []).map((p:any)=> <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Material</Label>
                  <Select value={f.material_id} onValueChange={(v)=>setF({...f, material_id:v})}>
                    <SelectTrigger><SelectValue placeholder="Material"/></SelectTrigger>
                    <SelectContent>{(materials ?? []).map((m:any)=> <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Physical stock (counted)</Label><Input type="number" step="0.001" value={f.physical_stock} onChange={(e)=>setF({...f, physical_stock:Number(e.target.value)})}/></div>
                <div><Label>Remarks</Label><Input value={f.remarks} onChange={(e)=>setF({...f, remarks:e.target.value})}/></div>
              </div>
              <DialogFooter><Button onClick={()=>create.mutate()} disabled={!f.material_id || !f.plant_id || create.isPending}>Compute gap</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        } />
      <PageBody>
        <DataTable rows={data ?? undefined} columns={[
          { header:"Date", cell:(r:any)=> fmtDate(r.verify_date) },
          { header:"Material", cell:(r:any)=> r.materials ? `${r.materials.code} — ${r.materials.name}` : "—" },
          { header:"Plant", cell:(r:any)=> r.plants?.code ?? "—" },
          { header:"Expected", cell:(r:any)=> fmtNum(r.expected_consumption,3) },
          { header:"Purchased", cell:(r:any)=> fmtNum(r.purchased_qty,3) },
          { header:"System", cell:(r:any)=> fmtNum(r.system_stock,3) },
          { header:"Physical", cell:(r:any)=> fmtNum(r.physical_stock,3) },
          { header:"Difference", cell:(r:any)=> fmtNum(r.difference,3) },
          { header:"Allowed wastage", cell:(r:any)=> fmtNum(r.allowed_wastage,3) },
          { header:"Actual gap", cell:(r:any)=> {
            const g = Number(r.actual_gap ?? 0);
            const cls = g < 0 ? "text-destructive font-semibold" : g > 0 ? "text-emerald-600 font-semibold" : "";
            return <span className={cls}>{fmtNum(g,3)}</span>;
          } },
        ]} />
      </PageBody>
    </>
  );
}